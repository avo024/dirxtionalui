# Spec 07 — Create Patient

**Component:** `src/pages/clinic/CreatePatient.tsx` · **Route:** `/clinic/patients/new`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> field or section. Keep all copy verbatim. No new features. Match the real component in
> `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

Add a new patient. Submits `POST /patients`. Single form, five sections.

## Bars

- **Bar A — Back:** ghost "Back to Patients".
- **Bar B — Header:** "Add New Patient" + "Enter patient demographics to add them to the system".
- **Bar C — Form sections (cards):**
  - **Required:** Full Name * ("First Last").
  - **Patient Demographics:** Date of Birth, Gender (Male/Female/Other/Prefer not to say),
    Phone, Alternate Phone, Email.
  - **Address:** Street Address, City, State (50-state select), Zip (maxlen 5).
  - **Medical:** Height, Weight, Allergies (textarea).
  - **Guardian (optional):** Authorized Representative, Representative Phone.
- **Bar D — Actions:** **Create Patient** (spinner while submitting) + **Cancel**.

## Known weaknesses to fix in redesign

Only full_name shows it's required; 50-state dropdown is a long scroll (no search); validation
only on submit (toast), no inline feedback; back button low-contrast; no "now add a referral?"
follow-up on success.

## Option axes (generate A/B/C per bar)

- **Form layout (Bar C):** A stacked section cards (current) · B single card with section
  dividers · C two-column section layout · D left section-nav + right fields.
- **Required signaling:** clearer required markers + inline validation states.
- **State field:** searchable/typeahead select.
- **Success:** confirmation that offers "Create a referral for {patient}" next.
- **Page title type:** A all-Inter · B editorial serif title.
