

## Plan: Create Data Mapper + Wire ReferralsList to API

### Step 1: Create `src/lib/dataMapper.ts`

A centralized mapper utility that handles backend→frontend field transformations. Based on the inline mapping already used in `AdminReferralsList.tsx` (lines 33-38):

- `mapReferralFromBackend(r)` — maps a single referral: `drug_requested→drug`, `preferred_pharmacy_blocked→blocked`, `patient_dob→dob`, spreads remaining fields
- `mapReferralsFromBackend(items)` — maps an array
- `mapReferralToBackend(manualData)` — converts CreateReferral camelCase form state into the backend's snake_case `extracted_data` structure (handles `diagnosisCode→diagnosis_icd10`, `hasInsurance→has_insurance_card`, `insuranceNotes→notes`, all provider prefix stripping, etc.)

### Step 2: Update `src/pages/clinic/ReferralsList.tsx`

- Remove `mockReferrals` import and static `clinicReferrals` filter
- Add `useState` for `referrals` array and `loading` boolean
- Add `useEffect` calling `clinicApi.getReferrals()` → `mapReferralsFromBackend(response.items)`
- Move `getFilterCount` inside the component to reference `referrals` state instead of a module-level const
- Update `filtered` useMemo to use `referrals` instead of `clinicReferrals`
- Add loading skeleton UI (3-4 skeleton rows) shown while `loading` is true
- Add error toast on fetch failure

No other pages will be changed in this step — just the mapper file and ReferralsList.

