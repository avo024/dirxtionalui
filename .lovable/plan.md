

## Add 5 Missing Clinical Fields

### Files to edit

**1. `src/types/index.ts`** — Add to `ExtractedClinical` interface:
- `ship_to?: string`
- `loading_dose_received?: boolean`
- `loading_dose_start_date?: string`
- `tb_ruled_out?: boolean`
- `tb_test_date?: string`

**2. `src/pages/admin/AdminReferralReview.tsx`** — Add fields to the Clinical accordion section, after the existing Loading Dose / Maintenance Dose row:

- **Ship To** dropdown (full width): options "Patient's Home", "Doctor's Office", "Other"
- **Loading Dose Received?** checkbox + **Loading Dose Start Date** date input (2 columns, date only visible when checkbox is true)
- **TB Ruled Out?** checkbox + **TB Test Date** date input (2 columns, date only visible when checkbox is true)

These go before the Prior Failed Medications TagListEditor, using the existing `updateField("clinical", ...)` pattern. Checkboxes use the same Checkbox + Label pattern already used for `is_new_start` and `is_refill`.

