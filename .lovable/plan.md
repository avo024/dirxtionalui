

# DiRxctional Platform — Comprehensive Data Mapping Document

## 1. CLINIC-SIDE DATA MODELS

### Core TypeScript Interfaces (from `src/data/mockData.ts`)

**Referral**
```text
interface Referral {
  id: string
  patient_name: string
  patient_dob: string
  patient_phone: string
  patient_email: string
  clinic_name: string
  drug: string                          // ⚠️ Frontend alias for drug_requested
  status: ReferralStatus                // "uploaded"|"processing"|"approved"|"rejected"|"sent_to_pharmacy"
  created_at: string
  updated_at: string
  pharmacy_name: string
  pharmacy_location: string
  pharmacy_contact: string
  rejection_reason?: string
  extracted_data: ExtractedData
  documents: ReferralDocument[]
  history: HistoryEntry[]
  pa_required: boolean
  pa_status: "denied"|"approved"|"sent_to_pharmacy"|"pending"|null
  pa_required_reason: string
  pa_expiration_date: string|null
}
```

**Patient**
```text
interface Patient {
  id: string
  first_name: string
  last_name: string
  dob: string
  gender: string
  phone: string
  email: string
  last_drug: string
  last_dosage: string
  last_referral_date: string
  pa_status: "active"|"expiring"|"expired"|"none"
  pa_expiration_date: string
  referral_count: number
  insurance_type: string
  insurance_notes: string
}
```

**PatientDrug**
```text
interface PatientDrug {
  id: string
  patient_id: string
  drug_name: string
  dosage: string
  frequency: string
  is_active: boolean
  pa_status: "approved"|"pending"|null
  pa_expiration_date: string|null
  created_at: string
  last_filled: string|null
}
```

**ExtractedData** (nested inside Referral)
```text
interface ExtractedData {
  patient: ExtractedPatient       // first_name, last_name, mi, dob, gender, phone, email,
                                  // address, city, state, zip, height, weight, allergies,
                                  // authorized_representative, authorized_representative_phone
  clinical: ExtractedClinical     // diagnosis_icd10, drug_requested, dosing, quantity, is_refill,
                                  // urgency, therapy_type, date_therapy_initiated, duration_of_therapy,
                                  // frequency, length_of_therapy, administration, administration_location
  provider: ExtractedProvider     // name, first_name, last_name, specialty, npi, dea_number,
                                  // address, city, state, zip, phone, fax, email, office_contact,
                                  // requestor, signature_date
  insurance: ExtractedInsurance   // has_insurance_card, primary_insurance_name, primary_member_id,
                                  // secondary_insurance_name, secondary_member_id, notes
  prior_auth: ExtractedPriorAuth  // required, handled_by_us
  confidence: Record<string, number>
}
```

**ReferralDocument**
```text
interface ReferralDocument {
  id: string
  name: string
  type: string       // "referral_form"|"demographics"|"insurance_front"|"insurance_back"|"chart_notes"
  uploaded_at: string
}
```

**HistoryEntry**
```text
interface HistoryEntry {
  id: string
  status: ReferralStatus
  timestamp: string      // ISO datetime
  note: string
  user: string
}
```

**Pharmacy**
```text
interface Pharmacy {
  id: string
  name: string
  contact_email: string
  phone: string
  address: string
  fax?: string
  status: "active"|"inactive"
  insurance_compatibility: string[]
}
```

---

## 2. CLINIC WORKFLOW

### Pages in `/pages/clinic/`

| Page | Route | Data Source | Purpose |
|------|-------|-------------|---------|
| ClinicDashboard | `/clinic/dashboard` | mockReferrals, mockPatients | Stats, alerts, recent referrals |
| PatientsList | `/clinic/patients` | mockPatients | Search/filter patients |
| PatientDetail | `/clinic/patients/:id` | mockPatients, mockReferrals, mockPatientDrugs | Patient profile w/ tabs |
| CreateReferral | `/clinic/referrals/new` | mockPatients (local) | 3-step wizard |
| ReferralsList | `/clinic/referrals` | mockReferrals | Filter/search referrals |
| ReferralDetail | `/clinic/referrals/:id` | mockReferrals | View referral detail |
| ClinicSettings | `/clinic/settings` | — | Settings page |

