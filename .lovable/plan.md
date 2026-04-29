# AI Extraction Quality Dashboard (Internal Admin)

Build two new admin-only pages that surface AI extraction accuracy, plus a sidebar entry. Strictly gated to `internal_admin`, no client-side caching of PHI-bearing endpoints, no export/share affordances.

## Files to add

- `src/pages/admin/AIQuality.tsx` — overview page (`/admin/ai-quality`)
- `src/pages/admin/AIQualityReferral.tsx` — per-referral detail (`/admin/ai-quality/referral/:id`)
- `src/pages/admin/AIQualityCorrections.tsx` — corrections list (`/admin/ai-quality/corrections`), reachable from the watch-list callout
- `src/lib/aiQualityApi.ts` — typed API wrappers for the three endpoints (kept separate from `adminApi` so the no-store fetch policy is unmistakable)
- `src/hooks/useAIQuality.ts` — react-query hooks with `staleTime: 0`, `gcTime: 0`, `refetchOnWindowFocus: true`

## Files to edit

- `src/App.tsx` — add three routes inside the existing `<Route path="/admin" element={<AdminLayout />}>` block
- `src/components/layout/AdminSidebar.tsx` — insert "AI Quality" link (LineChart icon) between "All Referrals" and "Pharmacies"

## Routing & role gating

`AdminLayout` already redirects non-`internal_admin` users to `/clinic/dashboard`, so nesting under `/admin` gives us the silent redirect for free. Each new page also re-checks `user?.role === "internal_admin"` and `<Navigate to="/clinic/dashboard" replace />` defensively.

## API layer (`src/lib/aiQualityApi.ts`)

Three functions calling the live endpoints, reusing the existing bearer-token header pattern (`getHeaders()` from `api.ts` — exported as needed). All requests pass `cache: "no-store"`.

```ts
getOverview({ days, formType })            // GET /admin/extraction-quality
getCorrections({ days, field, highConfOnly, limit, cursor })
                                           // GET /admin/extraction-quality/corrections
getReferralQuality(id)                     // GET /admin/extraction-quality/referral/:id
```

Types modeled on the response shapes referenced in the prompt (`totals`, `fields[]`, `top_problem_fields[]`, `by_form_type[]`, `corrections[]`, `documents[]`, `extracted_data`).

## React-query usage

```ts
useQuery({
  queryKey: ["ai-quality", "overview", days, formType],
  queryFn: () => getOverview({ days, formType }),
  staleTime: 0,
  gcTime: 0,                  // v5 name for cacheTime
  refetchOnMount: "always",
});
```

Same options for the other two hooks. No localStorage / sessionStorage writes from these pages.

## Page 1 — `/admin/ai-quality`

Layout uses existing card style (`rounded-xl border border-border bg-card p-5 card-shadow`) matching `AdminDashboard.tsx`.

Sections, top-to-bottom:

1. **Header** — title "AI Extraction Quality", muted subtitle, time-range segmented control (7/14/30/90 days, default 7), form-type `<Select>` populated from `by_form_type[].form_type` (plus "All").
2. **Stat tiles** (grid `grid-cols-2 lg:grid-cols-4`) — Extractions, Acceptance rate (% or `—`), High-confidence-but-edited (warning bg when `> 0`), Corrections logged. Each tile mirrors the existing dashboard tile structure.
3. **Watch-list callout** — only rendered if any `top_problem_fields[].high_conf_wrong_count > 0`. Amber-bordered card listing up to 5 fields with counts and a "Review corrections →" link to `/admin/ai-quality/corrections?high_conf_only=true`.
4. **Per-field accuracy table** — shadcn `Table`, search input filtering by `field_path` substring, sortable headers (default `edit_count` desc). Acceptance rate formatted `Math.round(x*100)+"%"` or `—`. Avg confidence `toFixed(3)`. Last edited via existing `getRelativeTime()` from `src/lib/dateUtils.ts`. Empty state copy as specified.
5. **By-form-type rollup** — only when non-empty. Simple two-column table (Form type, Edits, Edited referrals) — skip the bar chart for v1 to stay lean; visual hierarchy matches existing tables.
6. **Recent corrections feed** — second query (`limit=20`, same `days` window). Plain-text list rows; left border `border-l-4 border-warning` when `model_confidence >= 0.85`. Each row links to `/admin/ai-quality/referral/:referral_id`.

