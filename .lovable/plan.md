

## Admin Profile + Race Fix + Dashboard Note Indicator

### 1. Token-attachment race fix (`src/lib/api.ts`, `src/hooks/useApi.ts`)

Currently `currentToken()` returns `undefined` immediately if `tokenProvider` isn't registered yet → causes 401s on hard refresh when fetches fire before `useApi()`'s `useEffect` runs.

**Change `src/lib/api.ts`:**
- Add a module-level `tokenReady` Promise that resolves the first time `setAuthTokenProvider` is called with a non-null provider.
- `getHeaders()` / `getAuthHeaders()` `await tokenReady` before reading the token.
- Keep null-clearing in unmount cleanup but DO NOT reset the promise (once registered, stays ready).

**Change `src/hooks/useApi.ts`:**
- Remove the `return () => setAuthTokenProvider(null)` cleanup — it can briefly null the provider during re-renders and re-trigger the wait. Provider should stay registered for the app's lifetime.

`useApi()` is already invoked once in `AuthProvider` (top of React tree) — no consolidation needed.

### 2. Admin profile API + hook (`src/lib/api.ts`, new `src/hooks/useAdminProfile.ts`)

In `api.ts`, add:
- `AdminProfile` interface (no `npi`, no `clinic_id`)
- `getMyAdminProfile()` → GET `/admin/me/profile`
- `updateMyAdminProfile({ first_name, last_name, phone })` → PATCH

New `src/hooks/useAdminProfile.ts` — mirrors `useProfile.ts`, enabled only when `role === 'internal_admin'`. Exports `ADMIN_PROFILE_QUERY_KEY`.

### 3. Admin profile completion modal (new `src/components/CompleteAdminProfileModal.tsx`)

Copy `CompleteProfileModal.tsx`, drop the NPI field, swap mutation to `updateMyAdminProfile`, invalidate `ADMIN_PROFILE_QUERY_KEY`. Keeps the same blocking overlay UX and copy ("Welcome to DiRxctional" / "…teammates see who you are.").

### 4. Mount modal in `AdminLayout` (`src/components/layout/AdminLayout.tsx`)

After auth/role guards: read `useAdminProfile()`. If `profile.profile_complete === false`, render `<CompleteAdminProfileModal />` as blocking overlay (same pattern as ClinicLayout).

### 5. UserMenu name display for admins (`src/components/layout/UserMenu.tsx`)

Currently only clinic users get name display. Update logic:
- For admins, also call `useAdminProfile()` (only fires when role matches via the hook's `enabled`).
- Build `fullName` from admin profile when available; fallback to email.
- Avatar initials from first+last when present.

This means `UserMenu` reads both hooks; React Query's `enabled` flag ensures only the right one fires per role.

### 6. Dashboard note indicator (`src/pages/admin/AdminDashboard.tsx`)

Audit confirms: `ReferralTable` already renders the unread-note dot using `latest_clinic_note_at` from `(ref as any)`. AdminDashboard's mapping preserves all fields via `...r`, so the data is there. The visible bug is that the dashboard's table is filtered to **only** `ready_for_review` referrals, hiding any unread-note referrals in other statuses (e.g., `approved_to_send`, `sent_to_pharmacy`).

Fix: change the dashboard's "Referrals Needing Review" section so it also includes referrals with an unread clinic note (regardless of status). Section header becomes "Needs Attention" with a count combining both. Sort: unread-note rows first, then ready_for_review by created_at desc. Same `ReferralTable` component, no new logic.

The "unread" check uses the same `localStorage.getItem('notes_last_viewed_<id>')` pattern as `ReferralTable` so behavior is consistent.

Clinic side: spot-check `ClinicDashboard` — if it uses `ReferralTable`, same indicator already works. No change unless we find a missing field.

### Files touched
- `src/lib/api.ts` — race-safe `tokenReady` promise + admin profile fns
- `src/hooks/useApi.ts` — drop unmount null-out
- `src/hooks/useAdminProfile.ts` — new
- `src/components/CompleteAdminProfileModal.tsx` — new (NPI removed)
- `src/components/layout/AdminLayout.tsx` — mount modal
- `src/components/layout/UserMenu.tsx` — admin name/initials
- `src/pages/admin/AdminDashboard.tsx` — broaden "needs attention" to include unread-note referrals

### Risks / notes
- Note display on admin side already uses `author_name` from API (verified earlier in `noteAuthor.ts`); no extra change needed for admin-side note attribution.
- `tokenReady` resolves once and stays resolved, so post-logout/re-login the provider just gets reassigned — no second wait.
- If backend returns `latest_clinic_note_at` only on certain endpoints, the dashboard fix still works since both pages use the same `adminApi.getReferrals()`.