### Referral Creation Flow (3 steps)

**Step 1 — Select Patient:** Choose existing (search by name/DOB/phone) or create new (firstName, lastName, dob, phone).

**Step 2 — Referral Method:** Upload documents OR manual entry.

Manual entry fields collected (from `manualData` state):
```text
Clinical:        diagnosisCode, drugRequested, dosing, quantity, isRefill, therapyType,
                 dateTherapyInitiated, durationOfTherapy, frequency, lengthOfTherapy,
                 administration, administrationLocation
Prescriber:      providerFirstName, providerLastName, specialty, npi, deaNumber,
                 providerAddress, providerCity, providerState, providerZip,
                 providerPhone, providerFax, providerEmail, officeContact, requestor, signatureDate
Insurance:       hasInsurance, primaryInsuranceName, primaryMemberId,
                 secondaryInsuranceName, secondaryMemberId, insuranceType, insuranceNotes
```

**Step 3 — Review & Submit:** Confirm accuracy checkbox, then submit.

**Note:** CreateReferral currently uses `mockPatients` for patient search and does a simulated submit (no real API call yet — `handleSubmit` is a `setTimeout`).

### How Clinic Tracks Referrals

- **Dashboard:** Shows 4 stats (In Review, Approved, Sent, Needs Attention) + alert banners for PA expiring and rejected referrals + table of top 5 sorted by urgency.
- **ReferralsList:** Filters by status (All, In Review, Approved, Needs Attention, Sent), search by patient/drug/ID.
- **ReferralDetail:** Tabs: Overview (patient/clinical/provider info from extracted_data), Documents, History (timeline), Notes (local-only).
- **PatientDetail:** Referral History tab, Medications tab (PatientDrug with PA badges), Documents tab.

---

## 3. ADMIN vs CLINIC DIFFERENCES

### Data Admin Sees That Clinic Doesn't

| Data | Admin | Clinic |
|------|-------|--------|
| PA Status column in table | Yes (PAStatusCell) | No |
| Confidence scores on fields | Yes (ConfidenceIndicator) | No |
| Editable extracted_data fields | Yes (inline edit) | No (read-only) |
| Clinic name column | Yes (showClinic flag) | No |
| Blocked referrals | Yes (dedicated page) | No |
| All clinics' referrals | Yes | Only own clinic |

### Actions Admin Can Take

| Action | API Call | Clinic? |
|--------|----------|---------|
| Approve referral | `POST /admin/referrals/:id/decision {decision:"approve"}` | No |
| Reject referral | `POST /admin/referrals/:id/decision {decision:"reject", reason}` | No |
| Process with AI | `POST /admin/referrals/:id/process` | No |
| Edit extracted data | `PUT /admin/referrals/:id/extracted-data` | No |
| Preview/generate PDF | `GET /admin/referrals/:id/pdf` | No |
| Submit PA | `POST /admin/referrals/:id/pa/submit` | No |
| Record PA decision | `POST /admin/referrals/:id/pa/decision` | No |
| Reassign pharmacy | `POST /admin/referrals/:id/reassign-pharmacy` | No |

### Status Badge Differences

| Internal Status | Clinic Label | Admin Label |
|----------------|--------------|-------------|
| uploaded | Received | Received |
| processing | In Review | Needs Review |
| approved | Approved | Approved |
| sent_to_pharmacy | Sent to Pharmacy | Sent to Pharmacy |
| rejected | Needs Attention | Rejected |

---

## 4. API EXPECTATIONS

### Clinic-Side API Calls (from `src/lib/api.ts`)

| Endpoint | Method | Used By | Expected Response |
|----------|--------|---------|-------------------|
| `GET /referrals` | GET | clinicApi.getReferrals() | `{ items: Referral[] }` (not yet wired — clinic pages still use mockData) |
| `GET /referrals/:id` | GET | clinicApi.getReferral(id) | Single Referral object (not yet wired) |
| `POST /referrals` | POST | clinicApi.createReferral(data) | `{ id, status, ... }` (not yet wired) |
| `POST /referrals/:id/documents` | POST (multipart) | clinicApi.uploadDocument() | `{ id, name, type, uploaded_at }` (not yet wired) |
| `GET /patients` | GET | patientApi.getPatients() | `{ items: Patient[] }` (not yet wired) |
| `GET /patients/:id` | GET | patientApi.getPatient(id) | Single Patient object (not yet wired) |

