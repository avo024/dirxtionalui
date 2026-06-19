# Spec 05 — Referral Detail

**Component:** `src/pages/clinic/ReferralDetail.tsx` · **Route:** `/clinic/referrals/:id`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> tab, field, card, or button. Keep all copy verbatim. No new features. Match the real component
> in `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`). This is the densest
> clinic page — prioritize scannability.

## What this page does (cross-end)

The full record for one referral: extracted data, status, documents, history, notes, PA. Loads
`GET /referrals/{id}`, `…/documents`, `…/history`, `…/notes`. Writes: upload doc
(`POST …/documents`), resubmit (`POST …/resubmit`), add note (`POST …/notes`), update insurance
(`PUT …/insurance`), finalize (`POST …/finalize`), presigned doc URL (`GET …/documents/{id}/url`).

## Bars

- **Bar A — Back:** ghost "Back to Referrals".
- **Bar B — Header:** patient name (large) + **StatusBadge** + mono ID chip + "drug · Created
  {date}" + optional "Created by {name}".
- **Bar C — Status banner (conditional):**
  - rejected → red "Referral Needs Attention" + rejection_reason + "Go to the Documents tab to
    upload missing information, then resubmit."
  - approved_to_send / sent_to_pharmacy → green "Referral Sent" / "Referral Approved & Sending" +
    3-col Pharmacy / Location / Contact.
- **Bar D — Tabs:** **Overview · Documents · History · Notes**.

### Overview (2-col: main + right rail)
- **Main info cards:** Patient Information (name parts, DOB, gender, phone/email copyable,
  address, height/weight, allergies, authorized rep) · Clinical Information (diagnosis, drug,
  therapy type, dates, dose, frequency, quantity, length, administration, location, refill) ·
  Provider Information (name, specialty, NPI, DEA, address, phone/fax/email, office contact,
  requestor, signature date).
- **Right rail:** **Status card** (large badge + status description + 3-step timeline
  Received → In Review → Sent, hidden if rejected) · **Insurance & PA card** (Bridge → "Bridge
  Program / PA not required"; else insurance fields + expired-insurance banner with Upload/Enter
  Manually form; PA section: Required Y/N, PAStatusBadge, PA number/expiry if approved, denial
  reason if denied, "PA Handled By DiRxtional/Clinic").

### Documents
- Grouped by category (Referral Form/Prescription · Insurance Documents · Chart Notes · Other);
  doc cards open **DocumentViewer** modal. If status = rejected: an upload area (3 zones) +
  **Resubmit Referral** button.

### History
- Vertical timeline; colored event dots + icons + label + timestamp; rejection events show
  reason. Fallback static timeline if no events.

### Notes
- Note list (clinic vs admin color-coded, avatar + author + timestamp) + textarea composer with
  send button.

## States

Loading (skeletons), error ("Referral not found" + back), status-gated actions (resubmit + upload
zones only when rejected; PA details only when pa_required; expired-insurance banner only when
insurance_expired).

## Known weaknesses to fix in redesign

12+ fields packed per card hurts scanning; document switching closes/reopens the modal; the
rejected path isn't visible in the status timeline; insurance vs PA hierarchy is flat; no inline
field edit except insurance.

## Rejection recovery — BUILD IN PAGE 05 (decided 2026-06-19)

Backend is ready: `PATCH /referrals/<id>` (`edit_referral`) accepts extracted_data
corrections in statuses `uploaded/processing/ready_for_review/rejected` and **auto-promotes a
rejected referral back to `ready_for_review`** on edit. Frontend has NO edit method yet — add
`clinicApi.editReferral(id, extractedDataPatch)` calling PATCH.

When a referral is **rejected** (and more broadly, whenever status is editable), the page must
offer BOTH recovery paths, decoupled from how it was originally submitted:
- **Edit details** — make the Overview extracted-data cards editable via the **same edit-drawer
  pattern as Patient Detail** (Patient / Clinical / Provider / Insurance sections). This is the
  essential path: if the AI couldn't read a field, re-uploading the same docs can't fix it.
- **Upload documents** — the existing upload-zones + resubmit flow.
Present them as siblings ("Fix this referral"), not either/or. An edit auto-promotes to review;
an upload uses resubmit.

**What's-missing panel** (top of a rejected referral): admin **rejection reason** (have it) +
a **missing-items checklist** from `missing_fields.missing_documents` + optionally a ⚠ flag on
low-confidence / empty fields in the data cards so they can jump to what to fix.

**Notes-as-notification** = FAST-FOLLOW (after clinic redesign), NOT page 05: dashboard "Needs
attention" hub gains unread admin notes; Notes tab gets an unread badge. Uses `latest_admin_note_at`.

## Option axes (generate A/B/C per bar)

- **Layout:** A tabs (current) · B single scroll with sticky section nav · C master-detail
  (left summary rail + right tabbed content).
- **Overview cards:** A 2-3 col field grids (current) · B definition-list rows with clear
  label/value rhythm · C collapsible cards (Patient expanded, others collapsed).
- **Status card:** A 3-step dot timeline (current) · B horizontal progress with the rejected
  branch shown · C compact status + "what happens next" line.
- **Documents:** A category groups + modal (current) · B split view: thumbnail list left, viewer
  right (no modal) · C inline accordion previews.
- **Insurance & PA:** A combined card (current) · B two separate cards (Insurance / PA) with
  clear "valid?" and "PA needed?" headlines.
- **Page title type:** A all-Inter · B editorial serif name.
