/**
 * Shared TypeScript Types — Dirxctional Platform
 * Single source of truth for all data models
 */

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================

export type ReferralStatus =
  | "uploaded"
  | "processing"
  | "ready_for_review"
  | "approved"
  | "approved_to_send"
  | "rejected"
  | "sent_to_pharmacy";

export type PAStatus = "active" | "expiring" | "expired" | "none";

export type DrugPAStatus = "approved" | "pending" | null;

export type ReferralPAStatus =
  | "not_required"
  | "required_processing"
  | "required_submitted"
  | "required_approved"
  | "required_denied";

// ============================================================================
// EXTRACTED DATA (nested inside Referral)
// ============================================================================

export interface ExtractedPatientGuardian {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface ExtractedPatient {
  first_name: string;
  last_name: string;
  mi?: string;
  middle_initial?: string;
  dob: string;
  gender: string;
  phone: string;
  phone_primary?: string;
  phone_secondary?: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  height?: string;
  weight?: string;
  allergies?: string;
  mrn?: string;
  language?: string;
  preferred_contact_method?: string;
  authorized_representative?: string;
  authorized_representative_phone?: string;
  guardian?: ExtractedPatientGuardian;
}

export interface ExtractedClinical {
  diagnosis_icd10: string;
  diagnosis_icd10_primary?: string;
  diagnosis_description?: string;
  diagnoses?: string[];
  drug_requested: string;
  brand_name?: string;
  generic_name?: string;
  dosing: string;
  dosing_directions?: string;
  dose_amount?: string;
  dose_frequency?: string;
  route?: string;
  quantity: string;
  day_supply?: string;
  refills?: string;
  device_type?: string;
  is_refill: boolean;
  is_new_start?: boolean;
  loading_dose?: string;
  maintenance_dose?: string;
  urgency: string;
  ship_to?: string;
  loading_dose_received?: boolean;
  loading_dose_start_date?: string;
  tb_ruled_out?: boolean;
  tb_test_date?: string;
  prior_failed_medications?: string[];
  clinical_justification?: string;
  therapy_type?: string;
  date_therapy_initiated?: string;
  duration_of_therapy?: string;
  frequency?: string;
  length_of_therapy?: string;
  administration?: string;
  administration_location?: string;
}

export interface ExtractedProvider {
  name: string;
  first_name?: string;
  last_name?: string;
  specialty?: string;
  npi: string;
  dea_number?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  phone: string;
  fax?: string;
  email?: string;
  office_contact?: string;
  office_name?: string;
  office_address?: string;
  office_city?: string;
  office_state?: string;
  office_zip?: string;
  collaborating_physician?: string;
  collaborating_npi?: string;
  tax_id?: string;
  requestor?: string;
  signature_date: string;
}

export interface ExtractedInsurance {
  has_insurance_card: boolean;
  has_insurance?: boolean;
  primary_insurance_name?: string;
  primary_plan_name?: string;
  primary_member_id?: string;
  primary_group_number?: string;
  primary_policy_id?: string;
  primary_rxbin?: string;
  primary_rxpcn?: string;
  primary_carrier_phone?: string;
  secondary_insurance_name?: string;
  secondary_plan_name?: string;
  secondary_member_id?: string;
  secondary_group_number?: string;
  policyholder_name?: string;
  policyholder_relationship?: string;
  pharmacy_benefit_or_medical_benefit?: string;
  notes: string;
}

export interface ExtractedPriorAuth {
  required: boolean;
  handled_by_us: boolean;
  handled_by_clinic?: boolean;
  pa_number?: string;
  reference_number?: string;
  submission_date?: string;
  expiration_date?: string;
  status?: string;
}

export interface ExtractedPharmacy {
  preferred_pharmacy_name?: string;
  preferred_pharmacy_phone?: string;
  preferred_pharmacy_fax?: string;
}

export interface ExtractedDermatology {
  bsa_percentage?: string;
  iga_score?: string;
  easi_score?: string;
  pasi_score?: string;
  poem_score?: string;
  itch_nrs_score?: string;
  condition_severity?: string;
  affected_body_areas?: string[];
  prior_topicals_tried?: string[];
  prior_systemics_tried?: string[];
  phototherapy_tried?: boolean;
  date_of_diagnosis?: string;
}

export interface ExtractedData {
  patient: ExtractedPatient;
  clinical: ExtractedClinical;
  provider: ExtractedProvider;
  insurance: ExtractedInsurance;
  prior_auth: ExtractedPriorAuth;
  pharmacy?: ExtractedPharmacy;
  dermatology?: ExtractedDermatology;
  confidence: Record<string, number>;
  meta?: {
    confidence?: Record<string, number>;
  };
}

// ============================================================================
// CORE MODELS
// ============================================================================

export interface ReferralDocument {
  id: string;
  name: string;
  type: string;
  uploaded_at: string;
}

export interface HistoryEntry {
  id: string;
  status: ReferralStatus;
  timestamp: string;
  note: string;
  user: string;
}

export interface Referral {
  id: string;
  patient_id?: string;
  patient_name: string;
  patient_dob: string;
  patient_phone: string;
  patient_email: string;
  clinic_name: string;
  drug: string; // Frontend alias — mapped from backend drug_requested
  status: ReferralStatus;
  created_at: string;
  updated_at: string;
  pharmacy_name: string;
  pharmacy_location: string;
  pharmacy_contact: string;
  rejection_reason?: string;
  extracted_data: ExtractedData;
  documents: ReferralDocument[];
  history: HistoryEntry[];
  pa_required: boolean;
  pa_status: "denied" | "approved" | "sent_to_pharmacy" | "pending" | null;
  pa_required_reason: string;
  pa_expiration_date: string | null;
  pa_number?: string;
  pa_reference_number?: string;
  pa_denial_reason?: string;
  pa_submission_date?: string;
  // Admin-only fields (optional on clinic side)
  blocked?: boolean;
  dob?: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  last_drug: string;
  last_dosage: string;
  last_referral_date: string;
  pa_status: PAStatus;
  pa_expiration_date: string;
  referral_count: number;
  insurance_type: string;
  insurance_notes: string;
}

export interface PatientDrug {
  id: string;
  patient_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  is_active: boolean;
  pa_status: DrugPAStatus;
  pa_expiration_date: string | null;
  created_at: string;
  last_filled: string | null;
  last_referral_id?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  contact_email: string;
  phone: string;
  address: string;
  fax?: string;
  status: "active" | "inactive";
  insurance_compatibility: string[];
}

// ============================================================================
// PA INFO HELPER
// ============================================================================

export interface ReferralPAInfo {
  status: ReferralPAStatus;
  reason: string;
}

export function getReferralPAInfo(referral: Referral): ReferralPAInfo {
  if (!referral.pa_required) {
    return {
      status: "not_required",
      reason: referral.pa_required_reason || "Not required",
    };
  }

  if (referral.pa_status === "approved") {
    return { status: "required_approved", reason: referral.pa_required_reason || "Approved by insurance" };
  }
  if (referral.pa_status === "denied") {
    return { status: "required_denied", reason: referral.pa_required_reason || "Denied by insurance" };
  }
  if (referral.pa_status === "sent_to_pharmacy") {
    return { status: "required_submitted", reason: referral.pa_required_reason || "Submitted to insurance" };
  }

  return { status: "required_processing", reason: referral.pa_required_reason || "PA Required" };
}

// ============================================================================
// STATUS LABELS
// ============================================================================

export const statusLabels: Record<ReferralStatus, string> = {
  uploaded: "Received",
  processing: "In Review",
  ready_for_review: "In Review",
  approved: "Approved",
  approved_to_send: "Sent to Pharmacy",
  sent_to_pharmacy: "Sent to Pharmacy",
  rejected: "Needs Attention",
};

export const adminStatusLabels: Record<ReferralStatus, string> = {
  uploaded: "Received",
  processing: "Processing",
  ready_for_review: "Needs Review",
  approved: "Approved",
  approved_to_send: "Approved & Sent",
  sent_to_pharmacy: "Sent to Pharmacy",
  rejected: "Rejected",
};
