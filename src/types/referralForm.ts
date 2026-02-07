export interface ReferralFormData {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  hasGuardian: boolean;
  guardianName: string;
  guardianRelationship: string;
  guardianPhone: string;
  diagnosisCode: string;
  drugRequested: string;
  dosing: string;
  quantity: string;
  isRefill: boolean;
  urgency: "routine" | "urgent" | "emergency";
  providerName: string;
  npi: string;
  providerAddress: string;
  providerCity: string;
  providerState: string;
  providerZip: string;
  providerPhone: string;
  providerFax: string;
  signatureDate: string;
  hasInsurance: boolean;
  insuranceType: string;
  insuranceNotes: string;
  paRequired: boolean;
  paHandledBy: string;
  paNotes: string;
  documents: UploadedDocument[];
  confirmAccuracy: boolean;
}

export interface UploadedDocument {
  name: string;
  fileName: string;
  fileSize: string;
  type: string;
}

export const initialFormData: ReferralFormData = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  hasGuardian: false,
  guardianName: "",
  guardianRelationship: "",
  guardianPhone: "",
  diagnosisCode: "",
  drugRequested: "",
  dosing: "",
  quantity: "",
  isRefill: false,
  urgency: "routine",
  providerName: "",
  npi: "",
  providerAddress: "",
  providerCity: "",
  providerState: "",
  providerZip: "",
  providerPhone: "",
  providerFax: "",
  signatureDate: new Date().toISOString().split("T")[0],
  hasInsurance: true,
  insuranceType: "",
  insuranceNotes: "",
  paRequired: false,
  paHandledBy: "",
  paNotes: "",
  documents: [],
  confirmAccuracy: false,
};

export const DRUG_OPTIONS = [
  "Dupixent", "Taltz", "Skyrizi", "Humira", "Cosentyx",
  "Stelara", "Otezla", "Rinvoq", "Enbrel", "Tremfya",
];

export const ICD10_OPTIONS = [
  { code: "L20.9", description: "Atopic Dermatitis, unspecified" },
  { code: "L40.0", description: "Psoriasis vulgaris (Plaque Psoriasis)" },
  { code: "L40.50", description: "Arthropathic psoriasis, unspecified" },
  { code: "M06.9", description: "Rheumatoid arthritis, unspecified" },
  { code: "J45.50", description: "Severe persistent asthma, uncomplicated" },
  { code: "K50.90", description: "Crohn's disease, unspecified" },
];
