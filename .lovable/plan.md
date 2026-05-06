## Plan — Clinic Services page

### New files
1. **`src/lib/servicesApi.ts`** — typed wrappers around the three endpoints:
   - `getMyServices()` → GET `/clinics/me/services`
   - `requestAddon({ addon_id, clinic_notes? })` → POST `/clinics/me/addon-requests`
   - `cancelAddonRequest(requestId)` → DELETE `/clinics/me/addon-requests/{id}`
   Uses `getHeaders()` from `src/lib/api.ts` and `API_BASE_URL` (export it or duplicate the env read).
   Defines TS types: `ServiceCatalogItem`, `ActiveAddon`, `PendingRequest`, `ServicesResponse`.

2. **`src/components/DynamicIcon.tsx`** — small helper that looks up a Lucide icon by string name, falls back to `Box`. `name: string | null | undefined`, `className?: string`.

3. **`src/pages/clinic/Services.tsx`** — the page. Sections:
   - **Header**: "Services" + subtitle.
   - **Section 1 — Current Plan**: hardcoded read-only `Card` with a `Sparkles` icon, "Plan", "Contact your account manager" copy, and a `mailto:hello@dirxctional.com` link. No upgrade button.
   - **Section 2 — Active Add-ons**: rendered only when `active_addons.length > 0`. Card containing a list; each row shows `DynamicIcon`, name, description, price `$X/mo`, optional `× quantity`, and a green "Active" `Badge`.
   - **Section 3 — Available Add-ons**: grid (responsive `grid-cols-1 md:grid-cols-2`) of `catalog.filter(a => a.state !== "active")`. Each card shows icon, name, description, price; if `state === "requested"` show amber "Requested" badge, else show **Request** button that opens the request dialog.
   - **Section 4 — Pending Requests**: rendered only when `pending_requests.length > 0`. List with name, "Requested {relative time}" via `formatDistanceToNow`, price, **Cancel** button.
   - **Loading**: spinner; **Error / 403**: friendly empty state "This section is for clinic users."

   Data: `useQuery(['clinic','services'], getMyServices)`. Mutations via `useMutation`, on success `queryClient.invalidateQueries(['clinic','services'])` and `toast.success(...)`; on error `toast.error(err.message)`.

4. **Request dialog** (inline component in Services.tsx): shadcn `Dialog` showing addon name, price, optional `Textarea` for notes, Cancel/Submit buttons. Submit triggers the request mutation.

5. **Cancel confirmation**: reuse existing `ConfirmModal` with title "Cancel request?" and the addon name in description.

### Edits
6. **`src/components/layout/ClinicSidebar.tsx`** — add a nav item:
   ```ts
   { label: "Services", icon: Sparkles, path: "/clinic/services" }
   ```
   Insert after "My Referrals". No "+" badge.

7. **`src/App.tsx`** — register the new route inside the existing `/clinic` `ClinicLayout` block:
   ```tsx
   <Route path="services" element={<Services />} />
   ```
   Import `Services from "@/pages/clinic/Services"`.

### Behavior details
- One fetch on mount; refetch (via `invalidateQueries`) only after successful request submit / cancel. No polling.
- Toast on submit success: "Request submitted — we'll confirm via email within 1 business day".
- Active = green (`bg-emerald-100 text-emerald-700` or existing success badge variant). Requested = amber (`bg-amber-100 text-amber-700`).
- Mobile: catalog uses `grid-cols-1 md:grid-cols-2`; rows in active/pending sections stack icon+text on left, price+action on right with `flex-wrap`.
- Admin users won't reach this route under normal nav (no sidebar entry in admin), but if they hit `/clinic/services` directly the existing `ClinicLayout` already redirects non-clinic users to `/admin/dashboard`. The 403 fallback inside the page handles backend-level rejection.

### Out of scope
- No Stripe / billing UI.
- No tier change UI.
- No subscription cancel button.
- No polling or caching beyond React Query defaults.
