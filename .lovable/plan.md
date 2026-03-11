

## Two Quick Fixes in PatientDetail.tsx

### Fix 1: Referral table date format (line 242)
Change `getRelativeTime(ref.created_at)` to `formatDateShort(ref.created_at)` in the referrals table "Created" column.

### Fix 2: PA Status card fields (lines 171-188)
Update the four grid fields:
- **Current Drug**: Combine `last_drug` and `last_dosage` with proper trim and fallback
- **PA Status**: Add `|| 'none'` fallback to status prop
- **PA Expiration**: Already correct, keep as-is
- **Last Referral**: Use `referrals[0].created_at` with `formatDateShort` instead of `patient.created_at` with `getRelativeTime`

