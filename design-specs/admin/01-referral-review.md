# Admin Spec 01 — Referral Review ⭐

**Component:** `src/pages/admin/AdminReferralReview.tsx` · **Route:** `/admin/referrals/:id`

> Redesign visuals/layout/interaction ONLY — EXCEPT the deliberate new feature: **structured
> rejection** (the Reject modal). Keep every field, action, and endpoint. Match the real
> component + the clinic Referral Detail look (`rd-` patterns). Render in product mode.

## What this page does (cross-end)
The internal admin's worktable for one referral. Loads `GET /admin/referrals/{id}` (+ documents,
notes). The admin can: re-extract, edit any extracted-data section, manage prior authorization,
**approve / reject**, reassign pharmacy, and **deliver to pharmacy**.

### Backend actions (all `adminApi`)
- Re-extract → `POST …/process`
- **Decision** → `POST …/decision` `{decision:'approve'|'reject', reason?}` (← the reject path
  gains structure; see below)
- Edit data → `PUT …/extracted-data` `{extracted_data:{…}}` (section-level, deep-merged)
- PA: `POST …/pa/submit`, `…/pa/decision`, `…/pa/upload`, `GET …/pa/letter`
- Insurance expired → `POST …/mark-insurance-expired`
- Deliver → `POST …/deliver` `{exclude_doc_ids?}`; reassign → `POST …/reassign-pharmacy`
- Notes → `GET/POST …/notes`; PDF → `GET …/pdf?preview=true`

## Bars (visual structure)

**Bar A — Top header:** back · patient name + **StatusBadge** + doc-count chip · "drug · clinic ·
ID" · **Re-extract** button (when uploaded/ready_for_review) with progress.

**Bar B — Split work area** (reuse the clinic `rd-doc-split` pattern, but persistent two-pane):
- **Left — DocumentViewer** (the real component): doc tabs, zoom, download.
- **Right — tabbed panel:**
  - **Summary** (read-only): cards — Patient · Insurance (+ EXPIRED badge / Bridge banner) ·
    Medication (+ PA Required) · **PA Management Card** · Diagnosis & Clinical · Prescriber.
    Each value shows a **ConfidenceDot** (from `extracted_data.meta.confidence`, dotted-path
    0–1: yellow 0.50–0.84, red <0.50) and **critical-field flags** (the 7 `CRITICAL_FIELDS`:
    patient.first_name/last_name/dob, insurance.primary_member_id, clinical.drug_requested,
    clinical.diagnosis_icd10_primary, provider.npi → red "Missing — check source documents").
  - **All Fields** (editable accordions, section-level **Save** → `updateExtractedData`):
    Patient · Prescriber · Prescription (drug combobox, dosing, device, urgency, refill flags,
    TB/loading-dose conditionals, prior-failed-meds tags) · Insurance (primary/secondary,
    policyholder, benefit type, notes) · Prior Authorization (required, handled_by_clinic) ·
    Dermatology (conditional: BSA/IGA/EASI/PASI/POEM/itch, affected-areas + prior-treatment tags) ·
    Pharmacy. **Reuse the clinic edit-drawer field styling**; keep section-level save.
  - **Notes:** chronological list (admin vs clinic color-coded — same as clinic `rd-note`) +
    composer.

**Bar C — Bottom action bar** (sticky): status message + **Preview PDF** · **Approve** (green,
when ready_for_review/uploaded) · **Reject** (red, same gating) · **Send to Pharmacy** (when
approved_to_send; disabled with tooltip if PA letter required and missing).

## ⭐ The Reject modal — STRUCTURED (the new feature)

Replace the bare free-text reject (`ConfirmModal` + one textarea) with a structured modal that
populates the clinic FixPanel exactly:

1. **Reason** — textarea (verbatim role kept; stays `rejection_reason`). Required.
2. **What's missing — document checklist** — checkboxes the admin ticks: Insurance card (front),
   Insurance card (back), Chart notes, Referral form / Rx, Prior authorization form, Other.
   → persists to `missing_fields.missing_documents` (the array the clinic already reads).
3. **Flag fields to fix** — a compact picker of extracted fields needing correction (search +
   tick, or "flag" buttons next to fields in the Summary tab). → `missing_fields.flagged_fields`
   (dotted paths, e.g. `insurance.primary_member_id`). The clinic renders these as ⚠.
4. Submit → `POST …/decision` `{decision:'reject', reason, missing_documents, flagged_fields}`.

**Design intent:** make rejecting *faster* for the admin (tick boxes instead of typing a
paragraph) AND make the clinic's recovery precise. The two halves are one contract — this modal
is the source, the clinic FixPanel is the render.

## Option axes (generate per bar)
- **Work-area layout:** A two-pane split (docs | tabs, current) · B docs left + single-scroll
  right (Summary→Fields→Notes) · C docs as a collapsible top strip + full-width tabs.
- **Summary vs All-Fields:** A separate tabs (current) · B inline-editable Summary (edit in place,
  no separate "All Fields" tab) · C Summary with per-field "flag" + "edit" affordances.
- **Reject modal:** A modal (current size) · B right-side drawer matching the clinic edit drawer ·
  C two-step (reason → checklist).
- **Action bar:** A bottom sticky (current) · B top-right header actions.
- **Confidence display:** dots (current) vs subtle inline % vs a "needs verify" chip.

## Note for implementation
This page is the densest admin screen and reuses ~80% of the clinic Referral Detail patterns
(`rd-` split docs, dl/edit, tabs, notes, status, flags). Build it on those. The genuinely new
code is the **structured reject modal** + wiring `missing_documents`/`flagged_fields` into the
decision call (needs the small backend change in `00-admin-shell`).
