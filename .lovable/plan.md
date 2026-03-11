

## Plan: Load Existing PA Data on Mount

**File:** `src/components/PAManagementCard.tsx`

**Single change** — Replace lines 87-91 (the existing `useEffect`) with the user's provided `useEffect` that:

1. Sets `paDecisionStatus` and `isEditMode` based on `referral.pa_status`
2. Loads existing field values from `referral.pa_data` (pa_number, ref_number, denial_reason, notes, dates, file info)
3. Falls back to `referral.pa_expiration_date` for expiration
4. Updates dependency array to `[referral.id, referral.pa_status, referral.pa_expiration_date]`

