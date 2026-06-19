# DiRxctional Admin Redesign — Spec Pack (Phase 1b)

Redesign of the **admin (internal ops) side** of the DiRxctional app, after the clinic redesign.
Same process as clinic: these specs are grounded in the real admin code, fed to Claude Design,
then implemented on the real components.

## Use in Claude Design
Per page, paste the spec + two anchors:
1. **Reference repo** `avo024/dirxtionalui` — the named admin component is source of truth.
2. **Reference the "DiRxctional App UI" design system** (navy/teal tokens, dark sidebar, status
   pills, JetBrains Mono IDs) — render in **dense product mode**, matching the already-shipped
   clinic redesign so the two sides feel like one product.

> **Guardrail (top of every generation):** Redesign visuals/layout/interaction ONLY. Do not add,
> remove, rename, or reorder fields, columns, tabs, actions, or endpoints — EXCEPT the one
> deliberate feature this phase adds: **structured rejection** (spec 01). Match the real admin
> component. No other new features.

## Reuse from the clinic redesign (don't reinvent)
The clinic side already built these — admin should reuse the same look:
- **App shell** — dark navy sidebar (`AdminSidebar` already restyled via tokens), light canvas.
- **`dh-table`** (data table) + sortable headers + `StatusBadge`/`ClinicPABadge`/`CreatedByAvatar`.
- **`rl-` chrome** — segmented filter + dropdown, search box, compact ellipsis pagination.
- **`rd-` patterns** — definition-list cards, edit drawer, split doc viewer, FixPanel, tabs,
  status progress, notes, field ⚠ flags. The admin Referral Review reuses most of these.
- **Card/empty/badge** primitives from `dashboard.css` / `referral-detail.css`.

So most admin pages are **the clinic patterns with admin data + admin actions**. Keep them
visually identical to clinic where the structure matches (queue ≈ referrals list; review ≈
referral detail with extra power).

## Admin pages (priority order)
| # | Page | File | Tier |
|---|---|---|---|
| 01 | **Referral Review** (approve/reject/send + edit + PA) | `AdminReferralReview.tsx` | ⭐ daily driver — most work |
| 02 | Review Queue | `AdminReferralsList.tsx` | daily driver |
| 03 | Admin Dashboard | `AdminDashboard.tsx` | daily driver |
| 04 | Clinics (list + detail) | `ClinicsList.tsx` / `ClinicDetail.tsx` | light CRUD |
| 05 | Pharmacies (list + detail) | `PharmaciesList.tsx` / `PharmacyDetail.tsx` | light CRUD |
| 06 | Invites | `AdminInvites.tsx` | light CRUD |
| 07 | Add-on Requests | `AdminAddonRequests.tsx` | light |
| 08 | AI Quality (overview/referral/corrections) | `AIQuality*.tsx` | light, data-dense |

## ⭐ The headline feature: STRUCTURED REJECTION (the admin↔clinic contract)

**Problem (mapped):** admin reject today = `adminApi.makeDecision(id, 'reject', reason)` →
`POST /admin/referrals/{id}/decision` `{decision:'reject', reason}` — **free text only**. The
clinic FixPanel (already built) reads `missing_fields.missing_documents` + `rejection_reason`,
but nothing structured is captured on reject, so the clinic checklist can't be precise.

**Fix:** make the admin reject modal **capture structure**, stored so the clinic FixPanel renders
it exactly:
- **Missing documents checklist** — admin ticks which docs are needed (insurance front/back,
  chart notes, referral form, prior auth, …). → writes `missing_fields.missing_documents`
  (the array the clinic already reads).
- **Flagged fields** — admin marks specific extracted fields that need correction (e.g.
  `insurance.primary_member_id`, `provider.npi`). → new `missing_fields.flagged_fields` (dotted
  paths) that the clinic FixPanel + ⚠ markers read.
- **Reason** — free text (as today), stays in `rejection_reason`.

**Backend change (small, additive):** extend `POST /admin/referrals/{id}/decision` (reject path)
to accept `missing_documents: string[]` and `flagged_fields: string[]` and persist them into the
`missing_fields` JSONB alongside the existing `missing_documents`. No schema migration — reuse the
JSONB column the clinic already reads. Clinic side needs **zero** changes (same data contract).

**Clinic ⚠ flags upgrade (bonus, optional):** confidence already lives at
`extracted_data.meta.confidence` (dotted-path → 0–1). The clinic FixPanel currently flags
empty-required fields only; once we surface `meta.confidence`, the clinic can also flag genuine
low-confidence fields. The admin review already renders `ConfidenceDot` from this same data.

## Status vocabulary (admin)
Referral: same as clinic (`uploaded/processing/ready_for_review/approved_to_send/sent_to_pharmacy/
rejected`). PA (admin, richer than clinic): `not_required / required_processing /
required_submitted / required_approved / required_denied`. Keep the existing `StatusBadge` +
admin `PAStatusCell` components and labels.
