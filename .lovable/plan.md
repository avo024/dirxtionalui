

## Expanded Extracted Data Fields — Admin Review

This is a significant expansion of the right panel in AdminReferralReview.tsx (lines 248–377). The existing `FieldEdit` component and `updateField`/`handleSaveSectionChanges` logic remain unchanged — we're replacing the accordion content with the new field layouts and adding new sections.

### Changes

**1. Update `src/types/index.ts`** — Expand interfaces to match new backend fields

- `ExtractedPatient`: Add `phone_primary`, `phone_secondary`, `middle_initial`, `mrn`, `language`, `preferred_contact_method`, `guardian` (nested: `name`, `relationship`, `phone`)
- `ExtractedClinical`: Add `brand_name`, `generic_name`, `diagnosis_icd10_primary`, `diagnosis_description`, `diagnoses` (string[]), `dosing_directions`, `dose_amount`, `dose_frequency`, `route`, `day_supply`, `refills`, `device_type`, `is_new_start`, `loading_dose`, `maintenance_dose`, `prior_failed_medications` (string[]), `clinical_justification`
- `ExtractedProvider`: Add `office_name`, `office_address`, `office_city`, `office_state`, `office_zip`, `collaborating_physician`, `collaborating_npi`, `tax_id`
- `ExtractedInsurance`: Add `has_insurance`, `primary_plan_name`, `primary_group_number`, `primary_policy_id`, `primary_rxbin`, `primary_rxpcn`, `primary_carrier_phone`, `secondary_group_number`, `policyholder_name`, `policyholder_relationship`, `pharmacy_benefit_or_medical_benefit`
- `ExtractedPriorAuth`: Add `pa_number`, `reference_number`, `submission_date`, `expiration_date`, `status`, `handled_by_clinic`
- Add new interfaces: `ExtractedPharmacy`, `ExtractedDermatology`
- Update `ExtractedData` to include `pharmacy`, `dermatology` (optional), and move confidence to `meta.confidence`

**2. Create `src/components/TagListEditor.tsx`** — Reusable chip/tag list component

- Renders an array of strings as Badge chips with X buttons to remove
- Small input + "Add" button to append new items
- Used for: diagnoses, prior_failed_medications, affected_body_areas, prior_topicals_tried, prior_systemics_tried

**3. Rewrite accordion sections in `src/pages/admin/AdminReferralReview.tsx`**

Replace lines 249–369 with expanded sections. Key changes per section:

- **Patient**: Add middle_initial, phone_primary/phone_secondary (with fallback to `phone`), mrn, language, preferred_contact_method. Add collapsible Guardian subsection (shown only if guardian.name exists). Use 3-col grid for name row, 2-col for most others.

- **Provider**: Rename fields to match new paths (`office_name`, `office_address`, etc.), add `collaborating_physician`, `collaborating_npi`, `tax_id`. Remove old `dea_number`, `office_contact`, `requestor`.

- **Clinical**: Major expansion. Drug Requested prominent at top. Add brand_name/generic_name, diagnosis_icd10_primary (with fallback to diagnosis_icd10), diagnosis_description, dosing_directions (textarea), dose_amount/dose_frequency/route, day_supply/refills, device_type, is_new_start checkbox, loading_dose/maintenance_dose. Add TagListEditor for `diagnoses` and `prior_failed_medications`. Add clinical_justification textarea.

- **Insurance**: Replace simple boolean+notes with full form. `has_insurance` checkbox (fallback to `has_insurance_card`). Primary subsection with plan_name (fallback to `primary_insurance_name`), member_id, group_number, policy_id, rxbin, rxpcn, carrier_phone. Collapsible Secondary subsection. Policyholder fields. Benefit type dropdown.

- **Prior Authorization** (new section): required checkbox, pa_number, reference_number, submission/expiration dates, status dropdown, handled_by_clinic checkbox (fallback to `handled_by_us`).

- **Pharmacy** (new section): preferred_pharmacy_name, phone, fax.

- **Dermatology** (new section, conditional): Only render if `editedData?.dermatology` exists. BSA%, IGA, EASI, PASI scores in 4-col grid. POEM, Itch NRS in 2-col. Condition severity. TagListEditors for affected_body_areas, prior_topicals_tried, prior_systemics_tried. Phototherapy checkbox. Date of diagnosis. Labeled "(for PA documentation)".

**4. Update confidence lookup**

Change `conf` from `data?.confidence` to `data?.meta?.confidence || data?.confidence || {}` for backwards compatibility. ConfidenceIndicator already handles the display — just need to pass the right keys (e.g., `conf["patient.first_name"]` using dot-notation).

**5. Update `updateField` to handle nested objects and arrays**

- Add `updateNestedField(section, subsection, field, value)` for guardian fields
- Add `updateArrayField(section, field, items)` for tag lists
- Both mark the parent section as changed

**6. Default accordion values**

Expand by default: patient, clinical, insurance. Collapsed by default: provider, prior_auth, pharmacy, dermatology.

### Backwards compatibility handled via fallbacks
- `patient.phone_primary || patient.phone`
- `clinical.diagnosis_icd10_primary || clinical.diagnosis_icd10`
- `insurance.has_insurance ?? insurance.has_insurance_card`
- `insurance.primary_plan_name || insurance.primary_insurance_name`
- `prior_auth.handled_by_clinic ?? prior_auth.handled_by_us`
- `data?.meta?.confidence || data?.confidence`

### Files modified
1. `src/types/index.ts` — Expand interfaces
2. `src/components/TagListEditor.tsx` — New component
3. `src/pages/admin/AdminReferralReview.tsx` — Rewrite accordion sections, update helpers

