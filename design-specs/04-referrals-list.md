# Spec 04 — Referrals List ("My Referrals")

**Component:** `src/pages/clinic/ReferralsList.tsx` · **Route:** `/clinic/referrals`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> filter, column, or button. Keep all copy verbatim. No new features. Match the real component
> in `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

Browse / filter / search / paginate all of the clinic's referrals. Loads `GET /referrals`.

## Bars

- **Bar A — Header:** "My Referrals" + "View and track all your submitted referrals" + **New
  Referral** button.
- **Bar B — Filter + search:** four filter tabs with count badges — **All** · **In Review**
  (`processing/ready_for_review/uploaded`) · **Needs Attention** (`rejected`) · **Sent**
  (`sent_to_pharmacy/approved_to_send`). Search input "Search by patient, drug, or ID…"
  (matches patient_name, drug, id).
- **Bar C — Table:** `ReferralTable` (clinic columns — see `00-app-shell`). Loading = 4 skeleton
  rows. Two empty states: no-results ("No referrals found / Try adjusting your search or
  filters" + Clear Filters) vs never-created ("You haven't created any referrals yet" + Create
  Your First Referral).
- **Bar D — Pagination:** "Showing {a}-{b} of {n} referrals" + page-size select (5/10/25/50) +
  Prev / numbered pages / Next.

## Known weaknesses to fix in redesign

Page-number buttons overflow at high counts (need ellipsis or arrow-only); no column sorting; no
URL state for page/filter (refresh resets); filter groupings (which statuses map to a tab) aren't
obvious.

## Option axes (generate A/B/C per bar)

- **Filter bar (Bar B):** A pill tabs with counts (current) · B segmented control + status
  dropdown · C left filter rail with counts.
- **List (Bar C):** A data table (current) · B card rows (patient-forward, status-forward) ·
  C grouped-by-status sections.
- **Pagination (Bar D):** A numbered pages (current) · B Prev/Next + "page x of y" + ellipsis ·
  C infinite scroll / "load more".
- **Add sorting affordance** on Created / Updated / Status columns (visual only — header caret).
- **Page title type:** A all-Inter · B editorial serif title.
