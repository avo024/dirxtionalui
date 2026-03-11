

## Wire PatientDetail to Real API

Two files need changes:

### 1. `src/lib/api.ts` — Add missing methods to `clinicApi`

Add two methods (around line 79, before the closing `};`):

- `getPatient(id)` — `GET /patients/{id}` with `getHeaders()` and `handleResponse`
- `getPatientDrugs(id)` — `GET /patients/{id}/drugs` with `getHeaders()` and `handleResponse`

Note: `patientApi` already has `getPatient` but the component uses `clinicApi` consistently, so we add it there too.

### 2. `src/pages/clinic/PatientDetail.tsx` — Full rewire

**Imports:**
- Remove `mockPatients, mockReferrals, mockPatientDrugs, type PatientDrug` import from mockData
- Add `clinicApi` from `@/lib/api`

**State & data fetching (lines 39-57):**
Replace mock lookups with three `useEffect` hooks:
- `clinicApi.getPatient(id)` → `patient` state (+ `loading`, `error` states)
- `clinicApi.getPatientDrugs(id)` → `medications` from `data.drugs || []`
- `clinicApi.getReferrals()` → filter by `patient_id === id` → `referrals` state

**Loading/error guard (lines 68-77):**
- Show `Loader2` spinner while `loading` is true
- Show error message with back button if `error` or `!patient`

**Field mappings throughout the template:**
- `patient.first_name + last_name` → `patient.full_name || '—'`
- `patient.first_name` (button labels) → `patient.full_name?.split(' ')[0] || 'Patient'`
- `patient.phone` → `patient.phone_primary || '—'`
- `patient.email` → `patient.email || '—'`
- `patient.gender` → `patient.gender || '—'`
- `patient.insurance_type` → `patient.insurance_type || '—'`
- `patient.insurance_notes` → `patient.insurance_notes || '—'`
- `patient.last_drug` → `patient.last_drug || '—'`
- `patient.last_dosage` → `patient.last_dosage || ''`
- `patient.last_referral_date` → `patient.created_at`
- `patientReferrals` → use `referrals` state directly
- `allDocuments` → set to empty array `[]` (documents will come from a future API)
- `getDrugPABadge` type annotation → change from `PatientDrug` to `any`
- `drug.frequency` → `drug.frequency || '—'`
- `patient.pa_status.charAt(0)` → guarded with `(patient.pa_status || '').charAt(0)...`

