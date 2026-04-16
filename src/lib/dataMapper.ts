/**
 * Data Mapper — DiRxctional Platform
 * Handles field-name mismatches between Flask backend and React frontend.
 */

import type { Referral } from "@/types/index";

// ============================================================================
// BACKEND → FRONTEND  (snake_case API response → frontend Referral shape)
// ============================================================================

/**
 * Maps a single referral object returned by the backend into the shape
 * expected by all frontend components.
 *
 * Key transformations:
 *   drug_requested        → drug
 *   preferred_pharmacy_blocked → blocked
 *   patient_dob (alias)   → dob
 */
export function mapReferralFromBackend(raw: Record<string, any>): Referral {
  const {
    drug_requested,
    preferred_pharmacy_blocked,
    patient_dob,
    ...rest
  } = raw;

  return {
    ...rest,
    drug: drug_requested ?? rest.drug ?? "",
    blocked: preferred_pharmacy_blocked ?? rest.blocked ?? false,
    dob: patient_dob ?? rest.dob ?? "",
    patient_dob: patient_dob ?? rest.patient_dob ?? "",
    latest_admin_note_at: raw.latest_admin_note_at ?? null,
    latest_clinic_note_at: raw.latest_clinic_note_at ?? null,
  } as Referral;
}

/** Maps an array of backend referral objects. */
export function mapReferralsFromBackend(items: Record<string, any>[]): Referral[] {
  return (items ?? []).map(mapReferralFromBackend);
}

// ============================================================================
// FRONTEND → BACKEND  (CreateReferral form state → POST /referrals body)
// ============================================================================

interface ManualFormData {
  // Clinical
  diagnosisCode?: string;
  drugRequested?: string;
  dosing?: string;
  quantity?: string;
  isRefill?: boolean;
  therapyType?: string;
  dateTherapyInitiated?: string;
  durationOfTherapy?: string;
  frequency?: string;
  lengthOfTherapy?: string;
  administration?: string;
  administrationLocation?: string;
  // Provider
  providerFirstName?: string;
  providerLastName?: string;
  specialty?: string;
  npi?: string;
  deaNumber?: string;
  providerAddress?: string;
  providerCity?: string;
  providerState?: string;
  providerZip?: string;
  providerPhone?: string;
  providerFax?: string;
  providerEmail?: string;
  officeContact?: string;
  requestor?: string;
  signatureDate?: string;
  // Insurance
  hasInsurance?: boolean;
  primaryInsuranceName?: string;
  primaryMemberId?: string;
  secondaryInsuranceName?: string;
  secondaryMemberId?: string;
  insuranceType?: string;
  insuranceNotes?: string;
  [key: string]: any;
}

/**
 * Converts the camelCase manualData state from CreateReferral into the
 * snake_case extracted_data structure the backend expects.
 */
export function mapManualFormToBackend(data: ManualFormData) {
  return {
    clinical: {
      diagnosis_icd10: data.diagnosisCode ?? "",
      drug_requested: data.drugRequested ?? "",
      dosing: data.dosing ?? "",
      quantity: data.quantity ?? "",
      is_refill: data.isRefill ?? false,
      urgency: "routine",
      therapy_type: data.therapyType ?? "",
      date_therapy_initiated: data.dateTherapyInitiated ?? "",
      duration_of_therapy: data.durationOfTherapy ?? "",
      frequency: data.frequency ?? "",
      length_of_therapy: data.lengthOfTherapy ?? "",
      administration: data.administration ?? "",
      administration_location: data.administrationLocation ?? "",
    },
    provider: {
      name: [data.providerFirstName, data.providerLastName].filter(Boolean).join(" "),
      first_name: data.providerFirstName ?? "",
      last_name: data.providerLastName ?? "",
      specialty: data.specialty ?? "",
      npi: data.npi ?? "",
      dea_number: data.deaNumber ?? "",
      address: data.providerAddress ?? "",
      city: data.providerCity ?? "",
      state: data.providerState ?? "",
      zip: data.providerZip ?? "",
      phone: data.providerPhone ?? "",
      fax: data.providerFax ?? "",
      email: data.providerEmail ?? "",
      office_contact: data.officeContact ?? "",
      requestor: data.requestor ?? "",
      signature_date: data.signatureDate ?? "",
    },
    insurance: {
      has_insurance_card: data.hasInsurance ?? false,
      primary_insurance_name: data.primaryInsuranceName ?? "",
      primary_member_id: data.primaryMemberId ?? "",
      secondary_insurance_name: data.secondaryInsuranceName ?? "",
      secondary_member_id: data.secondaryMemberId ?? "",
      notes: data.insuranceNotes ?? "",
    },
  };
}
