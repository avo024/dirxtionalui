export type ReferralStatus =
  | "uploaded"
  | "processing"
  | "ready_for_review"
  | "approved_to_send"
  | "sent_to_pharmacy"
  | "rejected";

export interface ExtractedPatient {
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
}

export interface ExtractedClinical {
  diagnosis_icd10: string;
  drug_requested: string;
  dosing: string;
  quantity: string;
  is_refill: boolean;
  urgency: string;
}

export interface ExtractedProvider {
  name: string;
  npi: string;
  address: string;
  phone: string;
  signature_date: string;
}

export interface ExtractedInsurance {
  has_insurance_card: boolean;
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
}

export interface Pharmacy {
  id: string;
  name: string;
  contact_email: string;
  phone: string;
  locations_count: number;
  status: "active" | "inactive";
  insurance_compatibility: string[];
  locations: PharmacyLocation[];
}

export interface PharmacyLocation {
  id: string;
  address: string;
  zip_codes_served: string[];
  email: string;
  phone: string;
  active: boolean;
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
    status: "ready_for_review",
    created_at: "2026-02-05",
    updated_at: "2026-02-06",
    pharmacy_name: "Optum - Dallas Hub",
    pharmacy_location: "1234 Commerce St, Dallas, TX 75201",
    pharmacy_contact: "(214) 555-0100",
    extracted_data: {
      patient: { first_name: "John", last_name: "Doe", dob: "1985-01-15", gender: "Male", phone: "(555) 123-4567", email: "john.doe@email.com" },
      clinical: { diagnosis_icd10: "L20.9", drug_requested: "Dupixent", dosing: "300mg every 2 weeks", quantity: "2 syringes", is_refill: false, urgency: "Standard" },
      provider: { name: "Dr. Emily Martinez", npi: "1234567890", address: "5500 Greenville Ave, Dallas, TX 75206", phone: "(214) 555-0200", signature_date: "2026-02-04" },
      insurance: { has_insurance_card: true, notes: "Blue Cross Blue Shield PPO" },
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
      { id: "h-3", status: "ready_for_review", timestamp: "2026-02-05T09:15:00Z", note: "Extraction complete, ready for review", user: "System" },
    ],
  },
  {
    id: "ref-002",
    patient_name: "Jane Smith",
    patient_dob: "1992-08-22",
    patient_phone: "(555) 234-5678",
    patient_email: "jane.smith@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Taltz",
    status: "approved_to_send",
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
      { id: "h-6", status: "ready_for_review", timestamp: "2026-02-03T14:20:00Z", note: "Extraction complete", user: "System" },
      { id: "h-7", status: "approved_to_send", timestamp: "2026-02-05T10:30:00Z", note: "Approved by admin", user: "Admin Team" },
    ],
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
      { id: "h-10", status: "ready_for_review", timestamp: "2026-02-01T11:25:00Z", note: "Extraction complete, low confidence on some fields", user: "System" },
      { id: "h-11", status: "rejected", timestamp: "2026-02-04T16:00:00Z", note: "Missing prior authorization documentation", user: "Admin Team" },
    ],
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
      { id: "h-14", status: "ready_for_review", timestamp: "2026-01-28T08:50:00Z", note: "Extraction complete", user: "System" },
      { id: "h-15", status: "approved_to_send", timestamp: "2026-01-30T11:00:00Z", note: "Approved by admin", user: "Admin Team" },
      { id: "h-16", status: "sent_to_pharmacy", timestamp: "2026-02-03T09:00:00Z", note: "Sent to BioScript Solutions", user: "System" },
    ],
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
  },
  {
    id: "ref-006",
    patient_name: "Michael Brown",
    patient_dob: "1972-03-25",
    patient_phone: "(555) 678-9012",
    patient_email: "m.brown@email.com",
    clinic_name: "Plano Rheumatology Associates",
    drug: "Dupixent",
    status: "uploaded",
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
    ],
  },
  {
    id: "ref-007",
    patient_name: "Emily Davis",
    patient_dob: "1988-09-14",
    patient_phone: "(555) 789-0123",
    patient_email: "e.davis@email.com",
    clinic_name: "Dallas Dermatology Clinic",
    drug: "Skyrizi",
    status: "ready_for_review",
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
      { id: "h-20", status: "uploaded", timestamp: "2026-02-06T15:00:00Z", note: "Documents uploaded", user: "Dallas Dermatology Clinic" },
      { id: "h-21", status: "processing", timestamp: "2026-02-06T15:05:00Z", note: "AI extraction started", user: "System" },
      { id: "h-22", status: "ready_for_review", timestamp: "2026-02-07T08:00:00Z", note: "Extraction complete", user: "System" },
    ],
  },
];