### Admin-Side API Calls (LIVE — already wired)

| Endpoint | Method | Used By | Expected Response |
|----------|--------|---------|-------------------|
| `GET /admin/referrals` | GET | AdminReferralsList | `{ items: [{...backend referral}] }` |
| `GET /admin/referrals/:id` | GET | AdminReferralReview | Single referral with extracted_data |
| `POST /admin/referrals/:id/process` | POST | AdminReferralReview | `{ status, message }` |
| `POST /admin/referrals/:id/decision` | POST | AdminReferralReview | `{ status, message }` |
| `GET /admin/referrals/:id/pdf?preview=true` | GET | AdminReferralReview | Blob (PDF) |
| `PUT /admin/referrals/:id/extracted-data` | PUT | AdminReferralReview | Updated referral |
| `POST /admin/referrals/:id/pa/submit` | POST | PAManagementCard | `{ pa_status }` |
| `POST /admin/referrals/:id/pa/decision` | POST | PAManagementCard | `{ pa_status }` |
| `GET /admin/referrals/blocked` | GET | BlockedReferrals | `{ items: [...] }` |
| `POST /admin/referrals/:id/reassign-pharmacy` | POST | ReassignPharmacyModal | `{ pharmacy_id }` |
| `GET /pharmacies` | GET | PharmaciesList | `{ items: Pharmacy[] }` |
| `GET /pharmacies/:id` | GET | PharmacyDetail | Single Pharmacy |
| `POST /pharmacies` | POST | PharmaciesList | Created Pharmacy |
| `PUT /pharmacies/:id` | PUT | PharmacyDetail | Updated Pharmacy |

**Important:** Clinic pages (`ClinicDashboard`, `ReferralsList`, `PatientsList`, `PatientDetail`, `ReferralDetail`, `CreateReferral`) are ALL still reading from **mock data** (`mockReferrals`, `mockPatients`, `mockPatientDrugs`). They need to be wired to the API.

---

## 5. BACKEND FIELD MAPPING TABLE

### Top-Level Referral Fields

| Frontend Field | Backend Field (expected) | Transform | Notes |
|---------------|------------------------|-----------|-------|
| `ref.id` | `id` | — | Match |
| `ref.patient_name` | `patient_name` | — | Match |
| `ref.patient_dob` | `patient_dob` | — | Match |
| `ref.patient_phone` | `patient_phone` | — | Match |
| `ref.patient_email` | `patient_email` | — | Match |
| `ref.clinic_name` | `clinic_name` | — | Match |
| **`ref.drug`** | **`drug_requested`** | **`mapped.drug = r.drug_requested`** | **Mismatch — mapped in AdminReferralsList & AdminReferralReview** |
| `ref.status` | `status` | — | Match. Values: uploaded, processing, approved, rejected, sent_to_pharmacy |
| `ref.created_at` | `created_at` | — | Match |
| `ref.updated_at` | `updated_at` | — | Match |
| `ref.pharmacy_name` | `pharmacy_name` | — | Match |
| `ref.pharmacy_location` | `pharmacy_location` | — | Match |
| `ref.pharmacy_contact` | `pharmacy_contact` | — | Match |
| `ref.rejection_reason` | `rejection_reason` | — | Match |
| **`ref.blocked`** | **`preferred_pharmacy_blocked`** | **`mapped.blocked = r.preferred_pharmacy_blocked`** | **Mismatch — mapped in AdminReferralsList & AdminReferralReview** |
| **`ref.dob`** | **`patient_dob`** | **`mapped.dob = r.patient_dob`** | **Mismatch — mapped in AdminReferralsList (alias)** |
| `ref.pa_required` | `pa_required` | — | Match (boolean) |
| `ref.pa_status` | `pa_status` | — | Match. Values: approved, denied, sent_to_pharmacy, pending, null |
| `ref.pa_required_reason` | `pa_required_reason` | — | Match |
| `ref.pa_expiration_date` | `pa_expiration_date` | — | Match (string or null) |
| `ref.extracted_data` | `extracted_data` | — | Match (nested JSON) |
| `ref.documents` | `documents` | — | Match (array) |
| `ref.history` | `history` | — | Match (array) |

