// Synthetic data for the product-tour demo. Nothing here is real: every
// person, number and document is invented. Dates are relative to "now" so the
// tour always looks current.
import referralFormPdf from "./assets/referral-form.pdf?url";
import chartNotePdf from "./assets/chart-note.pdf?url";
import insuranceCardPdf from "./assets/insurance-card.pdf?url";
import paLetterPdf from "./assets/pa-approval-letter.pdf?url";
import referralPacketPdf from "./assets/referral-packet.pdf?url";

export const SAMPLE_PDFS: Record<string, string> = {
  referral_form: referralFormPdf,
  chart_notes: chartNotePdf,
  insurance_front: insuranceCardPdf,
  insurance_back: insuranceCardPdf,
  pa_letter: paLetterPdf,
  referral_packet: referralPacketPdf,
  other: chartNotePdf,
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const iso = (msAgo: number) => new Date(Date.now() - msAgo).toISOString();
export const dateOnly = (daysFromNow: number) => {
  const d = new Date(Date.now() + daysFromNow * DAY);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Stable, hex-looking ids so the 8-char id chips are distinct in every table.
export const RID: Record<string, string> = {
  "margaret-dupixent": "demo-margaret-dupixent",
  "daniel-otezla": "b81e47d9-2c63-4f0a-8e15-5a3c91f2d002",
  "priya-tremfya": "5c02ae7b-91d4-4e38-b6f7-0d48c3a1e003",
  "luis-skyrizi": "e4d7160f-a3b8-4952-9c0e-72f5b8d6a004",
  "evelyn-cosentyx": "19b6f3a8-5e7c-4d21-a490-c8e2073b5005",
  "margaret-otezla": "a7c38d52-0f19-4b64-83ea-41d9e6f0c006",
  "daniel-dupixent": "62f0b9e1-d845-4a7c-b123-9f5a0c7e8007",
  "priya-skyrizi": "d09e5a73-3b2f-48c1-a6d4-1e8f7b2c9008",
  "luis-tremfya": "84a1c6d0-e7f3-4592-b08d-3a6c5e19f009",
  "evelyn-dupixent": "2b7d4f98-6a05-4e3c-91f8-d0c3a7b5e010",
};

export const CLINIC_ID = "demo-clinic-mercy-west";
export const PHARMACY_ID = "ph-summit-0001";

export const clinic = () => ({
  id: CLINIC_ID,
  name: "Mercy West Dermatology",
  specialty: "dermatology",
  email: "frontdesk@mercywestderm.example",
  phone: "(512) 555-0100",
  fax: "(512) 555-0101",
  address: "2100 Barton Springs Rd, Suite 300, Austin, TX 78704",
  npi: "1000000001",
  default_pharmacy_id: PHARMACY_ID,
  default_pharmacy_name: "Summit Specialty Pharmacy",
  main_email_notifications: false,
});

export const profile = () => ({
  first_name: "Rosa",
  last_name: "Kelly",
  phone: "(512) 555-0102",
  npi: null,
  profile_complete: true,
  email: "rosa.kelly@mercywestderm.example",
  clinic_id: CLINIC_ID,
  role: "office_manager",
  can_edit_clinic_settings: true,
  email_prefs: { referral_updates: false, requests: false, appeals: false, notes_on_sent: false, support: false },
});

export const pharmacy = () => ({
  id: PHARMACY_ID,
  name: "Summit Specialty Pharmacy",
  email: "intake@summitspecialty.example",
  phone: "(512) 555-0140",
  fax: "(512) 555-0144",
  alt_phone_fax: null,
  address: "900 Congress Ave, Suite 210",
  city: "Austin",
  state: "TX",
  zip: "78701",
  accepts_no_insurance: false,
  blocked_medications: [],
  contact_email: "intake@summitspecialty.example",
  contact_phone: "(512) 555-0140",
  notes: null,
  is_active: true,
  created_at: iso(200 * DAY),
});

export const formulary = [
  { drug_name: "Dupixent", generic_name: "dupilumab", requires_pa: true },
  { drug_name: "Otezla", generic_name: "apremilast", requires_pa: true },
  { drug_name: "Tremfya", generic_name: "guselkumab", requires_pa: true },
  { drug_name: "Skyrizi", generic_name: "risankizumab", requires_pa: true },
  { drug_name: "Cosentyx", generic_name: "secukinumab", requires_pa: true },
  { drug_name: "Taltz", generic_name: "ixekizumab", requires_pa: true },
  { drug_name: "Adbry", generic_name: "tralokinumab", requires_pa: true },
  { drug_name: "Ebglyss", generic_name: "lebrikizumab", requires_pa: true },
];

export interface DemoPatient {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  phone_primary: string;
  phone_alternate?: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  height: string;
  weight: string;
  allergies: string;
  insurance_type: string;
  insurance_notes: string;
  authorized_representative?: string;
  authorized_representative_phone?: string;
  last_drug: string;
  last_dosage: string;
  pa_status: string;
  pa_expiration_date: string | null;
  created_at: string;
  [k: string]: any;
}

const P = (
  id: string, first: string, last: string, dob: string, gender: string, phone: string,
  street: string, city: string, zip: string, height: string, weight: string, allergies: string,
  insType: string, plan: string, drug: string, dose: string, pa: string, paExp: string | null, createdDays: number,
): DemoPatient => ({
  id, full_name: `${first} ${last}`, first_name: first, last_name: last, dob, gender,
  phone_primary: phone, email: `${first}.${last}@example.com`.toLowerCase(),
  address: street, city, state: "TX", zip, height, weight, allergies,
  insurance_type: insType, insurance_notes: plan, last_drug: drug, last_dosage: dose,
  pa_status: pa, pa_expiration_date: paExp, created_at: iso(createdDays * DAY),
});

export const patients = (): DemoPatient[] => [
  P("pt-margaret-chen", "Margaret", "Chen", "1968-04-12", "Female", "(512) 555-0142", "812 Cedar Ridge Dr", "Austin", "78745", "5'5\"", "148 lb", "Penicillin", "Commercial", "Lone Star Health PPO - Group 48213", "Dupixent", "300 mg", "approved", dateOnly(240), 92),
  P("pt-daniel-okafor", "Daniel", "Okafor", "1991-09-03", "Male", "(512) 555-0167", "2204 Example St Apt 3B", "Austin", "78704", "5'11\"", "186 lb", "None known", "Commercial", "Capital Blue Plan - Group 77120", "Otezla", "30 mg", "approved", dateOnly(120), 71),
  P("pt-priya-natarajan", "Priya", "Natarajan", "1984-01-22", "Female", "(512) 555-0188", "17 Sunset Terrace", "Round Rock", "78664", "5'3\"", "129 lb", "Sulfa drugs", "Commercial", "Lone Star Health PPO - Group 48213", "Skyrizi", "150 mg", "approved", dateOnly(300), 64),
  P("pt-luis-herrera", "Luis", "Herrera", "1975-07-30", "Male", "(512) 555-0199", "630 Mesquite Ln", "Austin", "78753", "5'9\"", "201 lb", "Latex", "Commercial", "Capital Blue Plan - Group 77120", "Skyrizi", "150 mg", "approved", dateOnly(40), 150),
  P("pt-evelyn-brooks", "Evelyn", "Brooks", "1959-11-09", "Female", "(512) 555-0123", "4410 Garfield Ave", "Austin", "78731", "5'2\"", "136 lb", "Iodine contrast", "Medicare", "Medicare Advantage - Sample Plan", "Cosentyx", "150 mg", "none", null, 120),
];

export const patientDrugs = (patientId: string) => {
  const map: Record<string, any[]> = {
    "pt-margaret-chen": [
      { drug_name: "Dupixent", dosage: "300 mg", frequency: "Every 2 weeks", is_active: true, pa_status: "pending", pa_expiration_date: null, last_referral_id: RID["margaret-dupixent"] },
      { drug_name: "Otezla", dosage: "30 mg", frequency: "Twice daily", is_active: true, pa_status: "approved", pa_expiration_date: dateOnly(240), last_referral_id: RID["margaret-otezla"] },
    ],
    "pt-daniel-okafor": [
      { drug_name: "Otezla", dosage: "30 mg", frequency: "Twice daily", is_active: true, pa_status: "approved", pa_expiration_date: dateOnly(120), last_referral_id: RID["daniel-otezla"] },
      { drug_name: "Dupixent", dosage: "300 mg", frequency: "Every 2 weeks", is_active: true, pa_status: "pending", pa_expiration_date: null, last_referral_id: RID["daniel-dupixent"] },
    ],
    "pt-priya-natarajan": [
      { drug_name: "Tremfya", dosage: "100 mg", frequency: "Every 8 weeks", is_active: true, pa_status: "pending", pa_expiration_date: null, last_referral_id: RID["priya-tremfya"] },
      { drug_name: "Skyrizi", dosage: "150 mg", frequency: "Every 12 weeks", is_active: false, pa_status: null, pa_expiration_date: null, last_referral_id: RID["priya-skyrizi"] },
    ],
    "pt-luis-herrera": [
      { drug_name: "Skyrizi", dosage: "150 mg", frequency: "Every 12 weeks", is_active: true, pa_status: "approved", pa_expiration_date: dateOnly(300), last_referral_id: RID["luis-skyrizi"] },
      { drug_name: "Tremfya", dosage: "100 mg", frequency: "Every 8 weeks", is_active: true, pa_status: "pending", pa_expiration_date: null, last_referral_id: RID["luis-tremfya"] },
    ],
    "pt-evelyn-brooks": [
      { drug_name: "Cosentyx", dosage: "150 mg", frequency: "Every 4 weeks", is_active: true, pa_status: null, pa_expiration_date: null, last_referral_id: RID["evelyn-cosentyx"] },
    ],
  };
  return (map[patientId] ?? []).map((d, i) => ({
    id: `${patientId}-drug-${i}`, patient_id: patientId, created_at: iso(30 * DAY), last_filled: dateOnly(-20), ...d,
  }));
};

// ── Referrals ────────────────────────────────────────────────────────────
export interface DemoDoc {
  id: string;
  original_filename: string;
  file_type: string;
  doc_type: string;
  uploaded_at: string;
  from_team?: boolean;
  sampleKey: string; // key into SAMPLE_PDFS
  blobUrl?: string; // runtime only, for files the visitor uploads
}
export interface DemoEvent { event_type: string; created_at: string; metadata?: Record<string, any> }
export interface DemoNote { id: string; author_type: "clinic" | "admin"; author_name: string; content: string; created_at: string }
export interface DemoTask {
  id: string; referral_id: string; instructions: string; status: "open" | "completed" | "cancelled";
  clinic_response: string | null; created_by: string | null; created_at: string | null;
  responded_at: string | null; completed_at: string | null; document_count: number;
  attachments: { id: string; filename: string; doc_type: string }[];
  response_documents: { id: string; filename: string; doc_type: string }[];
}
export interface DemoDelivery {
  pharmacy_name: string; sent_at: string; via: string[];
  documents: { id: string; kind: string; label: string; filename: string }[];
}
export interface DemoReferral {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_dob: string;
  drug_requested: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  pharmacy_name: string | null;
  pharmacy_city: string | null;
  pharmacy_state: string | null;
  pharmacy_phone: string | null;
  clinic_name: string;
  pa_required: boolean;
  pa_status: string | null;
  pa_required_reason: string;
  pa_expiration_date: string | null;
  pa_data: Record<string, any>;
  appeal_outcome: string | null;
  is_bridge_program: boolean;
  insurance_expired: boolean;
  rejection_reason: string | null;
  missing_fields: { missing_documents?: string[]; flagged_fields?: string[] } | null;
  archived: boolean;
  extracted_data: any;
  delivery: DemoDelivery | null;
  documents: DemoDoc[];
  history: DemoEvent[];
  notes: DemoNote[];
  tasks: DemoTask[];
}

export const PROVIDER = {
  name: "Elena Morales", first_name: "Elena", last_name: "Morales", specialty: "Dermatology",
  npi: "1000000001", dea_number: "", address: "2100 Barton Springs Rd, Suite 300", city: "Austin", state: "TX", zip: "78704",
  phone: "(512) 555-0100", fax: "(512) 555-0101", email: "emorales@mercywestderm.example",
  office_contact: "Rosa Kelly", requestor: "", signature_date: dateOnly(-1),
};

interface Spec {
  key: string; // id suffix
  patient: string;
  drug: string;
  dosing: string;
  frequency: string;
  quantity: string;
  icd: string;
  createdAgo: number;
  updatedAgo: number;
  status: string;
  by?: string;
  pa?: { required: boolean; status: string | null; number?: string; ref?: string; exp?: string | null; denial?: string; appeal?: string | null };
  sent?: boolean;
  rejected?: boolean;
  docs: [string, string, string, number][]; // [filename, doc_type, sampleKey, minutes-after-create]
  events: [string, number, Record<string, any>?][]; // [type, minutes-after-create, metadata]
}

const MEMBER_IDS: Record<string, string> = {
  "pt-margaret-chen": "XJK482130771",
  "pt-daniel-okafor": "PBP771200458",
  "pt-priya-natarajan": "XJK482139904",
  "pt-luis-herrera": "1EG4TE5MK73",
  "pt-evelyn-brooks": "3AB9XY2LM41",
};

const ICD: Record<string, string> = {
  Dupixent: "L20.89 Other atopic dermatitis",
  Otezla: "L40.0 Psoriasis vulgaris",
  Tremfya: "L40.0 Psoriasis vulgaris",
  Skyrizi: "L40.0 Psoriasis vulgaris",
  Cosentyx: "L40.0 Psoriasis vulgaris",
};

function build(spec: Spec, patientsList: DemoPatient[]): DemoReferral {
  const pt = patientsList.find((p) => p.id === spec.patient)!;
  const id = RID[spec.key];
  const created = Date.now() - spec.createdAgo;
  const at = (min: number) => new Date(created + min * MIN).toISOString();
  const insured = pt.insurance_type !== "";
  const pa = spec.pa ?? { required: true, status: null };
  const delivered = !!spec.sent;
  return {
    id,
    patient_id: pt.id,
    patient_name: pt.full_name,
    patient_dob: pt.dob,
    drug_requested: spec.drug,
    status: spec.status,
    created_at: new Date(created).toISOString(),
    updated_at: iso(spec.updatedAgo),
    created_by_name: spec.by ?? "Rosa Kelly",
    pharmacy_name: "Summit Specialty Pharmacy",
    pharmacy_city: "Austin",
    pharmacy_state: "TX",
    pharmacy_phone: "(512) 555-0140",
    clinic_name: "Mercy West Dermatology",
    pa_required: pa.required,
    pa_status: pa.status,
    pa_required_reason: pa.required ? "Biologic therapy requires payer approval" : "Not required by this plan",
    pa_expiration_date: pa.exp ?? null,
    pa_data: {
      ...(pa.number ? { pa_number: pa.number } : {}),
      ...(pa.ref ? { reference_number: pa.ref } : {}),
      ...(pa.denial ? { denial_reason: pa.denial } : {}),
    },
    appeal_outcome: pa.appeal ?? null,
    is_bridge_program: false,
    insurance_expired: false,
    rejection_reason: null,
    missing_fields: null,
    archived: false,
    extracted_data: {
      patient: {
        first_name: pt.first_name, last_name: pt.last_name, mi: "", dob: pt.dob, gender: pt.gender,
        phone: pt.phone_primary, email: pt.email, address: pt.address, city: pt.city, state: pt.state, zip: pt.zip,
        height: pt.height, weight: pt.weight, allergies: pt.allergies,
      },
      clinical: {
        diagnosis_icd10: spec.icd, drug_requested: spec.drug, therapy_type: "New Therapy", dosing: spec.dosing,
        frequency: spec.frequency, quantity: spec.quantity, length_of_therapy: "12 months / 3 refills",
        duration_of_therapy: "12 months", administration: "Injection", administration_location: "Patient's Home",
        is_refill: false,
      },
      provider: { ...PROVIDER },
      insurance: {
        has_insurance_card: insured,
        primary_insurance_name: pt.insurance_notes.split(" - ")[0],
        primary_member_id: insured ? MEMBER_IDS[pt.id] : "",
        secondary_insurance_name: "",
        notes: pt.insurance_notes.includes("Group") ? pt.insurance_notes.split(" - ")[1] : "",
      },
      prior_auth: { required: pa.required, handled_by_us: true },
      confidence: {},
    },
    delivery: delivered
      ? {
          pharmacy_name: "Summit Specialty Pharmacy",
          sent_at: at(60 * 26),
          via: ["fax"],
          documents: [
            { id: `${id}-d-packet`, kind: "referral_packet", label: "Referral packet", filename: "referral-packet.pdf" },
            ...(pa.status === "approved"
              ? [{ id: `${id}-d-pa`, kind: "pa_letter", label: "Prior authorization approval letter", filename: "pa-approval-letter.pdf" }]
              : []),
          ],
        }
      : null,
    documents: spec.docs.map(([filename, doc_type, sampleKey, min], i) => ({
      id: `${id}-doc-${i}`, original_filename: filename, file_type: "application/pdf", doc_type,
      uploaded_at: at(min), sampleKey,
    })),
    history: spec.events.map(([event_type, min, metadata]) => ({ event_type, created_at: at(min), metadata })),
    notes: [],
    tasks: [],
  };
}

const BASE_DOCS = (pt: string): [string, string, string, number][] => [
  [`${pt}-referral-form.pdf`, "referral_form", "referral_form", 2],
  [`${pt}-insurance-card.pdf`, "insurance_front", "insurance_front", 3],
  [`${pt}-chart-note.pdf`, "chart_notes", "chart_notes", 4],
];
const INTAKE: [string, number, Record<string, any>?][] = [
  ["referral_created", 0],
  ["document_uploaded", 2, { filename: "referral-form.pdf" }],
  ["document_uploaded", 3, { filename: "insurance-card.pdf" }],
  ["document_uploaded", 4, { filename: "chart-note.pdf" }],
  ["referral_finalized", 5],
];
const EXTRACTED: [string, number][] = [["ai_extraction_completed", 9]];

export const referrals = (): DemoReferral[] => {
  const pts = patients();
  const list: DemoReferral[] = [];
  const add = (s: Spec, patch?: (r: DemoReferral) => void) => {
    const r = build(s, pts);
    patch?.(r);
    list.push(r);
  };

  // 1. Margaret Chen / Dupixent: the scenario target. Defaults to In Review, PA processing.
  add({
    key: "margaret-dupixent", patient: "pt-margaret-chen", drug: "Dupixent", dosing: "300 mg", frequency: "Every 2 weeks",
    quantity: "2 pens / 28 days", icd: ICD.Dupixent, createdAgo: 20 * HOUR, updatedAgo: 19 * HOUR, status: "ready_for_review",
    pa: { required: true, status: "pending" },
    docs: BASE_DOCS("chen"), events: [...INTAKE, ...EXTRACTED],
  });

  // 2. Daniel Okafor / Otezla: In Review with an open task from the team.
  add({
    key: "daniel-otezla", patient: "pt-daniel-okafor", drug: "Otezla", dosing: "30 mg", frequency: "Twice daily",
    quantity: "60 tablets / 30 days", icd: ICD.Otezla, createdAgo: 2 * DAY, updatedAgo: 1 * DAY, status: "ready_for_review",
    pa: { required: true, status: "pending" },
    docs: BASE_DOCS("okafor"),
    events: [...INTAKE, ...EXTRACTED, ["task_created", 60 * 24 * 1 + 30]],
  }, (r) => {
    r.tasks = [{
      id: "task-daniel-1", referral_id: r.id,
      instructions: "Please upload the patient's most recent chart note (within the last 6 months).",
      status: "open", clinic_response: null, created_by: "Mari", created_at: iso(1 * DAY), responded_at: null,
      completed_at: null, document_count: 0, attachments: [], response_documents: [],
    }];
    r.notes = [{
      id: "note-daniel-1", author_type: "admin", author_name: MARI,
      content: "Hi Rosa, the payer asks for a chart note dated within the last 6 months. I opened a request on this referral so you can reply or upload right there.",
      created_at: iso(1 * DAY),
    }];
  });

  // 3. Priya Natarajan / Tremfya: Needs Attention.
  add({
    key: "priya-tremfya", patient: "pt-priya-natarajan", drug: "Tremfya", dosing: "100 mg", frequency: "Every 8 weeks",
    quantity: "1 pen / 56 days", icd: "", createdAgo: 4 * DAY, updatedAgo: 2 * DAY, status: "rejected",
    docs: [["natarajan-referral-form.pdf", "referral_form", "referral_form", 2], ["natarajan-chart-note.pdf", "chart_notes", "chart_notes", 3]],
    events: [
      ["referral_created", 0], ["document_uploaded", 2, { filename: "natarajan-referral-form.pdf" }],
      ["document_uploaded", 3, { filename: "natarajan-chart-note.pdf" }], ["referral_finalized", 5], ...EXTRACTED,
      ["referral_rejected", 60 * 24 * 2, { reason: "The insurance card is missing and the diagnosis code is blank." }],
    ],
  }, (r) => {
    r.rejection_reason = "The insurance card is missing and the diagnosis code is blank.";
    r.missing_fields = { missing_documents: ["insurance_front"], flagged_fields: ["clinical.diagnosis_icd10"] };
    r.extracted_data.insurance.primary_member_id = "";
    r.extracted_data.insurance.has_insurance_card = false;
    r.notes = [{
      id: "note-priya-1", author_type: "admin", author_name: MARI,
      content: "Rosa, once the card is uploaded and the code is fixed, hit Resubmit and we will pick it right back up.",
      created_at: iso(2 * DAY),
    }];
  });

  // 4. Luis Herrera / Skyrizi: sent, PA approved, letter in the delivery.
  add({
    key: "luis-skyrizi", patient: "pt-luis-herrera", drug: "Skyrizi", dosing: "150 mg", frequency: "Every 12 weeks",
    quantity: "1 pen / 84 days", icd: ICD.Skyrizi, createdAgo: 9 * DAY, updatedAgo: 6 * DAY, status: "sent_to_pharmacy", sent: true,
    pa: { required: true, status: "approved", number: "PA-2604417", ref: "A7K9M2QX", exp: dateOnly(300) },
    docs: [...BASE_DOCS("herrera"), ["pa-approval-letter.pdf", "prior_auth", "pa_letter", 60 * 24 * 3]],
    events: [...INTAKE, ...EXTRACTED, ["referral_approved", 60 * 20], ["pa_submitted", 60 * 21], ["pa_approved", 60 * 24 * 3], ["delivery_completed", 60 * 24 * 3 + 30]],
  }, (r) => { if (r.delivery) r.delivery.via = ["email", "fax"]; });

  // 5. Evelyn Brooks / Cosentyx: older, sent, packet only.
  add({
    key: "evelyn-cosentyx", patient: "pt-evelyn-brooks", drug: "Cosentyx", dosing: "150 mg", frequency: "Every 4 weeks",
    quantity: "2 pens / 28 days", icd: ICD.Cosentyx, createdAgo: 34 * DAY, updatedAgo: 33 * DAY, status: "sent_to_pharmacy", sent: true,
    pa: { required: false, status: null },
    docs: BASE_DOCS("brooks"),
    events: [...INTAKE, ...EXTRACTED, ["referral_approved", 60 * 8], ["delivery_completed", 60 * 9]],
  });

  // 6. Margaret Chen / Otezla: approved by the team, about to go out.
  add({
    key: "margaret-otezla", patient: "pt-margaret-chen", drug: "Otezla", dosing: "30 mg", frequency: "Twice daily",
    quantity: "60 tablets / 30 days", icd: ICD.Otezla, createdAgo: 3 * DAY, updatedAgo: 5 * HOUR, status: "approved_to_send",
    pa: { required: true, status: "pending" },
    docs: BASE_DOCS("chen"),
    events: [...INTAKE, ...EXTRACTED, ["referral_approved", 60 * 30]],
  });

  // 7. Daniel Okafor / Dupixent: processing, created minutes ago.
  add({
    key: "daniel-dupixent", patient: "pt-daniel-okafor", drug: "Dupixent", dosing: "300 mg", frequency: "Every 2 weeks",
    quantity: "2 pens / 28 days", icd: ICD.Dupixent, createdAgo: 8 * MIN, updatedAgo: 3 * MIN, status: "processing",
    docs: BASE_DOCS("okafor"), events: INTAKE,
  });

  // 8. Priya Natarajan / Skyrizi: closed after a Level 2 appeal.
  add({
    key: "priya-skyrizi", patient: "pt-priya-natarajan", drug: "Skyrizi", dosing: "150 mg", frequency: "Every 12 weeks",
    quantity: "1 pen / 84 days", icd: ICD.Skyrizi, createdAgo: 60 * DAY, updatedAgo: 14 * DAY, status: "closed",
    pa: { required: true, status: "denied", number: "", ref: "C3D8P1ZT", denial: "Step therapy not met: payer requires a trial of two preferred biologics.", appeal: "level2" },
    docs: BASE_DOCS("natarajan"),
    events: [...INTAKE, ...EXTRACTED, ["referral_approved", 60 * 10], ["pa_submitted", 60 * 11], ["pa_denied", 60 * 24 * 6], ["pa_appeal_started", 60 * 24 * 8], ["pa_appeal_level2", 60 * 24 * 40]],
  });

  // 9. Luis Herrera / Tremfya: In Review, PA in appeal.
  add({
    key: "luis-tremfya", patient: "pt-luis-herrera", drug: "Tremfya", dosing: "100 mg", frequency: "Every 8 weeks",
    quantity: "1 pen / 56 days", icd: ICD.Tremfya, createdAgo: 18 * DAY, updatedAgo: 4 * DAY, status: "ready_for_review",
    pa: { required: true, status: "appeal", ref: "H5R2N8VB", denial: "Documentation of prior topical failures not found." },
    docs: BASE_DOCS("herrera"),
    events: [...INTAKE, ...EXTRACTED, ["referral_approved", 60 * 8], ["pa_submitted", 60 * 10], ["pa_denied", 60 * 24 * 9], ["pa_appeal_started", 60 * 24 * 13]],
  });

  // 10. Evelyn Brooks / Dupixent: draft, no documents yet.
  add({
    key: "evelyn-dupixent", patient: "pt-evelyn-brooks", drug: "Dupixent", dosing: "300 mg", frequency: "Every 2 weeks",
    quantity: "2 pens / 28 days", icd: ICD.Dupixent, createdAgo: 40 * MIN, updatedAgo: 40 * MIN, status: "uploaded",
    docs: [], events: [["referral_created", 0]],
  });

  return list;
};

// Cases ───────────────────────────────────────────────────────────────────
export interface DemoCase {
  id: string; short_id: string; category: "support" | "feedback" | "delivery_issue"; subject: string;
  status: "open" | "in_progress" | "resolved"; referral_id: string | null; referral_short: string | null;
  created_at: string; updated_at: string; resolved_at: string | null;
  messages: { id: string; author_type: "clinic_user" | "admin"; author_name: string; body: string; created_at: string }[];
}

export const MARI = "Mari | Dirxctional Support Team";

export const supportCases = (): DemoCase[] => [
  {
    id: "case-resolved-0001", short_id: "A1B2C3", category: "delivery_issue",
    subject: `Delivery issue \u2014 referral #${RID["luis-skyrizi"].slice(0, 8).toUpperCase()}`,
    status: "resolved", referral_id: RID["luis-skyrizi"], referral_short: RID["luis-skyrizi"].slice(0, 8).toUpperCase(),
    created_at: iso(5 * DAY), updated_at: iso(5 * DAY - 3 * HOUR), resolved_at: iso(5 * DAY - 3 * HOUR),
    messages: [
      { id: "m1", author_type: "clinic_user", author_name: "Rosa Kelly", body: "Summit says they never received Luis Herrera's Skyrizi packet. Can you check?", created_at: iso(5 * DAY) },
      { id: "m2", author_type: "admin", author_name: MARI, body: "Hi Rosa, I called Summit Specialty Pharmacy and re-sent the packet by fax and email. They confirmed receipt and are processing it now. I am marking this resolved, but reply here if anything looks off.", created_at: iso(5 * DAY - 3 * HOUR) },
    ],
  },
  {
    id: "case-open-0002", short_id: "D4E5F6", category: "support", subject: "Adding a new provider",
    status: "open", referral_id: null, referral_short: null, created_at: iso(3 * HOUR), updated_at: iso(3 * HOUR), resolved_at: null,
    messages: [
      { id: "m4", author_type: "clinic_user", author_name: "Rosa Kelly", body: "Hi, we have a new provider joining the practice next month. How do I add her so she can sign referrals?", created_at: iso(3 * HOUR) },
    ],
  },
];
