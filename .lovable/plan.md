
## Admin UI Cleanup Plan

### 1. Remove Settings (sidebar + route + page)
- `src/components/layout/AdminSidebar.tsx`: drop the `Settings` nav item (and `Settings` icon import).
- `src/App.tsx`: remove the `AdminSettings` import and `<Route path="settings" />`.
- Delete `src/pages/admin/AdminSettings.tsx`.

### 2. Remove Blocked Referrals (sidebar + route + page + dead code)
- `src/components/layout/AdminSidebar.tsx`: drop the `Blocked Referrals` nav item, `AlertOctagon` import, and the now-unneeded `blocked` exclusion in the active-route check.
- `src/App.tsx`: remove `BlockedReferrals` import and `<Route path="referrals/blocked" />`.
- Delete `src/pages/admin/BlockedReferrals.tsx`.
- Delete `src/components/ReassignPharmacyModal.tsx` (only consumer was BlockedReferrals; uses mock data).
- `src/lib/api.ts`: remove `adminApi.getBlockedReferrals`.
- `src/data/mockData.ts`: remove `mockBlockedReferrals` export.

### 3. Wire Pharmacies to real backend

**API layer (`src/lib/api.ts`)**
- Add `Pharmacy` interface matching the documented response shape.
- Update `pharmacyApi`:
  - `getPharmacies()` (already correct, returns `{ items: [] }`)
  - `getPharmacy(id)` (already correct)
  - `createPharmacy(data)` / `updatePharmacy(id, data)` (already correct)
  - Add `deletePharmacy(id)` → `DELETE /pharmacies/:id`

**Pharmacies list (`src/pages/admin/PharmaciesList.tsx`) — full rewrite**
- React Query (`['pharmacies']`) calling `pharmacyApi.getPharmacies()`.
- Header: "Pharmacies" + subtitle showing `${count} active pharmacies` + right-aligned "+ Add Pharmacy" button (opens create modal).
- Search input filters client-side by name.
- Table columns: Name (bold) · Phone (formatted `(XXX) XXX-XXXX`) · Fax (formatted) · Alt Phone/Fax · Email · Location (`city, state`) · Actions (Edit pencil + Deactivate power icon).
- Row click → navigate to detail page.
- Loading: shadcn `Skeleton` rows.
- Error: inline retry message + toast.
- Empty (post-fetch, zero items): centered "No pharmacies yet" + prominent "+ Add Pharmacy".
- Phone formatter helper (`formatPhone(str)` → `(214) 555-1234`, falls back to raw).

**Pharmacy edit/create modal (new `src/components/PharmacyFormModal.tsx`)**
- shadcn `Dialog` with form fields:
  - Name* · Email · Phone · Fax · Alt Phone/Fax
  - Address · City · State (2 char, uppercase) · Zip
  - Contact Email · Contact Phone
  - Notes (Textarea)
  - Accepts No Insurance (Checkbox)
  - Blocked Medications (TagListEditor — already exists in repo for tag inputs)
  - Active toggle (Switch, maps to `is_active`)
- Submits via `createPharmacy` or `updatePharmacy`; on success: toast, close, invalidate `['pharmacies']`.
- Validation: name required, state must be 2 letters if present.

**Delete flow**
- "Deactivate" icon → `ConfirmModal` ("Deactivate {name}? They won't appear in new referrals.") → `deletePharmacy(id)` → invalidate list.

**Pharmacy detail (`src/pages/admin/PharmacyDetail.tsx`) — refactor**
- Replace `mockPharmacies.find` with React Query `pharmacyApi.getPharmacy(id)`.
- Render real fields (full address from `address, city, state, zip`, phone, fax, email, contact email/phone, notes, accepts_no_insurance badge, blocked_medications as tags, is_active badge).
- Edit button opens `PharmacyFormModal` prefilled.
- Deactivate uses same confirm flow as list.
- Loading skeleton + not-found state preserved.

### Files touched
- Edit: `src/App.tsx`, `src/components/layout/AdminSidebar.tsx`, `src/lib/api.ts`, `src/data/mockData.ts`, `src/pages/admin/PharmaciesList.tsx`, `src/pages/admin/PharmacyDetail.tsx`
- New: `src/components/PharmacyFormModal.tsx`
- Delete: `src/pages/admin/AdminSettings.tsx`, `src/pages/admin/BlockedReferrals.tsx`, `src/components/ReassignPharmacyModal.tsx`

### Notes / risks
- `mockPharmacies` itself stays in `mockData.ts` (still imported by detail page until rewrite — but rewrite removes it; if no other consumer, can be dropped too — will check during impl and remove if orphaned).
- `Pharmacy` mock type may still be referenced by the new interface name; new typed interface in `api.ts` will be the source of truth going forward.
- TagListEditor reuse keeps blocked_medications consistent with existing patterns (diagnoses, etc.).
- Phone formatter is permissive — only formats clean 10-digit strings, otherwise renders as-is so existing data isn't mangled.