### ExtractedData → Patient Fields

| Frontend Path | Backend Path | Notes |
|--------------|-------------|-------|
| `extracted_data.patient.first_name` | `extracted_data.patient.first_name` | Match |
| `extracted_data.patient.last_name` | `extracted_data.patient.last_name` | Match |
| `extracted_data.patient.mi` | `extracted_data.patient.mi` | Optional |
| `extracted_data.patient.dob` | `extracted_data.patient.dob` | Match |
| `extracted_data.patient.gender` | `extracted_data.patient.gender` | Match |
| `extracted_data.patient.phone` | `extracted_data.patient.phone` | Match |
| `extracted_data.patient.email` | `extracted_data.patient.email` | Match |
| `extracted_data.patient.address` | `extracted_data.patient.address` | Optional |
| `extracted_data.patient.city` | `extracted_data.patient.city` | Optional |
| `extracted_data.patient.state` | `extracted_data.patient.state` | Optional |
| `extracted_data.patient.zip` | `extracted_data.patient.zip` | Optional |
| `extracted_data.patient.height` | `extracted_data.patient.height` | Optional |
| `extracted_data.patient.weight` | `extracted_data.patient.weight` | Optional |
| `extracted_data.patient.allergies` | `extracted_data.patient.allergies` | Optional |
| `extracted_data.patient.authorized_representative` | `extracted_data.patient.authorized_representative` | Optional |
| `extracted_data.patient.authorized_representative_phone` | `extracted_data.patient.authorized_representative_phone` | Optional |

### ExtractedData → Clinical Fields

| Frontend Path | Backend Path | Notes |
|--------------|-------------|-------|
| `extracted_data.clinical.diagnosis_icd10` | `extracted_data.clinical.diagnosis_icd10` | Match |
| `extracted_data.clinical.drug_requested` | `extracted_data.clinical.drug_requested` | Match |
| `extracted_data.clinical.dosing` | `extracted_data.clinical.dosing` | Match |
| `extracted_data.clinical.quantity` | `extracted_data.clinical.quantity` | Match |
| `extracted_data.clinical.is_refill` | `extracted_data.clinical.is_refill` | Boolean |
| `extracted_data.clinical.urgency` | `extracted_data.clinical.urgency` | Match |
| `extracted_data.clinical.therapy_type` | `extracted_data.clinical.therapy_type` | Optional |
| `extracted_data.clinical.date_therapy_initiated` | `extracted_data.clinical.date_therapy_initiated` | Optional |
| `extracted_data.clinical.duration_of_therapy` | `extracted_data.clinical.duration_of_therapy` | Optional |
| `extracted_data.clinical.frequency` | `extracted_data.clinical.frequency` | Optional |
| `extracted_data.clinical.length_of_therapy` | `extracted_data.clinical.length_of_therapy` | Optional |
| `extracted_data.clinical.administration` | `extracted_data.clinical.administration` | Optional |
| `extracted_data.clinical.administration_location` | `extracted_data.clinical.administration_location` | Optional |

### ExtractedData → Provider Fields

