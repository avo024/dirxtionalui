# DiRxctional Clinic Redesign — Spec Pack

These specs drive a **visual/interaction redesign** of the DiRxctional clinic web app in
Claude Design. They are written from the real code in this repo so Claude Design renders the
*actual* pages, not invented ones.

## How to use these specs in Claude Design

For every page, paste the page spec as the brief and keep these two grounding anchors on:

1. **Reference this repo** (`avo024/dirxtionalui`) — the named component is the source of truth
   for structure, fields, labels, and copy.
2. **Reference the DiRxctional brand design system** (the tokens: Navy `#1B2B5B`, Teal
   `#14B8A6`, Peach `#FB923C`, Inter body, JetBrains Mono for IDs, the stone/teal scales, the
   status colors, spacing, radii, shadows).

### ⚠️ The brand system is the marketing system — render in PRODUCT mode

The attached design system was built from the **marketing website** (`dirxtional-website`):
serif Newsreader headlines, warm parchment/cream editorial sections, big hero spacing. Use it
**only for brand tokens** (color, type, logo, motion, shadows). Do **not** carry over the
editorial layout language. This is a **dense clinical product app**, so:

- **Density:** compact, scannable, data-first. Not landing-page whitespace.
- **Shell:** persistent **dark navy sidebar** (`#121D3E`) + light off-white content canvas.
- **IDs/codes:** JetBrains Mono.
- **Serif headlines are OPTIONAL** — offer them as one option axis (editorial page-titles) vs.
  all-Inter (cleaner product). Do not default to serif everywhere.

## REDESIGN GUARDRAIL (put this line at the top of every generation)

> Redesign visuals, layout, and interaction ONLY. Do **not** add, remove, rename, or reorder
> any step, field, option, table column, tab, or button. Keep all copy verbatim. No new
> features. Match the real component in `avo024/dirxtionalui`.

## How options work

Each page is a vertical stack of **bars** (sections). For each bar we list 2–3 **option axes**
to explore. Generate labeled variants (A / B / C) per bar so Alex can mix the winning bar from
one variant with another. We are choosing *layout & interaction*, not color.

---

## The app shell (shared by every clinic page)

**Sidebar (`ClinicSidebar.tsx`)** — dark navy, fixed, 240px. Logo top. "Clinic · {clinic_name}"
label. Nav: Dashboard · Patients · New Referral (+ badge) · My Referrals · Services. Active item
= teal-tinted fill. Bottom: Sign Out. (Admin sidebar mirrors this; restyle to match.)

**Page header pattern** — every page opens with: title + one-line subtitle (left), primary
action button (right, e.g. "New Referral"). Some pages add a back button above it.

**Content canvas** — off-white `#FAFAF9`, cards are white with `shadow-sm`, 1px stone-200 borders.

## Shared components (reuse, do not reinvent)

- **StatusBadge** — referral status pill. Statuses: `uploaded`, `processing`,
  `ready_for_review`, `approved_to_send`, `rejected`, `sent_to_pharmacy`, `needs_info`. Sizes
  sm/md/lg, optional icon.
- **ClinicPABadge / PAStatusBadge** — PA status: `null/none`, `pending`, `processing`,
  `submitted`, `approved`, `denied`. Bridge program → "Bridge Program — PA not required".
- **ReferralTable** — clinic columns: ID (mono, copy) · Patient (unread-note dot) · Drug
  (+Bridge badge) · Status (+Insurance Expired badge) · PA Status · Created · Updated · Actions
  (View) · Created By (avatar). Rows clickable, alternating stripe, hover tint.
- **DocumentViewer** — modal; PDF iframe / image zoom / file fallback; doc tabs; presigned URL.
- **Empty-state pattern** — centered icon + heading + subtitle + CTA button.
- **KPI/stat card** — colored icon tile, label, large number, subtitle; whole card is a link.

## Status pill color mapping (from design tokens — keep stable across all directions)

| Status | bg / fg token |
|---|---|
| uploaded | `--status-uploaded-*` (stone) |
| processing | `--status-processing-*` (blue) |
| ready_for_review | `--status-review-*` (blush/amber) |
| approved_to_send | `--status-approved-*` (green) |
| sent_to_pharmacy | `--status-sent-*` (teal) |
| rejected | `--status-rejected-*` (red) |

## Page spec index

| # | Page | File | Component |
|---|---|---|---|
| 01 | New Referral wizard | `01-create-referral.md` | `pages/clinic/CreateReferral.tsx` |
| 02 | Patient Detail | `02-patient-detail.md` | `pages/clinic/PatientDetail.tsx` |
| 03 | Clinic Dashboard | `03-dashboard.md` | `pages/clinic/ClinicDashboard.tsx` |
| 04 | Referrals List | `04-referrals-list.md` | `pages/clinic/ReferralsList.tsx` |
| 05 | Referral Detail | `05-referral-detail.md` | `pages/clinic/ReferralDetail.tsx` |
| 06 | Patients List | `06-patients-list.md` | `pages/clinic/PatientsList.tsx` |
| 07 | Create Patient | `07-create-patient.md` | `pages/clinic/CreatePatient.tsx` |
| 08 | Services | `08-services.md` | `pages/clinic/Services.tsx` |
