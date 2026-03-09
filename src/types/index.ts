/**
 * Shared TypeScript Types — DiRxctional Platform
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

export interface ExtractedPatient {
  first_name: string;
  last_name: string;
  mi?: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  height?: string;
  weight?: string;
  allergies?: string;
  authorized_representative?: string;
  authorized_representative_phone?: string;
}

export interface ExtractedClinical {
  diagnosis_icd10: string;
  drug_requested: string;
  dosing: string;
  quantity: string;
  is_refill: boolean;
  urgency: string;
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
  requestor?: string;
  signature_date: string;
}

export interface ExtractedInsurance {
  has_insurance_card: boolean;
  primary_insurance_name?: string;
  primary_member_id?: string;
  secondary_insurance_name?: string;
  secondary_member_id?: string;
  notes: string;
}

export interface ExtractedPriorAuth {
  required: boolean;
  handled_by_us: boolean;
}

export interface ExtractedData {
  patient: ExtractedPatient;
  clinical: ExtractedClinical;
  provider: ExtractedProvider;
  insurance: ExtractedInsurance;
  prior_auth: ExtractedPriorAuth;
  confidence: Record<string, number>;
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
  approved: "Approved",
  sent_to_pharmacy: "Sent to Pharmacy",
  rejected: "Needs Attention",
};

export const adminStatusLabels: Record<ReferralStatus, string> = {
  uploaded: "Received",
  processing: "Needs Review",
  approved: "Approved",
  sent_to_pharmacy: "Sent to Pharmacy",
  rejected: "Rejected",
};
