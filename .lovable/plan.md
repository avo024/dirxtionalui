

## Four Improvements to Clinic Referral Detail

### Overview
Enhance the referral detail page with: rejection banner with resubmit, categorized documents with real filenames, document upload for rejected referrals, and a dynamic timeline from the API.

### 1. API additions (`src/lib/api.ts`)

Add two new methods to `clinicApi`:
- `resubmitReferral(referralId)` — POST `/referrals/{referralId}/resubmit`
- `getReferralHistory(referralId)` — GET `/referrals/{referralId}/history`, returns `{ items: [] }`

### 2. Rejection banner (`ReferralDetail.tsx`, lines 149-156)

Replace the current simple alert with a more prominent banner:
- Use `AlertTriangle` icon, title "Referral Needs Attention"
- Show `referral.rejection_reason` or fallback text
- Show even when `rejection_reason` is null/empty (current code hides it)
- Include a "Resubmit Referral" button inside the banner (triggers resubmit flow)

### 3. Documents tab overhaul (lines 378-413)

Replace flat document list with categorized sections:
- Group documents by `doc_type`: Referral Form (`referral_form`), Insurance (`insurance_front`, `insurance_back`), Chart Notes (`chart_notes`), Other
- Show `original_filename` instead of generic "Document" name
- Use `FileText` for PDFs, `Image` icon for image types
- Empty categories show dashed placeholder ("No insurance documents uploaded")

When `status === 'rejected'`, add upload zones below the document categories:
- Three drop zones (Referral Form, Insurance, Chart Notes) using file input
- On upload: call existing `clinicApi.uploadDocument()`, refresh documents list, show toast
- Track `newUploadsCount` state to enable the resubmit button

### 4. Resubmit flow

- "Resubmit Referral" button in rejection banner and at bottom of documents tab (when rejected)
- On click: call `clinicApi.resubmitReferral(id)`, show success toast with message about re-extraction
- On success: reload referral data (status changes to `processing`)

### 5. History tab overhaul (lines 416-500)

Replace hardcoded status-based timeline with dynamic API-driven timeline:
- Fetch history from `clinicApi.getReferralHistory(id)` on mount (alongside existing fetches)
- Map `event_type` to human-readable labels and color codes:
  - Green: `referral_approved`, `ai_extraction_completed`, `delivery_completed`, `pa_approved`
  - Red: `referral_rejected`, `pa_denied`
  - Blue: `referral_created`, `document_uploaded`, `referral_finalized`, `referral_resubmitted`, `pa_submitted`
- Show timestamp formatted with `formatDateTime`
- Fallback: if history fetch fails or returns empty, show the current hardcoded timeline as before

### Files changed
- `src/lib/api.ts` — add 2 methods
- `src/pages/clinic/ReferralDetail.tsx` — rewrite rejection banner, documents tab, history tab, add upload + resubmit state

