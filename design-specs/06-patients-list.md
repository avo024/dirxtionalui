# Spec 06 — Patients List

**Component:** `src/pages/clinic/PatientsList.tsx` · **Route:** `/clinic/patients`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> filter, column, or button. Keep all copy verbatim. No new features. Match the real component
> in `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

Browse / search / filter the clinic's patients. Loads `GET /patients?search=`.

## Bars

- **Bar A — Header:** "Patients" + "Manage your patients and their referrals" + **Add New
  Patient** button.
- **Bar B — Search + filter:** search input "Search by name, DOB, phone, or email…" (+ result
  count when searching) + filter dropdown: All Patients · Active (Recent Referral) · Inactive ·
  PA Expiring Soon.
- **Bar C — Table:** columns Patient Name (clickable) · DOB (Age) · Last Drug (+dosage) · Last
  Referral (date, tooltip full datetime) · PA Status (`PAStatusBadge`) · Actions (View · New
  Referral). Rows clickable → patient detail. Loading spinner. Empty states: no-results
  ("No patients found" + Clear Filters) vs none ("No patients yet" + Add Your First Patient).
- **Bar D — Pagination:** "Showing {a}-{b} of {n} patients" + Prev / numbered / Next (10/page).

## Known weaknesses to fix in redesign

Columns crowd on mobile; page numbers don't truncate at high counts; double interaction (row
click AND View button); clickable name only signaled on hover.

## Option axes (generate A/B/C per bar)

- **Search/filter (Bar B):** A search + dropdown (current) · B segmented filter pills + search ·
  C search with inline filter chips.
- **List (Bar C):** A table (current) · B patient cards (name-forward + PA badge + last drug) ·
  C compact list rows with avatar.
- **Row actions:** A View + New Referral buttons (current) · B single row click + hover quick-
  actions · C kebab menu.
- **Pagination:** A numbered (current) · B Prev/Next + ellipsis.
- **Page title type:** A all-Inter · B editorial serif title.
