

## Bridge Program Flow + Expired Insurance Flow

### Overview
Two connected features: (1) Bridge Program modal when clinic selects "no insurance", (2) admin can mark insurance as expired, clinic can update it.

---

### Feature 1: Bridge Program

**1A. CreateReferral.tsx — Bridge Program modal**
- Add `isBridgeProgram` state (boolean, default false)
- When `manualData.hasInsurance` is toggled OFF (manual entry mode), show a Dialog asking "Is this a Bridge Program referral?" with Yes/No buttons
- For upload mode: add a similar "No Insurance" switch above the insurance upload zone; when toggled on, show the same Bridge Program modal
- Store result in `isBridgeProgram` state
- In `handleSubmit`, add `is_bridge_program: isBridgeProgram` to the referral payload

**1B. ReferralTable.tsx — Bridge Program badge**
- In the Drug column cell, after the drug name, render a purple "Bridge" badge when `ref.is_bridge_program === true`

**1C. Clinic ReferralDetail.tsx — Insurance section**
- When `referral.is_bridge_program === true`, replace the insurance fields in the Insurance & PA card with a purple "Bridge Program" label instead of showing insurance data

**1D. Admin AdminReferralReview.tsx — Summary insurance card**
- When `referral.is_bridge_program === true`, show a purple "Bridge Program" banner in the insurance summary card instead of the "no insurance" warning

---

### Feature 2: Expired Insurance

**2A. API — src/lib/api.ts**
- Add `adminApi.markInsuranceExpired(referralId, expired)` — POST to `/admin/referrals/:id/mark-insurance-expired`
- Add `clinicApi.updateReferralInsurance(referralId, insurance)` — PUT to `/referrals/:id/insurance`

**2B. Admin AdminReferralReview.tsx — Insurance Expired checkbox**
- In the Insurance accordion section (All Fields tab, line ~673), add a checkbox "Insurance Expired" at the top
- Initialize from `referral.insurance_expired`
- On change, call `adminApi.markInsuranceExpired()`, update local state, show toast
- When expired: wrap the Insurance accordion item in a red/orange border, add "EXPIRED" badge at top-right of the trigger
- Also update the Summary tab Insurance card (line ~387) with a red "EXPIRED" banner when `referral.insurance_expired === true`

**2C. ReferralTable.tsx — Expired Insurance badge**
- In the Status column cell, after the StatusBadge, render a red/orange "Insurance Expired" badge when `ref.insurance_expired === true`

**2D. Clinic ReferralDetail.tsx — Expired insurance warning + update flow**
- When `referral.insurance_expired === true`, show a warning banner in the Insurance & PA card:
  - "DiRxtional Team flagged this patient's insurance as expired."
  - Two buttons: "Upload New Insurance Card" and "Enter Manually"
- **Upload path**: opens file picker, uploads via `clinicApi.uploadDocument(id, file, 'insurance')`, then calls `clinicApi.finalizeReferral(id)`, refreshes referral data
- **Manual path**: shows inline form with fields (Primary Plan Name, Member ID, Group Number, RxBIN, RxPCN, Policyholder Name, Secondary Plan Name, Secondary Member ID). On save calls `clinicApi.updateReferralInsurance(id, data)`. On success: refresh referral, banner disappears

---

### Files changed
- `src/lib/api.ts` — add 2 new API methods
- `src/pages/clinic/CreateReferral.tsx` — bridge program modal + state + payload
- `src/components/ReferralTable.tsx` — bridge program badge + expired insurance badge
- `src/pages/clinic/ReferralDetail.tsx` — bridge program display + expired insurance warning/update flow
- `src/pages/admin/AdminReferralReview.tsx` — expired insurance checkbox + visual states + bridge program display

