

## Admin Fixes: PA View Button, Delivery Modal Docs, Patient Info

### Changes

**File 1: `src/components/PAManagementCard.tsx`**
- Remove the "View" button from Case B (lines 225-227). Keep only the "Replace" button.

**File 2: `src/components/DeliveryConfirmModal.tsx`**
- Add `paLetterInfo` prop (type `PALetterInfo | null`) to receive PA letter status from parent
- **Always-included section** at top:
  - ✅ Referral PDF (non-removable checkmark)
  - ✅ PA Letter (non-removable checkmark, shown only if `paLetterInfo?.has_letter`)
  - If `paLetterInfo?.drug_requires_pa && !paLetterInfo?.has_letter`: show red warning "PA letter missing" and disable Confirm & Send
- **Patient + drug info line** below the pharmacy card: "Patient: {name} · Drug: {drug}"
- **Additional documents** section: collapsible, collapsed by default, only shown if `uploadedDocs.length > 0`. Documents start UNCHECKED (flip current logic — use `includedDocIds` Set instead of `excludedDocIds`)
- **Payload**: send `include_doc_ids` array of checked additional doc IDs (instead of `exclude_doc_ids`)
- Update attachment count to reflect: always-included (1 or 2) + checked additional docs

**File 3: `src/pages/admin/AdminReferralReview.tsx`**
- Pass `paLetterInfo` prop to `DeliveryConfirmModal`

### Files changed
- `src/components/PAManagementCard.tsx` — remove View button
- `src/components/DeliveryConfirmModal.tsx` — PA letter status, collapsed additional docs, patient/drug info
- `src/pages/admin/AdminReferralReview.tsx` — pass paLetterInfo to delivery modal

