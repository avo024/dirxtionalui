# Spec 01 — New Referral wizard

**Component:** `src/pages/clinic/CreateReferral.tsx` · **Route:** `/clinic/referrals/new`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> step, field, option, or button. Keep all copy verbatim. No new features. Match the real
> component in `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

A clinic user creates a referral in **4 steps**. On submit it: creates the patient (if new) →
`POST /patients`, creates the referral → `POST /referrals`, uploads each file →
`POST /referrals/{id}/documents`, then triggers AI extraction → `POST /referrals/{id}/finalize`.
The admin team reviews after. Backend treats a combined upload as a `packet` doc_type that
satisfies the whole document checklist.

**How extraction actually works (design implication):** the AI pipeline OCRs *every* uploaded
file, concatenates all the text, and extracts fields **by content** — it does NOT rely on the
clinic labeling files. So document categorization is **optional/organizational, never required**
for the system to work. Design the upload step for **lowest friction**: drop everything, no
mandatory tagging. Never imply the UI auto-detects a file's type from its filename.

## Persistent chrome (all steps)

- **Bar A — Page header:** `New Referral` + subtitle "Quick 4-step process to submit a referral."
- **Bar B — Progress + stepper:** a progress bar ("Step X of 4: {label}" + %), then a 4-dot
  stepper: ① Select Patient ② Referral Method ③ Choose Pharmacy ④ Review & Submit. Completed
  dots show a check and are clickable to go back; current dot is ringed; future dots disabled.
- **Bar C — Sticky selected-patient banner** (steps 2+): icon + name + "DOB · phone".
- **Bar D — Footer nav:** Back/Cancel (left) · contextual Next / "Submit Referral" (right,
  validation-gated; Submit is green).

## Step 1 — Select Patient

- **Bar:** search input ("Search by name, DOB, or phone…") + **Add New Patient** button (opens
  `NewPatientModal`).
- Live results list (debounced): each row = name + "DOB · Last: {drug}".
- **Selected-patient card:** name, "DOB · Phone", last drug + dosage, **PAStatusBadge**, clear (×).
- **Empty state:** dashed box, Users icon, "Search above or add a new patient to continue."

## Step 2 — Referral Method (a fork)

- **2.0 Method choice:** two big selectable cards —
  - **Upload Documents** (badge "Recommended"): bullet checks "Faster (AI does the work) /
    More accurate / Less typing."
  - **Manual Entry:** "Type in the information yourself" + "Use this if you don't have documents
    ready."
- **2A — Upload path:** three **UploadZones**, each drag-drop + file chips with remove:
  - *Referral Form / Prescription* (PDF, JPG, PNG)
  - *Insurance Cards* ("Front & back — upload both as separate files (optional if no insurance)")
  - *Chart Notes, Lab Results, Other* (optional)
  - Then: **"Manual entry only — no documents available"** checkbox (only when 0 files), the
    **Bridge program? Yes/No** block, and two notice strips (Sparkles AI-extraction; "Our team
    will handle the PA and process").
- **2B — Manual path:** three **accordions** —
  - *Medication / Medical Information*: Drug Requested (DrugCombobox, required), Diagnosis ICD-10
    (required), Therapy Type (New/Renewal/Step Therapy), Date Therapy Initiated (if renewal),
    Duration, Dose/Strength, Frequency, Quantity, Length of Therapy/#Refills, Administration,
    Administration Location, Refill? (switch).
  - *Prescriber Information*: First, Last, Specialty, NPI (10 digits), DEA, Address, City, State,
    Zip, Phone, Fax, Email, Office Contact, Requestor, Signature Date.
  - *Insurance Information* (`*`): the same **Bridge Yes/No** block; if "No bridge" → Payer,
    Member ID, Group ID, Secondary name, Secondary ID, Insurance Type. If "bridge" → "Bridge
    program — manufacturer-funded. No insurance fields needed."
  - + PA notice strip.

**Bridge block copy (verbatim):** heading "Bridge program? *", helper "Is this referral being
routed through a manufacturer-funded bridge program (e.g., Dupixent MyWay, Humira Complete)?",
options "No bridge program / Standard insurance billing" and "Yes, bridge program /
Manufacturer-funded — insurance not used."

## Step 3 — Choose Pharmacy

- **Bar:** "Select pharmacy for this referral" + "Defaults to your clinic's preferred pharmacy.
  Change if this referral needs a different one."
- **Pharmacy select = a searchable DROPDOWN** (not a card list — clinics have many pharmacies).
  Clinic default is **pre-selected** and labeled "Default"; user can search/change. Helper
  "Default pharmacy for your clinic — change if needed."
- Warning strip if clinic has no default; loading spinner; empty state ("No pharmacies
  available for your clinic. Contact DiRxctional support.").

## Step 4 — Review & Submit

- **Review cards:** Patient (Name, DOB) · Pharmacy (name, city/state, Default badge) · Insurance
  (bridge → "Bridge program — manufacturer-funded"; upload → "extracted from documents"; manual →
  Payer + Member ID) · Documents Uploaded (list with check + size).
- Two notice strips (AI extraction; "Our team will handle the prior authorization process").
- **Confirm checkbox:** "I confirm all information is accurate and complete." (gates Submit).
- **Success state:** green check, "We'll Take It From Here!", REF-id chip, actions: Back to
  Dashboard / View Referrals / Create Another.

## Option axes (generate A/B/C per bar)

- **Stepper (Bar B):** A horizontal dots (current) · B left vertical rail · C slim segmented bar.
- **Method fork:** A two big cards (current) · B Upload primary + small "enter manually instead"
  link · C segmented toggle.
- **Upload zones:** the app categorizes documents by **user intent (which zone / which tag they
  choose), never by guessing from the filename** — clinics scan to generic names like
  `scan001.pdf`, so filename-based auto-sorting is forbidden (it misfiles). Options:
  - A — three labeled dashed zones (current): user categorizes by choosing the zone.
  - B — one dropzone + per-file chips with an **optional** type selector that defaults to
    "Supporting document" (Insurance / Referral form set only if the user wants; never required).
  - C — **packet-first**: a prominent "This is one combined packet" toggle → no per-file tagging;
    maps to the `packet` doc type that satisfies the whole checklist. The honest path for clinics
    with a single all-in-one scan.
- **Manual entry:** A accordions (current) · B single scroll with sticky section headers · C tabs.
- **Page width/layout:** A centered single column (`max-w-3xl`, current) · B two-column with a
  persistent right-rail live summary that fills in as you go.
- **Page title type:** A all-Inter · B editorial serif title.