| Frontend Path | Backend Path | Notes |
|--------------|-------------|-------|
| `extracted_data.provider.name` | `extracted_data.provider.name` | Full name (legacy) |
| `extracted_data.provider.first_name` | `extracted_data.provider.first_name` | Optional |
| `extracted_data.provider.last_name` | `extracted_data.provider.last_name` | Optional |
| `extracted_data.provider.specialty` | `extracted_data.provider.specialty` | Optional |
| `extracted_data.provider.npi` | `extracted_data.provider.npi` | Match |
| `extracted_data.provider.dea_number` | `extracted_data.provider.dea_number` | Optional |
| `extracted_data.provider.address` | `extracted_data.provider.address` | Match |
| `extracted_data.provider.city` | `extracted_data.provider.city` | Optional |
| `extracted_data.provider.state` | `extracted_data.provider.state` | Optional |
| `extracted_data.provider.zip` | `extracted_data.provider.zip` | Optional |
| `extracted_data.provider.phone` | `extracted_data.provider.phone` | Match |
| `extracted_data.provider.fax` | `extracted_data.provider.fax` | Optional |
| `extracted_data.provider.email` | `extracted_data.provider.email` | Optional |
| `extracted_data.provider.office_contact` | `extracted_data.provider.office_contact` | Optional |
| `extracted_data.provider.requestor` | `extracted_data.provider.requestor` | Optional |
| `extracted_data.provider.signature_date` | `extracted_data.provider.signature_date` | Match |

### ExtractedData → Insurance Fields

| Frontend Path | Backend Path | Notes |
|--------------|-------------|-------|
| `extracted_data.insurance.has_insurance_card` | `extracted_data.insurance.has_insurance_card` | Boolean |
| `extracted_data.insurance.primary_insurance_name` | `extracted_data.insurance.primary_insurance_name` | Optional |
| `extracted_data.insurance.primary_member_id` | `extracted_data.insurance.primary_member_id` | Optional |
| `extracted_data.insurance.secondary_insurance_name` | `extracted_data.insurance.secondary_insurance_name` | Optional |
| `extracted_data.insurance.secondary_member_id` | `extracted_data.insurance.secondary_member_id` | Optional |
| `extracted_data.insurance.notes` | `extracted_data.insurance.notes` | Match |

### Patient Endpoint Fields

| Frontend Field | Backend Field | Notes |
|---------------|-------------|-------|
| `patient.id` | `id` | Match |
| `patient.first_name` | `first_name` | Match |
| `patient.last_name` | `last_name` | Match |
| `patient.dob` | `dob` | Match |
| `patient.gender` | `gender` | Match |
| `patient.phone` | `phone` | Match |
| `patient.email` | `email` | Match |
| `patient.last_drug` | `last_drug` | Match |
| `patient.last_dosage` | `last_dosage` | Match |
| `patient.last_referral_date` | `last_referral_date` | Match |
| `patient.pa_status` | `pa_status` | Values: active, expiring, expired, none |
| `patient.pa_expiration_date` | `pa_expiration_date` | Match |
| `patient.referral_count` | `referral_count` | Match |
| `patient.insurance_type` | `insurance_type` | Match |
| `patient.insurance_notes` | `insurance_notes` | Match |

### PatientDrug Endpoint Fields

| Frontend Field | Backend Field | Notes |
|---------------|-------------|-------|
| `drug.id` | `id` | Match |
| `drug.patient_id` | `patient_id` | Match |
| `drug.drug_name` | `drug_name` | Match |
| `drug.dosage` | `dosage` | Match |
| `drug.frequency` | `frequency` | Match |
| `drug.is_active` | `is_active` | Boolean |
| `drug.pa_status` | `pa_status` | Values: approved, pending, null |
| `drug.pa_expiration_date` | `pa_expiration_date` | Nullable |
| `drug.created_at` | `created_at` | Match |
| `drug.last_filled` | `last_filled` | Nullable |

### CreateReferral Manual Entry → Backend POST Body Mapping

This is the **biggest mismatch** — the frontend form uses camelCase state keys that must be mapped to the backend's snake_case extracted_data structure:

