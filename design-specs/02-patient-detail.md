# Spec 02 — Patient Detail

**Component:** `src/pages/clinic/PatientDetail.tsx` · **Route:** `/clinic/patients/:id`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> tab, field, column, or button. Keep all copy verbatim. No new features. Match the real
> component in `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

Shows one patient with their PA status, referral history, profile, and medications. Loads:
`GET /patients/{id}` (profile), `GET /patients/{id}/drugs` (medications), `GET /referrals`
(filtered to this patient). Inline profile edit → `PUT /patients/{id}`.

## Bars

- **Bar A — Back:** ghost "Back to Patients".
- **Bar B — Header:** patient full name (large) + inline "Age {n} | DOB | phone"; right side
  primary button "New Referral for {firstName}".
- **Bar C — Tabs:** **Referral History** · **Patient Information** · **Prior Authorizations**.

### Tab 1 — Referral History
- **PA Status card** (Shield): "Prior Authorization Status / Most recent active medication".
  4-column grid: Current Drug (+dosage) · PA Status (colored badge) · PA Expiration (red if
  expired, amber if ≤30d) · Last Filled. Inline **alert** if expiring soon / expired ("Consider
  creating a new referral" / "A new referral with PA is required"). Empty: "No active
  medications — medications appear here after a referral is approved."
- **Referrals table:** columns Referral ID (mono chip) · Drug · Status (`StatusBadge`) · PA
  Status (`ClinicPABadge`) · Created · Actions (View). Rows clickable → referral detail.
  Empty state: "No referrals for this patient" + Create Referral CTA.

### Tab 2 — Patient Information
- **Edit toggle** (top-right): Edit ↔ Save/Cancel.
- **Read mode** — grouped section cards: Personal Information (Full Name, DOB+age, Gender, Email
  w/ copy) · Contact (Phone w/ copy, Alternate Phone, Street Address, City, State, Zip) ·
  Medical (Height, Weight, Allergies) · Guardian/Authorized Representative (only if present:
  name, phone) · Insurance Information (Insurance Type, Plan Details, PA Status badge, PA
  Expiration).
- **Edit mode** — one card, same four sections as editable fields (full_name, dob date, gender
  select, email, phone_primary, phone_alternate, address, city, state select, zip, height,
  weight, allergies textarea, authorized_representative, …_phone).

### Tab 3 — Prior Authorizations
- **Card grid** (1/2/3 cols) of medications. Each card: Pill icon, drug_name, PA badge (Active /
  Pending / Denied / Expiring Soon / Expired / Discontinued / No PA), "dosage · frequency", "PA
  expires: {date}" + "Last filled: {date}", **View PA Details** button (→ linked referral;
  disabled if none). Discontinued cards are muted. Empty: "No Medications on Record" + Create
  First Referral CTA.

## Option axes (generate A/B/C per bar)

- **Header (Bar B):** A inline facts (current) · B avatar + identity card with insurance + PA at
  a glance · C two-column "demographics | insurance" banner.
- **Navigation (Bar C):** A tabs (current) · B single scroll with sticky section nav · C
  left sub-rail.
- **PA Status card:** A 4-col grid (current) · B a compact "PA health" strip with a colored
  status rail · C timeline of PA expirations.
- **Referral history:** A table (current) · B card/timeline feed.
- **Medications:** A card grid (current) · B dense table with status column.
- **Profile edit:** A read→edit toggle of whole tab (current) · B inline per-field edit
  (pencil per row) · C right-side edit drawer.
- **Page title type:** A all-Inter · B editorial serif name.
