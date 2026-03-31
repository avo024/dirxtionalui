

## Wire ClinicDashboard to Real API

All referenced imports (`clinicApi`, `mapReferralsFromBackend`, `Skeleton`) exist and are verified.

### Issues to fix in the plan before implementing:

1. **Duplicate filter**: `approvedCount` and `sentCount` both filter on `"approved_to_send"`. I'll use `"sent_to_pharmacy"` for `sentCount` (matching the original mock logic and the stat card label "Sent to Pharmacy").

2. **TypeScript**: `Record` needs type params → `Record<string, number>`.

### Changes (single file: `src/pages/clinic/ClinicDashboard.tsx`):

1. **Replace imports**: Remove `mockReferrals`/`mockPatients`, add `useState`, `useEffect`, `clinicApi`, `mapReferralsFromBackend`, `Skeleton`.

2. **Remove module-level mock calculations** (lines 13–46): All `clinicReferrals`, counts, `patientsExpiringPA`, `rejectedReferrals`, `urgencyOrder`, `sortedRecentReferrals`.

3. **Add state + useEffect inside component**: Fetch from `clinicApi.getReferrals()` and `clinicApi.getPatients()`, map with `mapReferralsFromBackend`. Compute all derived values inside the component.

4. **Fix sentCount filter**: Use `r.status === "sent_to_pharmacy"` instead of duplicating `approved_to_send`.

5. **Update alert displays**: Use `p.full_name` fallback and `ref.drug_requested || ref.drug` for backend field compatibility.

6. **Add loading skeleton**: Show skeleton cards while data loads.

