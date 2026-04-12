

## Delivery Confirmation Modal with Pharmacy Selection

### Summary
Replace the simple "Send to Pharmacy" confirm dialog with a rich modal that shows the assigned pharmacy, allows changing it, displays what's being sent, and confirms delivery. Also update the bottom action bar to hide Reject/Approve once approved.

### Changes

**File 1: `src/components/DeliveryConfirmModal.tsx`** (new)

A new modal component with four sections:

1. **Assigned Pharmacy card** — reads `referral.pharmacy_name`, `referral.pharmacy_email`, `referral.pharmacy_phone`, `referral.pharmacy_address` from referral data. If none assigned, show yellow warning.

2. **Change Pharmacy** — a collapsible section. On expand, fetches `GET /admin/referrals/:id/alternative-pharmacies`. Shows a dropdown of results. On selection, calls `POST /admin/referrals/:id/reassign-pharmacy` with `{ pharmacy_id }`, then refreshes the displayed pharmacy info and shows a green checkmark "Pharmacy updated".

3. **What's being sent** — static checklist: referral PDF (always), uploaded documents with count from `documents` prop, patient name and drug name.

4. **Footer** — Cancel button and "Confirm & Send" primary button. Confirm calls `POST /admin/referrals/:id/deliver`. On success: close modal, show toast with pharmacy name/email, call `onDelivered()` callback to refresh parent.

Props: `open`, `onOpenChange`, `referralId`, `referral` (current referral data), `documents` (document list), `onDelivered` (callback).

**File 2: `src/lib/api.ts`**

Add to `adminApi`:
- `getAlternativePharmacies(id: string)` — `GET /admin/referrals/${id}/alternative-pharmacies`

**File 3: `src/pages/admin/AdminReferralReview.tsx`**

- Replace the simple `ConfirmModal` for delivery (lines 920-940) with the new `<DeliveryConfirmModal>`.
- Pass `referral`, `documents`, and an `onDelivered` callback that refreshes referral data.
- Bottom action bar already correctly shows "Send to Pharmacy" only for `approved_to_send` and hides Reject/Approve — no change needed there.

### Files changed
- `src/components/DeliveryConfirmModal.tsx` (new)
- `src/lib/api.ts` (add 1 method)
- `src/pages/admin/AdminReferralReview.tsx` (swap modal, ~10 lines)

