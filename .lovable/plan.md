

## Wire PatientsList to Real API

Two files need changes:

### 1. `src/lib/api.ts` — Add `getPatients` to `clinicApi`

Add a `getPatients` method to the `clinicApi` object (around line 27) that accepts an optional `search` param and calls `/patients?search=...`. This is separate from the existing `patientApi.getPatients` which has no search support.

```ts
async getPatients(search?: string): Promise<any> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/patients${params}`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
},
```

### 2. `src/pages/clinic/PatientsList.tsx` — Full rewire

**Imports:**
- Remove `mockPatients` import
- Add `useEffect` to React import
- Add `clinicApi` from `@/lib/api` and `toast` from `@/hooks/use-toast`
- Add `Loader2` to lucide imports

**State & data fetching:**
- Add `patients` and `loading` state
- Replace the `useMemo` that filters `mockPatients` with:
  - A `useEffect` that calls `clinicApi.getPatients(search)` and sets `patients` from `data.items`
  - A new `useMemo` that filters `patients` by the `filter` dropdown only (search is server-side now)

**Loading state:**
- Show a centered `Loader2` spinner when `loading` is true, before the table

**Table row field mappings:**
- `patient.first_name + patient.last_name` → `patient.full_name || '—'`
- `patient.dob` → guarded with `patient.dob ? ... : '—'`
- `patient.last_drug` → `patient.last_drug || '—'`
- `patient.last_dosage` → `patient.last_dosage || ''`
- `patient.last_referral_date` → `patient.created_at ? getRelativeTime(patient.created_at) : '—'`
- `PAStatusBadge` — keep `patient.pa_status` and `patient.pa_expiration_date`

**Empty/loading guard:**
- Only show table/empty state when `!loading`

