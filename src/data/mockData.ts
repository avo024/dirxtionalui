export type ReferralStatus =
  | "uploaded"
  | "processing"
  | "approved"
  | "rejected"
  | "sent_to_pharmacy";

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
  drug: string;
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
  // Root-level PA fields from backend API
  pa_required: boolean;
  pa_status: "denied" | "approved" | "sent_to_pharmacy" | "pending" | null;
  pa_required_reason: string;
  pa_expiration_date: string | null;
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

export type PAStatus = "active" | "expiring" | "expired" | "none";

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

export type DrugPAStatus = "approved" | "pending" | null;

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

export const mockReferrals: Referral[] = [
  {
    id: "ref-001",
    patient_name: "John Doe",
    patient_dob: "1985-01-15",
    patient_phone: "(555) 123-4567",
    patient_email: "john.doe@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Dupixent",
    status: "processing",
    created_at: "2026-02-05",
    updated_at: "2026-02-06",
    pharmacy_name: "Optum - Dallas Hub",
    pharmacy_location: "1234 Commerce St, Dallas, TX 75201",
    pharmacy_contact: "(214) 555-0100",
    extracted_data: {
      patient: { first_name: "John", last_name: "Doe", mi: "A", dob: "1985-01-15", gender: "Male", phone: "(555) 123-4567", email: "john.doe@email.com", address: "1200 Main St", city: "Dallas", state: "TX", zip: "75201", height: "5'11\"", weight: "185 lbs", allergies: "Penicillin", authorized_representative: "", authorized_representative_phone: "" },
      clinical: { diagnosis_icd10: "L20.9", drug_requested: "Dupixent", dosing: "300mg", quantity: "2 syringes", is_refill: false, urgency: "Standard", therapy_type: "New Therapy", date_therapy_initiated: "", duration_of_therapy: "12 months", frequency: "Every 2 weeks", length_of_therapy: "26 doses", administration: "Injection", administration_location: "Patient's Home" },
      provider: { name: "Dr. Emily Martinez", first_name: "Emily", last_name: "Martinez", specialty: "Dermatology", npi: "1234567890", dea_number: "AM1234563", address: "5500 Greenville Ave", city: "Dallas", state: "TX", zip: "75206", phone: "(214) 555-0200", fax: "(214) 555-0201", email: "emartinez@dallasderma.com", office_contact: "Sarah Johnson", requestor: "", signature_date: "2026-02-04" },
      insurance: { has_insurance_card: true, primary_insurance_name: "Blue Cross Blue Shield", primary_member_id: "BCB-9384756", secondary_insurance_name: "", secondary_member_id: "", notes: "Blue Cross Blue Shield PPO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.98, last_name: 0.97, dob: 0.95, diagnosis_icd10: 0.88, drug_requested: 0.96, npi: 0.72, dosing: 0.65, phone: 0.91 },
    },
    documents: [
      { id: "doc-1", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-05" },
      { id: "doc-2", name: "Demographics", type: "demographics", uploaded_at: "2026-02-05" },
      { id: "doc-3", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-05" },
      { id: "doc-4", name: "Insurance Back", type: "insurance_back", uploaded_at: "2026-02-05" },
      { id: "doc-5", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-02-05" },
    ],
    history: [
      { id: "h-1", status: "uploaded", timestamp: "2026-02-05T09:00:00Z", note: "Documents uploaded by clinic", user: "Dallas Dermatology Clinic" },
      { id: "h-2", status: "processing", timestamp: "2026-02-05T09:05:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Dupixent",
    pa_expiration_date: null,
  },
  {
    id: "ref-002",
    patient_name: "Jane Smith",
    patient_dob: "1992-08-22",
    patient_phone: "(555) 234-5678",
    patient_email: "jane.smith@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Taltz",
    status: "approved",
    created_at: "2026-02-03",
    updated_at: "2026-02-05",
    pharmacy_name: "CarePharma Specialty",
    pharmacy_location: "789 Elm St, Dallas, TX 75202",
    pharmacy_contact: "(214) 555-0300",
    extracted_data: {
      patient: { first_name: "Jane", last_name: "Smith", dob: "1992-08-22", gender: "Female", phone: "(555) 234-5678", email: "jane.smith@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Taltz", dosing: "80mg every 4 weeks", quantity: "1 autoinjector", is_refill: true, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-02" },
      insurance: { has_insurance_card: true, notes: "Aetna HMO" },
      prior_auth: { required: true, handled_by_us: false },
      confidence: { first_name: 0.99, last_name: 0.99, dob: 0.97, diagnosis_icd10: 0.92, drug_requested: 0.98, npi: 0.95, dosing: 0.90, phone: 0.88 },
    },
    documents: [
      { id: "doc-6", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-03" },
      { id: "doc-7", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-03" },
      { id: "doc-8", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-02-03" },
    ],
    history: [
      { id: "h-4", status: "uploaded", timestamp: "2026-02-03T14:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-5", status: "processing", timestamp: "2026-02-03T14:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-6", status: "approved", timestamp: "2026-02-05T10:30:00Z", note: "Approved by admin", user: "Admin Team" },
    ],
    pa_required: true,
    pa_status: "approved",
    pa_required_reason: "Continuation — Taltz",
    pa_expiration_date: "2026-08-15",
  },
  {
    id: "ref-003",
    patient_name: "Maria Garcia",
    patient_dob: "1978-11-30",
    patient_phone: "(555) 345-6789",
    patient_email: "maria.garcia@email.com",
    clinic_name: "Fort Worth Allergy Center",
    drug: "Skyrizi",
    status: "rejected",
    created_at: "2026-02-01",
    updated_at: "2026-02-04",
    pharmacy_name: "Optum - Dallas Hub",
    pharmacy_location: "1234 Commerce St, Dallas, TX 75201",
    pharmacy_contact: "(214) 555-0100",
    rejection_reason: "Missing prior authorization documentation. Please resubmit with PA approval letter from insurance provider.",
    extracted_data: {
      patient: { first_name: "Maria", last_name: "Garcia", dob: "1978-11-30", gender: "Female", phone: "(555) 345-6789", email: "maria.garcia@email.com" },
      clinical: { diagnosis_icd10: "L40.9", drug_requested: "Skyrizi", dosing: "150mg every 12 weeks", quantity: "1 prefilled pen", is_refill: false, urgency: "Urgent" },
      provider: { name: "Dr. James Wilson", npi: "9876543210", address: "2200 W Lancaster Ave, Fort Worth, TX 76107", phone: "(817) 555-0400", signature_date: "2026-01-30" },
      insurance: { has_insurance_card: false, notes: "Patient stated United Healthcare but no card provided" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.96, last_name: 0.94, dob: 0.90, diagnosis_icd10: 0.45, drug_requested: 0.93, npi: 0.88, dosing: 0.55, phone: 0.82 },
    },
    documents: [
      { id: "doc-9", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-01" },
      { id: "doc-10", name: "Demographics", type: "demographics", uploaded_at: "2026-02-01" },
    ],
    history: [
      { id: "h-8", status: "uploaded", timestamp: "2026-02-01T11:00:00Z", note: "Documents uploaded", user: "Fort Worth Allergy Center" },
      { id: "h-9", status: "processing", timestamp: "2026-02-01T11:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-10", status: "rejected", timestamp: "2026-02-04T16:00:00Z", note: "Missing prior authorization documentation", user: "Admin Team" },
    ],
    pa_required: true,
    pa_status: "denied",
    pa_required_reason: "New Drug — Skyrizi",
    pa_expiration_date: null,
  },
  {
    id: "ref-004",
    patient_name: "Robert Johnson",
    patient_dob: "1965-04-12",
    patient_phone: "(555) 456-7890",
    patient_email: "r.johnson@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Humira",
    status: "sent_to_pharmacy",
    created_at: "2026-01-28",
    updated_at: "2026-02-03",
    pharmacy_name: "BioScript Solutions",
    pharmacy_location: "456 Oak Lawn Ave, Dallas, TX 75219",
    pharmacy_contact: "(214) 555-0500",
    extracted_data: {
      patient: { first_name: "Robert", last_name: "Johnson", dob: "1965-04-12", gender: "Male", phone: "(555) 456-7890", email: "r.johnson@email.com" },
      clinical: { diagnosis_icd10: "M06.9", drug_requested: "Humira", dosing: "40mg every 2 weeks", quantity: "2 pens", is_refill: true, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-01-27" },
      insurance: { has_insurance_card: true, notes: "Cigna PPO" },
      prior_auth: { required: false, handled_by_us: false },
      confidence: { first_name: 0.99, last_name: 0.99, dob: 0.98, diagnosis_icd10: 0.95, drug_requested: 0.99, npi: 0.97, dosing: 0.94, phone: 0.96 },
    },
    documents: [
      { id: "doc-11", name: "Referral Form", type: "referral_form", uploaded_at: "2026-01-28" },
      { id: "doc-12", name: "Demographics", type: "demographics", uploaded_at: "2026-01-28" },
      { id: "doc-13", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-01-28" },
      { id: "doc-14", name: "Insurance Back", type: "insurance_back", uploaded_at: "2026-01-28" },
      { id: "doc-15", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-01-28" },
    ],
    history: [
      { id: "h-12", status: "uploaded", timestamp: "2026-01-28T08:30:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-13", status: "processing", timestamp: "2026-01-28T08:35:00Z", note: "AI extraction started", user: "System" },
      { id: "h-14", status: "approved", timestamp: "2026-01-30T11:00:00Z", note: "Approved by admin", user: "Admin Team" },
      { id: "h-15", status: "sent_to_pharmacy", timestamp: "2026-02-03T09:00:00Z", note: "Sent to BioScript Solutions", user: "System" },
    ],
    pa_required: false,
    pa_status: null,
    pa_required_reason: "Continuation of existing therapy",
    pa_expiration_date: null,
  },
  {
    id: "ref-005",
    patient_name: "Sarah Williams",
    patient_dob: "1990-06-18",
    patient_phone: "(555) 567-8901",
    patient_email: "s.williams@email.com",
    clinic_name: "Fort Worth Allergy Center",
    drug: "Cosentyx",
    status: "processing",
    created_at: "2026-02-07",
    updated_at: "2026-02-07",
    pharmacy_name: "",
    pharmacy_location: "",
    pharmacy_contact: "",
    extracted_data: {
      patient: { first_name: "Sarah", last_name: "Williams", dob: "1990-06-18", gender: "Female", phone: "(555) 567-8901", email: "s.williams@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Cosentyx", dosing: "300mg every 4 weeks", quantity: "2 pens", is_refill: false, urgency: "Standard" },
      provider: { name: "Dr. James Wilson", npi: "9876543210", address: "2200 W Lancaster Ave, Fort Worth, TX 76107", phone: "(817) 555-0400", signature_date: "2026-02-06" },
      insurance: { has_insurance_card: true, notes: "Medicare Part D" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.92, last_name: 0.90, dob: 0.88, diagnosis_icd10: 0.78, drug_requested: 0.91, npi: 0.85, dosing: 0.70, phone: 0.80 },
    },
    documents: [
      { id: "doc-16", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-07" },
      { id: "doc-17", name: "Demographics", type: "demographics", uploaded_at: "2026-02-07" },
      { id: "doc-18", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-07" },
    ],
    history: [
      { id: "h-17", status: "uploaded", timestamp: "2026-02-07T07:00:00Z", note: "Documents uploaded", user: "Fort Worth Allergy Center" },
      { id: "h-18", status: "processing", timestamp: "2026-02-07T07:05:00Z", note: "AI extraction in progress", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Cosentyx",
    pa_expiration_date: null,
  },
  {
    id: "ref-006",
    patient_name: "Michael Brown",
    patient_dob: "1972-03-25",
    patient_phone: "(555) 678-9012",
    patient_email: "m.brown@email.com",
    clinic_name: "Plano Rheumatology Associates",
    drug: "Dupixent",
    status: "processing",
    created_at: "2026-02-07",
    updated_at: "2026-02-07",
    pharmacy_name: "",
    pharmacy_location: "",
    pharmacy_contact: "",
    extracted_data: {
      patient: { first_name: "Michael", last_name: "Brown", dob: "1972-03-25", gender: "Male", phone: "(555) 678-9012", email: "m.brown@email.com" },
      clinical: { diagnosis_icd10: "J45.50", drug_requested: "Dupixent", dosing: "300mg every 2 weeks", quantity: "2 syringes", is_refill: false, urgency: "Urgent" },
      provider: { name: "Dr. Lisa Chen", npi: "5678901234", address: "3100 Independence Pkwy, Plano, TX 75075", phone: "(972) 555-0600", signature_date: "2026-02-06" },
      insurance: { has_insurance_card: true, notes: "UnitedHealthcare Choice Plus" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.97, last_name: 0.95, dob: 0.93, diagnosis_icd10: 0.85, drug_requested: 0.97, npi: 0.90, dosing: 0.80, phone: 0.89 },
    },
    documents: [
      { id: "doc-19", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-07" },
    ],
    history: [
      { id: "h-19", status: "uploaded", timestamp: "2026-02-07T10:00:00Z", note: "Documents uploaded", user: "Plano Rheumatology Associates" },
      { id: "h-20", status: "processing", timestamp: "2026-02-07T10:05:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Dupixent",
    pa_expiration_date: null,
  },
  {
    id: "ref-007",
    patient_name: "Emily Davis",
    patient_dob: "1988-09-14",
    patient_phone: "(555) 789-0123",
    patient_email: "e.davis@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Skyrizi",
    status: "processing",
    created_at: "2026-02-06",
    updated_at: "2026-02-07",
    pharmacy_name: "Optum - Dallas Hub",
    pharmacy_location: "1234 Commerce St, Dallas, TX 75201",
    pharmacy_contact: "(214) 555-0100",
    extracted_data: {
      patient: { first_name: "Emily", last_name: "Davis", dob: "1988-09-14", gender: "Female", phone: "(555) 789-0123", email: "e.davis@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Skyrizi", dosing: "150mg every 12 weeks", quantity: "1 prefilled pen", is_refill: false, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-05" },
      insurance: { has_insurance_card: true, notes: "BCBS TX PPO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.99, last_name: 0.98, dob: 0.96, diagnosis_icd10: 0.90, drug_requested: 0.97, npi: 0.94, dosing: 0.87, phone: 0.92 },
    },
    documents: [
      { id: "doc-20", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-06" },
      { id: "doc-21", name: "Demographics", type: "demographics", uploaded_at: "2026-02-06" },
      { id: "doc-22", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-06" },
      { id: "doc-23", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-02-06" },
    ],
    history: [
      { id: "h-21", status: "uploaded", timestamp: "2026-02-06T15:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-22", status: "processing", timestamp: "2026-02-06T15:05:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Skyrizi",
    pa_expiration_date: null,
  },
  {
    id: "ref-008",
    patient_name: "Thomas Anderson",
    patient_dob: "1980-03-10",
    patient_phone: "(555) 890-1234",
    patient_email: "t.anderson@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Cosentyx",
    status: "processing",
    created_at: "2026-02-07",
    updated_at: "2026-02-07",
    pharmacy_name: "",
    pharmacy_location: "",
    pharmacy_contact: "",
    extracted_data: {
      patient: { first_name: "Thomas", last_name: "Anderson", dob: "1980-03-10", gender: "Male", phone: "(555) 890-1234", email: "t.anderson@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Cosentyx", dosing: "300mg every 4 weeks", quantity: "2 pens", is_refill: false, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-06" },
      insurance: { has_insurance_card: true, notes: "Aetna PPO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.96, last_name: 0.94, dob: 0.91, diagnosis_icd10: 0.82, drug_requested: 0.95, npi: 0.89, dosing: 0.75, phone: 0.87 },
    },
    documents: [
      { id: "doc-24", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-07" },
    ],
    history: [
      { id: "h-23", status: "uploaded", timestamp: "2026-02-07T11:30:00Z", note: "Documents uploaded by clinic", user: "Dallas Dermatology Clinic" },
      { id: "h-24", status: "processing", timestamp: "2026-02-07T11:35:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Cosentyx",
    pa_expiration_date: null,
  },
  {
    id: "ref-009",
    patient_name: "Lisa Chen",
    patient_dob: "1995-07-22",
    patient_phone: "(555) 901-2345",
    patient_email: "l.chen@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Stelara",
    status: "processing",
    created_at: "2026-02-06",
    updated_at: "2026-02-07",
    pharmacy_name: "",
    pharmacy_location: "",
    pharmacy_contact: "",
    extracted_data: {
      patient: { first_name: "Lisa", last_name: "Chen", dob: "1995-07-22", gender: "Female", phone: "(555) 901-2345", email: "l.chen@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Stelara", dosing: "45mg every 12 weeks", quantity: "1 prefilled syringe", is_refill: false, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-05" },
      insurance: { has_insurance_card: true, notes: "Cigna Open Access Plus" },
      prior_auth: { required: true, handled_by_us: false },
      confidence: { first_name: 0.98, last_name: 0.97, dob: 0.94, diagnosis_icd10: 0.88, drug_requested: 0.96, npi: 0.92, dosing: 0.82, phone: 0.90 },
    },
    documents: [
      { id: "doc-25", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-06" },
      { id: "doc-26", name: "Demographics", type: "demographics", uploaded_at: "2026-02-06" },
      { id: "doc-27", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-06" },
    ],
    history: [
      { id: "h-25", status: "uploaded", timestamp: "2026-02-06T16:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-26", status: "processing", timestamp: "2026-02-07T08:00:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Stelara",
    pa_expiration_date: null,
  },
  {
    id: "ref-010",
    patient_name: "David Kim",
    patient_dob: "1970-12-05",
    patient_phone: "(555) 012-3456",
    patient_email: "d.kim@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Otezla",
    status: "approved",
    created_at: "2026-02-02",
    updated_at: "2026-02-06",
    pharmacy_name: "CarePharma Specialty",
    pharmacy_location: "789 Elm St, Dallas, TX 75202",
    pharmacy_contact: "(214) 555-0300",
    extracted_data: {
      patient: { first_name: "David", last_name: "Kim", dob: "1970-12-05", gender: "Male", phone: "(555) 012-3456", email: "d.kim@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Otezla", dosing: "30mg twice daily", quantity: "60 tablets", is_refill: true, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-01" },
      insurance: { has_insurance_card: true, notes: "UnitedHealthcare Choice Plus" },
      prior_auth: { required: false, handled_by_us: false },
      confidence: { first_name: 0.99, last_name: 0.99, dob: 0.97, diagnosis_icd10: 0.93, drug_requested: 0.98, npi: 0.96, dosing: 0.91, phone: 0.94 },
    },
    documents: [
      { id: "doc-28", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-02" },
      { id: "doc-29", name: "Demographics", type: "demographics", uploaded_at: "2026-02-02" },
      { id: "doc-30", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-02" },
      { id: "doc-31", name: "Insurance Back", type: "insurance_back", uploaded_at: "2026-02-02" },
    ],
    history: [
      { id: "h-27", status: "uploaded", timestamp: "2026-02-02T10:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-28", status: "processing", timestamp: "2026-02-02T10:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-29", status: "approved", timestamp: "2026-02-06T14:00:00Z", note: "Approved by admin", user: "Admin Team" },
    ],
    pa_required: false,
    pa_status: null,
    pa_required_reason: "Continuation of existing therapy",
    pa_expiration_date: null,
  },
  {
    id: "ref-011",
    patient_name: "Patricia Hernandez",
    patient_dob: "1983-05-18",
    patient_phone: "(555) 123-7890",
    patient_email: "p.hernandez@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Rinvoq",
    status: "sent_to_pharmacy",
    created_at: "2026-01-25",
    updated_at: "2026-02-01",
    pharmacy_name: "Optum - Dallas Hub",
    pharmacy_location: "1234 Commerce St, Dallas, TX 75201",
    pharmacy_contact: "(214) 555-0100",
    extracted_data: {
      patient: { first_name: "Patricia", last_name: "Hernandez", dob: "1983-05-18", gender: "Female", phone: "(555) 123-7890", email: "p.hernandez@email.com" },
      clinical: { diagnosis_icd10: "L20.9", drug_requested: "Rinvoq", dosing: "15mg once daily", quantity: "30 tablets", is_refill: true, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-01-24" },
      insurance: { has_insurance_card: true, notes: "BCBS TX PPO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.99, last_name: 0.98, dob: 0.96, diagnosis_icd10: 0.91, drug_requested: 0.98, npi: 0.95, dosing: 0.89, phone: 0.93 },
    },
    documents: [
      { id: "doc-32", name: "Referral Form", type: "referral_form", uploaded_at: "2026-01-25" },
      { id: "doc-33", name: "Demographics", type: "demographics", uploaded_at: "2026-01-25" },
      { id: "doc-34", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-01-25" },
      { id: "doc-35", name: "Insurance Back", type: "insurance_back", uploaded_at: "2026-01-25" },
      { id: "doc-36", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-01-25" },
    ],
    history: [
      { id: "h-30", status: "uploaded", timestamp: "2026-01-25T09:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-31", status: "processing", timestamp: "2026-01-25T09:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-32", status: "approved", timestamp: "2026-01-28T11:00:00Z", note: "Approved by admin", user: "Admin Team" },
      { id: "h-33", status: "sent_to_pharmacy", timestamp: "2026-02-01T09:00:00Z", note: "Sent to Optum - Dallas Hub", user: "System" },
    ],
    pa_required: true,
    pa_status: "approved",
    pa_required_reason: "Continuation — Rinvoq",
    pa_expiration_date: "2026-07-01",
  },
  {
    id: "ref-012",
    patient_name: "Kevin O'Brien",
    patient_dob: "1967-09-03",
    patient_phone: "(555) 234-8901",
    patient_email: "k.obrien@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Enbrel",
    status: "rejected",
    created_at: "2026-02-04",
    updated_at: "2026-02-06",
    pharmacy_name: "BioScript Solutions",
    pharmacy_location: "456 Oak Lawn Ave, Dallas, TX 75219",
    pharmacy_contact: "(214) 555-0500",
    rejection_reason: "Incomplete provider information — NPI number does not match records. Please verify and resubmit.",
    extracted_data: {
      patient: { first_name: "Kevin", last_name: "O'Brien", dob: "1967-09-03", gender: "Male", phone: "(555) 234-8901", email: "k.obrien@email.com" },
      clinical: { diagnosis_icd10: "M06.9", drug_requested: "Enbrel", dosing: "50mg once weekly", quantity: "4 syringes", is_refill: false, urgency: "Urgent" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-03" },
      insurance: { has_insurance_card: true, notes: "Medicare Part D" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.94, last_name: 0.90, dob: 0.88, diagnosis_icd10: 0.78, drug_requested: 0.92, npi: 0.45, dosing: 0.70, phone: 0.85 },
    },
    documents: [
      { id: "doc-37", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-04" },
      { id: "doc-38", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-02-04" },
    ],
    history: [
      { id: "h-34", status: "uploaded", timestamp: "2026-02-04T13:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-35", status: "processing", timestamp: "2026-02-04T13:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-36", status: "rejected", timestamp: "2026-02-06T10:00:00Z", note: "Rejected — NPI mismatch", user: "Admin Team" },
    ],
    pa_required: true,
    pa_status: "denied",
    pa_required_reason: "New Drug — Enbrel",
    pa_expiration_date: null,
  },
  {
    id: "ref-013",
    patient_name: "Amanda Foster",
    patient_dob: "1991-02-14",
    patient_phone: "(555) 345-9012",
    patient_email: "a.foster@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Tremfya",
    status: "processing",
    created_at: "2026-02-07",
    updated_at: "2026-02-07",
    pharmacy_name: "",
    pharmacy_location: "",
    pharmacy_contact: "",
    extracted_data: {
      patient: { first_name: "Amanda", last_name: "Foster", dob: "1991-02-14", gender: "Female", phone: "(555) 345-9012", email: "a.foster@email.com" },
      clinical: { diagnosis_icd10: "L40.0", drug_requested: "Tremfya", dosing: "100mg every 8 weeks", quantity: "1 prefilled syringe", is_refill: false, urgency: "Routine" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-06" },
      insurance: { has_insurance_card: true, notes: "Humana Gold Plus" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.97, last_name: 0.95, dob: 0.93, diagnosis_icd10: 0.86, drug_requested: 0.94, npi: 0.91, dosing: 0.80, phone: 0.88 },
    },
    documents: [
      { id: "doc-39", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-07" },
      { id: "doc-40", name: "Demographics", type: "demographics", uploaded_at: "2026-02-07" },
    ],
    history: [
      { id: "h-37", status: "uploaded", timestamp: "2026-02-07T14:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-38", status: "processing", timestamp: "2026-02-07T14:05:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Tremfya",
    pa_expiration_date: null,
  },
  {
    id: "ref-014",
    patient_name: "William Turner",
    patient_dob: "1975-08-29",
    patient_phone: "(555) 456-0123",
    patient_email: "w.turner@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Dupixent",
    status: "sent_to_pharmacy",
    created_at: "2026-01-20",
    updated_at: "2026-01-30",
    pharmacy_name: "CarePharma Specialty",
    pharmacy_location: "789 Elm St, Dallas, TX 75202",
    pharmacy_contact: "(214) 555-0300",
    extracted_data: {
      patient: { first_name: "William", last_name: "Turner", dob: "1975-08-29", gender: "Male", phone: "(555) 456-0123", email: "w.turner@email.com" },
      clinical: { diagnosis_icd10: "J45.50", drug_requested: "Dupixent", dosing: "300mg every 2 weeks", quantity: "2 syringes", is_refill: true, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-01-19" },
      insurance: { has_insurance_card: true, notes: "BCBS TX HMO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.99, last_name: 0.99, dob: 0.98, diagnosis_icd10: 0.95, drug_requested: 0.99, npi: 0.97, dosing: 0.94, phone: 0.96 },
    },
    documents: [
      { id: "doc-41", name: "Referral Form", type: "referral_form", uploaded_at: "2026-01-20" },
      { id: "doc-42", name: "Demographics", type: "demographics", uploaded_at: "2026-01-20" },
      { id: "doc-43", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-01-20" },
      { id: "doc-44", name: "Insurance Back", type: "insurance_back", uploaded_at: "2026-01-20" },
      { id: "doc-45", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-01-20" },
    ],
    history: [
      { id: "h-39", status: "uploaded", timestamp: "2026-01-20T10:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-40", status: "processing", timestamp: "2026-01-20T10:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-41", status: "approved", timestamp: "2026-01-24T15:00:00Z", note: "Approved by admin", user: "Admin Team" },
      { id: "h-42", status: "sent_to_pharmacy", timestamp: "2026-01-30T09:00:00Z", note: "Sent to CarePharma Specialty", user: "System" },
    ],
    pa_required: true,
    pa_status: "approved",
    pa_required_reason: "Continuation — Dupixent",
    pa_expiration_date: "2026-06-30",
  },
  {
    id: "ref-015",
    patient_name: "Rachel Green",
    patient_dob: "1988-11-20",
    patient_phone: "(555) 567-1234",
    patient_email: "r.green@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Humira",
    status: "processing",
    created_at: "2026-02-05",
    updated_at: "2026-02-06",
    pharmacy_name: "BioScript Solutions",
    pharmacy_location: "456 Oak Lawn Ave, Dallas, TX 75219",
    pharmacy_contact: "(214) 555-0500",
    extracted_data: {
      patient: { first_name: "Rachel", last_name: "Green", dob: "1988-11-20", gender: "Female", phone: "(555) 567-1234", email: "r.green@email.com" },
      clinical: { diagnosis_icd10: "K50.90", drug_requested: "Humira", dosing: "40mg every 2 weeks", quantity: "2 pens", is_refill: false, urgency: "Urgent" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-04" },
      insurance: { has_insurance_card: true, notes: "Aetna HMO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.98, last_name: 0.96, dob: 0.94, diagnosis_icd10: 0.85, drug_requested: 0.97, npi: 0.93, dosing: 0.86, phone: 0.91 },
    },
    documents: [
      { id: "doc-46", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-05" },
      { id: "doc-47", name: "Demographics", type: "demographics", uploaded_at: "2026-02-05" },
      { id: "doc-48", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-05" },
      { id: "doc-49", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-02-05" },
    ],
    history: [
      { id: "h-43", status: "uploaded", timestamp: "2026-02-05T14:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-44", status: "processing", timestamp: "2026-02-05T14:05:00Z", note: "AI extraction started", user: "System" },
    ],
    pa_required: true,
    pa_status: "pending",
    pa_required_reason: "New Drug — Humira",
    pa_expiration_date: null,
  },
  {
    id: "ref-016",
    patient_name: "Daniel Martinez",
    patient_dob: "1982-04-15",
    patient_phone: "(555) 678-2345",
    patient_email: "d.martinez@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Dupixent",
    status: "approved",
    created_at: "2026-02-03",
    updated_at: "2026-02-06",
    pharmacy_name: "Optum - Dallas Hub",
    pharmacy_location: "1234 Commerce St, Dallas, TX 75201",
    pharmacy_contact: "(214) 555-0100",
    extracted_data: {
      patient: { first_name: "Daniel", last_name: "Martinez", dob: "1982-04-15", gender: "Male", phone: "(555) 678-2345", email: "d.martinez@email.com" },
      clinical: { diagnosis_icd10: "L20.9", drug_requested: "Dupixent", dosing: "300mg every 2 weeks", quantity: "2 syringes", is_refill: true, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-02" },
      insurance: { has_insurance_card: true, notes: "Cigna PPO" },
      prior_auth: { required: true, handled_by_us: true },
      confidence: { first_name: 0.99, last_name: 0.99, dob: 0.97, diagnosis_icd10: 0.92, drug_requested: 0.99, npi: 0.96, dosing: 0.90, phone: 0.94 },
    },
    documents: [
      { id: "doc-50", name: "Referral Form", type: "referral_form", uploaded_at: "2026-02-03" },
      { id: "doc-51", name: "Demographics", type: "demographics", uploaded_at: "2026-02-03" },
      { id: "doc-52", name: "Insurance Front", type: "insurance_front", uploaded_at: "2026-02-03" },
      { id: "doc-53", name: "Insurance Back", type: "insurance_back", uploaded_at: "2026-02-03" },
      { id: "doc-54", name: "Chart Notes", type: "chart_notes", uploaded_at: "2026-02-03" },
    ],
    history: [
      { id: "h-45", status: "uploaded", timestamp: "2026-02-03T09:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-46", status: "processing", timestamp: "2026-02-03T09:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-47", status: "approved", timestamp: "2026-02-06T16:00:00Z", note: "Approved by admin", user: "Admin Team" },
    ],
    pa_required: true,
    pa_status: "approved",
    pa_required_reason: "Continuation — Dupixent",
    pa_expiration_date: "2026-09-01",
  },
];

export const mockPatients: Patient[] = [
  { id: "pat-001", first_name: "John", last_name: "Doe", dob: "1985-01-15", gender: "Male", phone: "(555) 123-4567", email: "john.doe@email.com", last_drug: "Dupixent", last_dosage: "300mg every 2 weeks", last_referral_date: "2026-02-05", pa_status: "active", pa_expiration_date: "2026-08-15", referral_count: 3, insurance_type: "Commercial", insurance_notes: "Blue Cross Blue Shield PPO" },
  { id: "pat-002", first_name: "Jane", last_name: "Smith", dob: "1992-08-22", gender: "Female", phone: "(555) 234-5678", email: "jane.smith@email.com", last_drug: "Taltz", last_dosage: "80mg every 4 weeks", last_referral_date: "2026-02-03", pa_status: "expiring", pa_expiration_date: "2026-03-01", referral_count: 2, insurance_type: "Commercial", insurance_notes: "Aetna HMO" },
  { id: "pat-003", first_name: "Robert", last_name: "Johnson", dob: "1965-04-12", gender: "Male", phone: "(555) 456-7890", email: "r.johnson@email.com", last_drug: "Humira", last_dosage: "40mg every 2 weeks", last_referral_date: "2026-01-28", pa_status: "active", pa_expiration_date: "2026-07-28", referral_count: 4, insurance_type: "Commercial", insurance_notes: "Cigna PPO" },
  { id: "pat-004", first_name: "Emily", last_name: "Davis", dob: "1988-09-14", gender: "Female", phone: "(555) 789-0123", email: "e.davis@email.com", last_drug: "Skyrizi", last_dosage: "150mg every 12 weeks", last_referral_date: "2026-02-06", pa_status: "active", pa_expiration_date: "2026-09-06", referral_count: 1, insurance_type: "Commercial", insurance_notes: "BCBS TX PPO" },
  { id: "pat-005", first_name: "Thomas", last_name: "Anderson", dob: "1980-03-10", gender: "Male", phone: "(555) 890-1234", email: "t.anderson@email.com", last_drug: "Cosentyx", last_dosage: "300mg every 4 weeks", last_referral_date: "2026-02-07", pa_status: "none", pa_expiration_date: "", referral_count: 1, insurance_type: "Commercial", insurance_notes: "Aetna PPO" },
  { id: "pat-006", first_name: "Lisa", last_name: "Chen", dob: "1995-07-22", gender: "Female", phone: "(555) 901-2345", email: "l.chen@email.com", last_drug: "Stelara", last_dosage: "45mg every 12 weeks", last_referral_date: "2026-02-06", pa_status: "none", pa_expiration_date: "", referral_count: 1, insurance_type: "Commercial", insurance_notes: "Cigna Open Access Plus" },
  { id: "pat-007", first_name: "David", last_name: "Kim", dob: "1970-12-05", gender: "Male", phone: "(555) 012-3456", email: "d.kim@email.com", last_drug: "Otezla", last_dosage: "30mg twice daily", last_referral_date: "2026-02-02", pa_status: "active", pa_expiration_date: "2026-06-02", referral_count: 2, insurance_type: "Commercial", insurance_notes: "UnitedHealthcare Choice Plus" },
  { id: "pat-008", first_name: "Patricia", last_name: "Hernandez", dob: "1983-05-18", gender: "Female", phone: "(555) 123-7890", email: "p.hernandez@email.com", last_drug: "Rinvoq", last_dosage: "15mg once daily", last_referral_date: "2026-01-25", pa_status: "expiring", pa_expiration_date: "2026-02-25", referral_count: 3, insurance_type: "Commercial", insurance_notes: "BCBS TX PPO" },
  { id: "pat-009", first_name: "Kevin", last_name: "O'Brien", dob: "1967-09-03", gender: "Male", phone: "(555) 234-8901", email: "k.obrien@email.com", last_drug: "Enbrel", last_dosage: "50mg once weekly", last_referral_date: "2026-02-04", pa_status: "expired", pa_expiration_date: "2026-01-15", referral_count: 1, insurance_type: "Medicare", insurance_notes: "Medicare Part D" },
  { id: "pat-010", first_name: "Amanda", last_name: "Foster", dob: "1991-02-14", gender: "Female", phone: "(555) 345-9012", email: "a.foster@email.com", last_drug: "Tremfya", last_dosage: "100mg every 8 weeks", last_referral_date: "2026-02-07", pa_status: "none", pa_expiration_date: "", referral_count: 1, insurance_type: "Commercial", insurance_notes: "Humana Gold Plus" },
  { id: "pat-011", first_name: "William", last_name: "Turner", dob: "1975-08-29", gender: "Male", phone: "(555) 456-0123", email: "w.turner@email.com", last_drug: "Dupixent", last_dosage: "300mg every 2 weeks", last_referral_date: "2026-01-20", pa_status: "active", pa_expiration_date: "2026-07-20", referral_count: 5, insurance_type: "Commercial", insurance_notes: "BCBS TX HMO" },
  { id: "pat-012", first_name: "Rachel", last_name: "Green", dob: "1988-11-20", gender: "Female", phone: "(555) 567-1234", email: "r.green@email.com", last_drug: "Humira", last_dosage: "40mg every 2 weeks", last_referral_date: "2026-02-05", pa_status: "active", pa_expiration_date: "2026-08-05", referral_count: 1, insurance_type: "Commercial", insurance_notes: "Aetna HMO" },
  { id: "pat-013", first_name: "Daniel", last_name: "Martinez", dob: "1982-04-15", gender: "Male", phone: "(555) 678-2345", email: "d.martinez@email.com", last_drug: "Dupixent", last_dosage: "300mg every 2 weeks", last_referral_date: "2026-02-03", pa_status: "expiring", pa_expiration_date: "2026-03-10", referral_count: 2, insurance_type: "Commercial", insurance_notes: "Cigna PPO" },
];

/** Mock: GET /patients/{patient_id}/drugs */
export const mockPatientDrugs: PatientDrug[] = [
  { id: "drug-001", patient_id: "pat-001", drug_name: "Dupixent", dosage: "300mg", frequency: "Every 2 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-08-15", created_at: "2025-08-10", last_filled: "2026-01-28" },
  { id: "drug-002", patient_id: "pat-001", drug_name: "Humira", dosage: "40mg", frequency: "Every 2 weeks", is_active: false, pa_status: "approved", pa_expiration_date: "2025-06-01", created_at: "2024-06-01", last_filled: "2025-05-15" },
  { id: "drug-003", patient_id: "pat-002", drug_name: "Taltz", dosage: "80mg", frequency: "Every 4 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-03-01", created_at: "2025-03-01", last_filled: "2026-01-30" },
  { id: "drug-004", patient_id: "pat-003", drug_name: "Humira", dosage: "40mg", frequency: "Every 2 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-07-28", created_at: "2025-01-15", last_filled: "2026-01-25" },
  { id: "drug-005", patient_id: "pat-003", drug_name: "Enbrel", dosage: "50mg", frequency: "Once weekly", is_active: false, pa_status: null, pa_expiration_date: null, created_at: "2023-03-10", last_filled: "2024-12-01" },
  { id: "drug-006", patient_id: "pat-004", drug_name: "Skyrizi", dosage: "150mg", frequency: "Every 12 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-09-06", created_at: "2025-09-06", last_filled: "2026-01-15" },
  { id: "drug-007", patient_id: "pat-005", drug_name: "Cosentyx", dosage: "300mg", frequency: "Every 4 weeks", is_active: true, pa_status: "pending", pa_expiration_date: null, created_at: "2026-02-07", last_filled: null },
  { id: "drug-008", patient_id: "pat-007", drug_name: "Otezla", dosage: "30mg", frequency: "Twice daily", is_active: true, pa_status: "approved", pa_expiration_date: "2026-06-02", created_at: "2025-06-02", last_filled: "2026-01-20" },
  { id: "drug-009", patient_id: "pat-008", drug_name: "Rinvoq", dosage: "15mg", frequency: "Once daily", is_active: true, pa_status: "approved", pa_expiration_date: "2026-02-25", created_at: "2025-02-20", last_filled: "2026-01-18" },
  { id: "drug-010", patient_id: "pat-008", drug_name: "Humira", dosage: "40mg", frequency: "Every 2 weeks", is_active: false, pa_status: "approved", pa_expiration_date: "2025-01-01", created_at: "2023-01-15", last_filled: "2024-12-10" },
  { id: "drug-011", patient_id: "pat-009", drug_name: "Enbrel", dosage: "50mg", frequency: "Once weekly", is_active: true, pa_status: "approved", pa_expiration_date: "2026-01-15", created_at: "2025-01-10", last_filled: "2026-01-08" },
  { id: "drug-012", patient_id: "pat-011", drug_name: "Dupixent", dosage: "300mg", frequency: "Every 2 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-07-20", created_at: "2025-01-20", last_filled: "2026-01-18" },
  { id: "drug-013", patient_id: "pat-011", drug_name: "Stelara", dosage: "45mg", frequency: "Every 12 weeks", is_active: false, pa_status: null, pa_expiration_date: null, created_at: "2023-07-01", last_filled: "2024-10-01" },
  { id: "drug-014", patient_id: "pat-012", drug_name: "Humira", dosage: "40mg", frequency: "Every 2 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-08-05", created_at: "2025-08-05", last_filled: "2026-01-22" },
  { id: "drug-015", patient_id: "pat-013", drug_name: "Dupixent", dosage: "300mg", frequency: "Every 2 weeks", is_active: true, pa_status: "approved", pa_expiration_date: "2026-03-10", created_at: "2025-03-10", last_filled: "2026-01-30" },
];

export const mockPharmacies: Pharmacy[] = [
  {
    id: "pharm-001",
    name: "Optum - Dallas Hub",
    contact_email: "dallas@optum.com",
    phone: "(214) 555-0100",
    address: "1234 Commerce St, Dallas, TX 75201",
    fax: "(214) 555-0199",
    status: "active",
    insurance_compatibility: ["BCBS", "Aetna", "UnitedHealthcare", "Cigna", "Medicare"],
  },
  {
    id: "pharm-002",
    name: "CarePharma Specialty",
    contact_email: "info@carepharma.com",
    phone: "(214) 555-0300",
    address: "789 Elm St, Dallas, TX 75202",
    fax: "(214) 555-0399",
    status: "active",
    insurance_compatibility: ["BCBS", "Aetna", "Humana"],
  },
  {
    id: "pharm-003",
    name: "BioScript Solutions",
    contact_email: "support@bioscript.com",
    phone: "(214) 555-0500",
    address: "456 Oak Lawn Ave, Dallas, TX 75219",
    fax: "(214) 555-0599",
    status: "active",
    insurance_compatibility: ["Cigna", "UnitedHealthcare", "Medicare", "Medicaid"],
  },
  {
    id: "pharm-004",
    name: "HealthMart Specialty Rx",
    contact_email: "contact@healthmartrx.com",
    phone: "(817) 555-0700",
    address: "100 W 7th St, Fort Worth, TX 76102",
    fax: "(817) 555-0799",
    status: "inactive",
    insurance_compatibility: ["BCBS", "Cigna"],
  },
];

export const mockBlockedReferrals = [
  { id: "ref-b01", patient_name: "Carlos Ruiz", clinic_name: "Dallas Dermatology Clinic", drug: "Humira", pharmacy: "HealthMart Specialty Rx", reason: "Pharmacy license expired in TX", date: "2026-02-04" },
  { id: "ref-b02", patient_name: "Anna Lee", clinic_name: "Fort Worth Allergy Center", drug: "Dupixent", pharmacy: "HealthMart Specialty Rx", reason: "Insurance not accepted at this location", date: "2026-02-06" },
];

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

export type ReferralPAStatus = "no_pa" | "pa_required" | "pa_approved" | "pa_expired";

export interface ReferralPAInfo {
  status: ReferralPAStatus;
  reason: string;
}

export function getReferralPAInfo(referral: Referral): ReferralPAInfo {
  // 1. Not required → no_pa
  if (!referral.pa_required) {
    return {
      status: "no_pa",
      reason: referral.pa_required_reason || "Not required",
    };
  }

  // 2. Approved with valid expiration → pa_approved
  //    Approved with expired date → pa_expired
  if (referral.pa_status === "approved") {
    if (referral.pa_expiration_date && new Date(referral.pa_expiration_date) < new Date()) {
      return {
        status: "pa_expired",
        reason: referral.pa_required_reason || "PA Expired",
      };
    }
    return {
      status: "pa_approved",
      reason: referral.pa_required_reason || "Approved",
    };
  }

  // 3. pa_required=true + anything else (null/denied/pending/sent_to_pharmacy) → pa_required
  return {
    status: "pa_required",
    reason: referral.pa_required_reason || "PA Required",
  };
}