## Page 2 — `/admin/ai-quality/referral/:id`

- Header: "Referral · {{id}}" (UUID only — no patient name in title or `document.title`), subtitle with status / `prompt_version || "unknown"` / relative `updated_at`, back link to `/admin/ai-quality`.
- Two-column grid (`grid-cols-1 lg:grid-cols-2 gap-6`):
  - **Left — Source documents**: iterate `data.documents[]`. Reuse existing `<DocumentViewer>` component with the presigned `url`. If `url` is null, render "Document temporarily unavailable" placeholder. Note line: "Doc viewer link refreshes when page reloads."
  - **Right — Extracted data tree**: walk `data.extracted_data` recursively, grouping by top-level key (patient/provider/clinical/insurance/prior_auth/pharmacy/dermatology/…). Each leaf shows label + current value. Build a `Map<field_path, correction[]>` from `data.corrections` and decorate matching leaves:
    - Edit-count `Badge` (variant outline)
    - Faded line below: `was: "X" → now: "Y" · conf 0.NN · {relative time}`
    - Change-type badges using existing `Badge` with bordered variants — `Added by human` (success border), `Cleared by human` (destructive border), `Edited` (warning border)
    - Extra `⚠ high conf` badge when `model_confidence >= 0.85`
- Bottom: shadcn `Collapsible` "Raw extraction JSON" containing `<pre><code>{JSON.stringify(extracted_data, null, 2)}</code></pre>`.

PHI-display rules: reuse existing masking/format helpers used in `AdminReferralReview.tsx` for member IDs etc. — the field renderer will use the same plain-text approach (per memory: plain text in tables) without adding any download/copy/share buttons.

## Page 3 — `/admin/ai-quality/corrections`

Reached only via the watch-list callout link. Uses `getCorrections` with cursor-based pagination ("Load more" button — no infinite scroll, no export). Filters: `field` text input, `high_conf_only` checkbox (default on when arriving via watch-list link via query-string), `days` selector. Each row links to the per-referral detail page. Same row styling as the overview's recent-corrections feed.

## Sidebar entry

In `AdminSidebar.tsx`, add to `navItems` between Referrals and Pharmacies:

```ts
{ label: "AI Quality", icon: LineChart, path: "/admin/ai-quality" }
```

`AdminSidebar` only renders inside `AdminLayout`, which already requires `internal_admin`, so the link is implicitly hidden from clinic users. Active-state matcher widened to also highlight on `/admin/ai-quality/...` sub-routes.

## HIPAA / trust controls (enforced in code)

- Role gate: `AdminLayout` (server-validated token + client claim check) + per-page defensive redirect.
- `cache: "no-store"` on every fetch; react-query `staleTime: 0`, `gcTime: 0`; no service-worker registration touched.
- No `document.title` mutation, no patient names in URLs, no breadcrumbs beyond the referral UUID.
- No export, no CSV, no copy-link, no share buttons anywhere on these pages.
- No per-admin attribution UI — `corrections[].edited_by` is intentionally not rendered.
- Engineering-only signal stays under `/admin/*` and is invisible to `clinic_user`.

## Out of scope (explicitly not built)

Prompt A/B tool, "mark as training example", bulk ops, export, per-admin breakdown, email digests.

## Manual verification after build

1. Sign in as internal_admin → "AI Quality" appears in sidebar; overview loads with empty state.
2. Generate a correction (admin edits an extracted field on `AdminReferralReview`) → appears in overview within ~1s after refetch / window focus.
3. Click a feed row → detail page renders documents + tree + correction badges.
4. Sign in as clinic_user → sidebar link absent; visiting `/admin/ai-quality` silently redirects to `/clinic/dashboard`.
5. DevTools → Network tab → confirm `Cache-Control: no-store` echoed and no entries in react-query cache after navigation away.