export const mockPharmacies: Pharmacy[] = [
  {
    id: "pharm-001",
    name: "Optum - Dallas Hub",
    contact_email: "dallas@optum.com",
    phone: "(214) 555-0100",
    locations_count: 3,
    status: "active",
    insurance_compatibility: ["BCBS", "Aetna", "UnitedHealthcare", "Cigna", "Medicare"],
    locations: [
      { id: "loc-1", address: "1234 Commerce St, Dallas, TX 75201", zip_codes_served: ["75201", "75202", "75204"], email: "commerce@optum.com", phone: "(214) 555-0101", active: true },
      { id: "loc-2", address: "5678 Preston Rd, Dallas, TX 75240", zip_codes_served: ["75240", "75248", "75252"], email: "preston@optum.com", phone: "(214) 555-0102", active: true },
      { id: "loc-3", address: "910 Main St, Fort Worth, TX 76102", zip_codes_served: ["76102", "76107", "76109"], email: "ftworth@optum.com", phone: "(817) 555-0103", active: true },
    ],
  },
  {
    id: "pharm-002",
    name: "CarePharma Specialty",
    contact_email: "info@carepharma.com",
    phone: "(214) 555-0300",
    locations_count: 2,
    status: "active",
    insurance_compatibility: ["BCBS", "Aetna", "Humana"],
    locations: [
      { id: "loc-4", address: "789 Elm St, Dallas, TX 75202", zip_codes_served: ["75202", "75203", "75205"], email: "elm@carepharma.com", phone: "(214) 555-0301", active: true },
      { id: "loc-5", address: "321 Oak St, Plano, TX 75075", zip_codes_served: ["75075", "75023", "75024"], email: "plano@carepharma.com", phone: "(972) 555-0302", active: true },
    ],
  },
  {
    id: "pharm-003",
    name: "BioScript Solutions",
    contact_email: "support@bioscript.com",
    phone: "(214) 555-0500",
    locations_count: 1,
    status: "active",
    insurance_compatibility: ["Cigna", "UnitedHealthcare", "Medicare", "Medicaid"],
    locations: [
      { id: "loc-6", address: "456 Oak Lawn Ave, Dallas, TX 75219", zip_codes_served: ["75219", "75207", "75210"], email: "oaklawn@bioscript.com", phone: "(214) 555-0501", active: true },
    ],
  },
  {
    id: "pharm-004",
    name: "HealthMart Specialty Rx",
    contact_email: "contact@healthmartrx.com",
    phone: "(817) 555-0700",
    locations_count: 2,
    status: "inactive",
    insurance_compatibility: ["BCBS", "Cigna"],
    locations: [
      { id: "loc-7", address: "100 W 7th St, Fort Worth, TX 76102", zip_codes_served: ["76102", "76103"], email: "fw@healthmartrx.com", phone: "(817) 555-0701", active: false },
      { id: "loc-8", address: "200 S Main St, Arlington, TX 76010", zip_codes_served: ["76010", "76011"], email: "arlington@healthmartrx.com", phone: "(817) 555-0702", active: false },
    ],
  },
];

export const mockBlockedReferrals = [
  { id: "ref-b01", patient_name: "Carlos Ruiz", clinic_name: "Dallas Dermatology Clinic", drug: "Humira", pharmacy: "HealthMart Specialty Rx", reason: "Pharmacy license expired in TX", date: "2026-02-04" },
  { id: "ref-b02", patient_name: "Anna Lee", clinic_name: "Fort Worth Allergy Center", drug: "Dupixent", pharmacy: "HealthMart Specialty Rx", reason: "Insurance not accepted at this location", date: "2026-02-06" },
];

export const statusLabels: Record<ReferralStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  ready_for_review: "Ready for Review",
  approved_to_send: "Approved",
  sent_to_pharmacy: "Sent to Pharmacy",
  rejected: "Rejected",
};