| Frontend Form Key | Backend Payload Path | Notes |
|------------------|---------------------|-------|
| `selectedPatient.id` OR `newPatient.*` | `patient_id` OR inline patient data | Needs mapper |
| `manualData.drugRequested` | `extracted_data.clinical.drug_requested` | camelCase → snake_case |
| `manualData.diagnosisCode` | `extracted_data.clinical.diagnosis_icd10` | Name mismatch |
| `manualData.dosing` | `extracted_data.clinical.dosing` | Match |
| `manualData.quantity` | `extracted_data.clinical.quantity` | Match |
| `manualData.isRefill` | `extracted_data.clinical.is_refill` | camelCase → snake_case |
| `manualData.therapyType` | `extracted_data.clinical.therapy_type` | camelCase → snake_case |
| `manualData.dateTherapyInitiated` | `extracted_data.clinical.date_therapy_initiated` | camelCase → snake_case |
| `manualData.durationOfTherapy` | `extracted_data.clinical.duration_of_therapy` | camelCase → snake_case |
| `manualData.frequency` | `extracted_data.clinical.frequency` | Match |
| `manualData.lengthOfTherapy` | `extracted_data.clinical.length_of_therapy` | camelCase → snake_case |
| `manualData.administration` | `extracted_data.clinical.administration` | Match |
| `manualData.administrationLocation` | `extracted_data.clinical.administration_location` | camelCase → snake_case |
| `manualData.providerFirstName` | `extracted_data.provider.first_name` | camelCase → snake_case |
| `manualData.providerLastName` | `extracted_data.provider.last_name` | camelCase → snake_case |
| `manualData.specialty` | `extracted_data.provider.specialty` | Match |
| `manualData.npi` | `extracted_data.provider.npi` | Match |
| `manualData.deaNumber` | `extracted_data.provider.dea_number` | camelCase → snake_case |
| `manualData.providerAddress` | `extracted_data.provider.address` | Rename |
| `manualData.providerCity` | `extracted_data.provider.city` | Rename |
| `manualData.providerState` | `extracted_data.provider.state` | Rename |
| `manualData.providerZip` | `extracted_data.provider.zip` | Rename |
| `manualData.providerPhone` | `extracted_data.provider.phone` | Rename |
| `manualData.providerFax` | `extracted_data.provider.fax` | Rename |
| `manualData.providerEmail` | `extracted_data.provider.email` | Rename |
| `manualData.officeContact` | `extracted_data.provider.office_contact` | camelCase → snake_case |
| `manualData.requestor` | `extracted_data.provider.requestor` | Match |
| `manualData.signatureDate` | `extracted_data.provider.signature_date` | camelCase → snake_case |
| `manualData.hasInsurance` | `extracted_data.insurance.has_insurance_card` | Name mismatch |
| `manualData.primaryInsuranceName` | `extracted_data.insurance.primary_insurance_name` | camelCase → snake_case |
| `manualData.primaryMemberId` | `extracted_data.insurance.primary_member_id` | camelCase → snake_case |
| `manualData.secondaryInsuranceName` | `extracted_data.insurance.secondary_insurance_name` | camelCase → snake_case |
| `manualData.secondaryMemberId` | `extracted_data.insurance.secondary_member_id` | camelCase → snake_case |
| `manualData.insuranceType` | `extracted_data.insurance.insurance_type` (?) | Not in ExtractedInsurance — may need backend addition |
| `manualData.insuranceNotes` | `extracted_data.insurance.notes` | Name mismatch |
| Upload files | `POST /referrals/:id/documents` (multipart) | Separate call after create |

### Summary of Critical Mismatches to Fix

1. **`drug` vs `drug_requested`** — Mapped in admin pages but clinic pages read from mock `drug` field directly. Backend must return `drug_requested`.
2. **`blocked` vs `preferred_pharmacy_blocked`** — Admin-only mapped alias.
3. **`dob` alias vs `patient_dob`** — Admin list maps this; clinic pages read mock data directly.
4. **CreateReferral form keys are ALL camelCase** — Need a mapper function to convert to backend's snake_case `extracted_data` structure before POST.
5. **`manualData.diagnosisCode` → `diagnosis_icd10`** — Name mismatch beyond just casing.
6. **`manualData.hasInsurance` → `has_insurance_card`** — Name mismatch.
7. **`manualData.insuranceNotes` → `notes`** — Name mismatch (path: `insurance.notes`).
8. **`manualData.insuranceType`** — Not present in `ExtractedInsurance` interface; either add to backend or drop.
9. **Clinic pages not wired to API** — All 6 clinic pages still read from mock data imports. Need to convert to `useEffect` + API calls like admin pages do.
10. **`ReferralFormData` in `src/types/referralForm.ts`** — This is an **older/unused** interface; the actual CreateReferral page uses its own inline `manualData` state. This file can be ignored or removed.

