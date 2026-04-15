

## PA Letter Upload + Continuation Status

### Summary
Wire the PA letter upload to the real backend, fetch and display PA letter status (own, continuation/fallback, missing), and block "Send to Pharmacy" when the letter is missing.

### Changes

**File 1: `src/lib/api.ts`**

Add two methods to `adminApi`:
- `getPALetterInfo(referralId)` — GET `/admin/referrals/:id/pa/letter`
- `uploadPALetter(referralId, file)` — POST `/admin/referrals/:id/pa/upload` (FormData, uses `getAuthHeaders()`)

**File 2: `src/components/PAManagementCard.tsx`**

Major rework of the PA letter handling:

- **New props**: Add `referralId` prop (currently only receives `referral` object, but need the ID for API calls). Also add `onPALetterChange?: (info: PALetterInfo) => void` callback so the parent can update delivery button state.
- **New state**: `paLetterInfo` (fetched from `getPALetterInfo` on mount), `uploadingLetter` (loading state)
- **Fetch on mount**: Call `adminApi.getPALetterInfo(referralId)` and store result
- **Replace `handleFileSelect`**: Instead of just setting local state, call `adminApi.uploadPALetter(referralId, file)`, then re-fetch `getPALetterInfo`, call `onPALetterChange` callback
- **New PA Letter section** rendered FIRST (above the insurance info card), with four cases:
  - Case D (`drug_requires_pa = false`): hide section entirely
  - Case A (`has_letter = false`): warning card with upload button
  - Case B (`has_letter = true, is_fallback = false`): success card showing filename, date, Replace/View buttons
  - Case C (`has_letter = true, is_fallback = true`): success card showing continuation info, link to source referral, optional "Upload New Letter" button
- **Remove** the existing upload dropzone from the "Approved" edit mode section (lines 421-481) — the PA Letter section above handles all upload now
- **Keep** the PA Approval Details fields (PA Number, dates, etc.) in the edit mode

**File 3: `src/pages/admin/AdminReferralReview.tsx`**

- **New state**: `paLetterInfo` — fetched alongside referral data
- **Fetch in `fetchReferralData`**: Add `adminApi.getPALetterInfo(id)` call, store result
- **Pass to PAManagementCard**: `onPALetterChange` callback that updates `paLetterInfo` state
- **Bottom action bar** (line 940-942): When `referral.status === 'approved_to_send'`, disable "Send to Pharmacy" button if `paLetterInfo?.drug_requires_pa === true && paLetterInfo?.has_letter === false`. Add tooltip explaining "PA letter required before sending to pharmacy."

### Files changed
- `src/lib/api.ts` — 2 new methods
- `src/components/PAManagementCard.tsx` — PA letter section, real upload, remove old dropzone
- `src/pages/admin/AdminReferralReview.tsx` — fetch PA letter info, pass callback, disable Send button

