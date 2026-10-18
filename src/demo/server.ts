// In-memory fake of the Dirxctional clinic API for the product-tour demo.
// main.tsx routes every fetch to "/demo-api/*" here; nothing leaves the page.
import {
  CLINIC_ID, MARI, PROVIDER, RID, SAMPLE_PDFS, clinic, formulary, iso, patientDrugs, patients, pharmacy, profile,
  referrals, supportCases, dateOnly,
  type DemoCase, type DemoDoc, type DemoPatient, type DemoReferral,
} from "./fixtures";

type Json = Record<string, any>;
export interface DemoResponse { status: number; body: Json }

const HOUR = 3_600_000;
const MARGARET = RID["margaret-dupixent"];

interface Store {
  clinic: Json;
  profile: Json;
  patients: DemoPatient[];
  referrals: DemoReferral[];
  cases: DemoCase[];
  services: { active: Json[]; pending: Json[] };
  seq: number;
}

const activeAddon = (): Json => ({
  id: "ca-eligibility-1", addon_id: "addon-eligibility", addon_code: "eligibility", addon_name: "Real-time eligibility checks",
  addon_description: "Verify coverage before every referral goes out.", addon_icon: "ShieldCheck", quantity: 1,
  monthly_price_cents: 9900, monthly_price_usd: 99, status: "active", activated_at: iso(30 * 24 * HOUR), notes: null,
});

const fresh = (): Store => ({
  clinic: clinic(),
  profile: profile(),
  patients: patients(),
  referrals: referrals(),
  cases: supportCases(),
  services: { active: [activeAddon()], pending: [] },
  seq: 100,
});

let store: Store = fresh();
let onChange: () => void = () => {};
const timers = new Set<ReturnType<typeof setTimeout>>();
export const setOnChange = (fn: () => void) => { onChange = fn; };

const later = (ms: number, fn: () => void) => {
  const t = setTimeout(() => { timers.delete(t); fn(); onChange(); }, ms);
  timers.add(t);
};
const nextId = (prefix: string) => `${prefix}-${++store.seq}`;
const hexId = () => {
  const h = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
  return `${h()}-${h().slice(0, 4)}-4${h().slice(0, 3)}-a${h().slice(0, 3)}-${h()}${h().slice(0, 4)}`;
};
const nowIso = () => new Date().toISOString();
const abs = (u: string) => (typeof document !== "undefined" ? new URL(u, document.baseURI).href : u);

export function resetStore() {
  timers.forEach(clearTimeout);
  timers.clear();
  store = fresh();
  onChange();
}

// ── Scenarios: move the Margaret Chen / Dupixent referral through its life ──
export const SCENARIOS = ["processing", "in_review", "task_open", "needs_attention", "approved", "sent"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export function applyScenario(name: string): boolean {
  if (!(SCENARIOS as readonly string[]).includes(name)) return false;
  const idx = store.referrals.findIndex((r) => r.id === MARGARET);
  if (idx < 0) return false;
  timers.forEach(clearTimeout);
  timers.clear();
  const r = referrals().find((x) => x.id === MARGARET)!;
  const min = (m: number) => new Date(new Date(r.created_at).getTime() + m * 60_000).toISOString();
  const ev = (event_type: string, m: number, metadata?: Json) => r.history.push({ event_type, created_at: min(m), metadata });

  switch (name as Scenario) {
    case "processing": {
      r.status = "processing";
      r.created_at = iso(9 * 60_000);
      r.updated_at = iso(4 * 60_000);
      r.history = r.history.filter((e) => e.event_type !== "ai_extraction_completed");
      r.history = r.history.map((e, i) => ({ ...e, created_at: new Date(new Date(r.created_at).getTime() + i * 60_000).toISOString() }));
      break;
    }
    case "in_review":
      break;
    case "needs_attention": {
      r.status = "rejected";
      r.rejection_reason =
        "We could not find the front of the patient's insurance card, and the diagnosis code is blank. Please upload the card and add the full ICD-10 code, for example L20.89 for other atopic dermatitis, then resubmit.";
      r.missing_fields = { missing_documents: ["insurance_front"], flagged_fields: ["clinical.diagnosis_icd10"] };
      r.extracted_data.clinical.diagnosis_icd10 = "";
      r.extracted_data.insurance.primary_member_id = "";
      r.documents = r.documents.filter((d) => d.doc_type !== "insurance_front");
      ev("referral_rejected", 60 * 18, { reason: "Insurance card (front) missing and the diagnosis code is blank." });
      r.updated_at = iso(2 * HOUR);
      r.notes = [{
        id: "note-margaret-1", author_type: "admin", author_name: MARI, created_at: iso(2 * HOUR),
        content: "Rosa, almost there. Add the front of Margaret's card and the diagnosis code, then hit Resubmit.",
      }];
      break;
    }
    case "approved": {
      r.status = "approved_to_send";
      r.pa_status = "pending";
      ev("referral_approved", 60 * 19);
      r.updated_at = iso(1 * HOUR);
      break;
    }
    case "sent": {
      r.status = "sent_to_pharmacy";
      r.pa_status = "approved";
      r.pa_expiration_date = dateOnly(300);
      r.pa_data = { pa_number: "PA-2611093", reference_number: "M4Q7T2WK" };
      r.delivery = {
        pharmacy_name: "Summit Specialty Pharmacy", sent_at: iso(1 * HOUR), via: ["email", "fax"],
        documents: [
          { id: `${r.id}-d-packet`, kind: "referral_packet", label: "Referral packet", filename: "referral-packet.pdf" },
          { id: `${r.id}-d-pa`, kind: "pa_letter", label: "Prior authorization approval letter", filename: "pa-approval-letter.pdf" },
        ],
      };
      r.documents.push({ id: `${r.id}-doc-pa`, original_filename: "pa-approval-letter.pdf", file_type: "application/pdf", doc_type: "prior_auth", uploaded_at: iso(2 * HOUR), sampleKey: "pa_letter" });
      ev("referral_approved", 60 * 17); ev("pa_submitted", 60 * 17 + 5); ev("pa_approved", 60 * 18); ev("delivery_completed", 60 * 19);
      r.updated_at = iso(1 * HOUR);
      break;
    }
    case "task_open": {
      ev("task_created", 60 * 19);
      r.tasks = [{
        id: "task-margaret-1", referral_id: r.id, instructions: "Please upload the patient's most recent chart note (within the last 6 months).", status: "open",
        clinic_response: null, created_by: "Mari", created_at: iso(30 * 60_000), responded_at: null, completed_at: null,
        document_count: 0, attachments: [], response_documents: [],
      }];
      r.updated_at = iso(30 * 60_000);
      break;
    }
  }
  store.referrals[idx] = r;
  onChange();
  return true;
}

// ── Views ────────────────────────────────────────────────────────────────
const openTasks = (r: DemoReferral) => r.tasks.filter((t) => t.status === "open");
const latest = (notes: DemoReferral["notes"], type: "admin" | "clinic") =>
  notes.filter((n) => n.author_type === type).map((n) => n.created_at).sort().pop() ?? null;

function view(r: DemoReferral): Json {
  const { documents: _d, history: _h, notes, tasks: _t, ...rest } = r;
  const open = openTasks(r);
  return {
    ...rest,
    open_task_count: open.length,
    open_task_preview: open[0]?.instructions ?? null,
    latest_admin_note_at: latest(notes, "admin"),
    latest_clinic_note_at: latest(notes, "clinic"),
  };
}

const docView = (d: DemoDoc) => {
  const { sampleKey: _s, blobUrl: _b, ...rest } = d;
  return rest;
};

const caseView = (c: DemoCase): Json => {
  const last = c.messages[c.messages.length - 1];
  return {
    id: c.id, short_id: c.short_id, clinic_id: CLINIC_ID, clinic_name: store.clinic.name, category: c.category,
    subject: c.subject, status: c.status, referral_id: c.referral_id, referral_short: c.referral_short,
    assigned_admin_id: null, assigned_admin_name: c.messages.some((m) => m.author_type === "admin") ? "Mari" : null,
    created_at: c.created_at, updated_at: c.updated_at, resolved_at: c.resolved_at,
    last_message_at: last?.created_at ?? c.updated_at, last_author_type: last?.author_type ?? null,
    needs_reply: false,
  };
};

const find = (id: string) => store.referrals.find((r) => r.id === id);
const addEvent = (r: DemoReferral, event_type: string, metadata?: Json) => {
  r.history.push({ event_type, created_at: nowIso(), metadata });
  r.updated_at = nowIso();
};
const bad = (status: number, error: string): DemoResponse => ({ status, body: { error } });
const ok = (body: Json = { ok: true }): DemoResponse => ({ status: 200, body });

function deepMerge(target: Json, patch: Json) {
  for (const [k, v] of Object.entries(patch ?? {})) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      target[k] = deepMerge(target[k] && typeof target[k] === "object" ? target[k] : {}, v);
    } else target[k] = v;
  }
  return target;
}
const fillMissing = (target: Json, defaults: Json) => {
  for (const [k, v] of Object.entries(defaults)) if (target[k] === undefined || target[k] === "" || target[k] === null) target[k] = v;
  return target;
};

// The "AI extraction" that completes a few seconds after a referral is submitted.
function completeExtraction(r: DemoReferral) {
  const pt = store.patients.find((p) => p.id === r.patient_id);
  const ed = r.extracted_data;
  const drug = ed.clinical?.drug_requested || r.drug_requested || pt?.last_drug || "Dupixent";
  const icd = drug === "Dupixent" ? "L20.89 Other atopic dermatitis" : "L40.0 Psoriasis vulgaris";
  fillMissing((ed.clinical ||= {}), {
    diagnosis_icd10: icd, drug_requested: drug, therapy_type: "New Therapy", dosing: "Per label", frequency: "Per label",
    quantity: "1 month supply", administration: "Injection", administration_location: "Patient's Home", is_refill: false,
  });
  fillMissing((ed.provider ||= {}), { ...PROVIDER });
  fillMissing((ed.patient ||= {}), pt ? {
    first_name: pt.first_name, last_name: pt.last_name, dob: pt.dob, gender: pt.gender, phone: pt.phone_primary,
    email: pt.email, address: pt.address, city: pt.city, state: pt.state, zip: pt.zip,
  } : {});
  const ins = (ed.insurance ||= {});
  if (!r.is_bridge_program) {
    fillMissing(ins, { has_insurance_card: true, primary_insurance_name: pt?.insurance_notes?.split(" - ")[0] || "Lone Star Health PPO", primary_member_id: "XJK482100123" });
  }
  ed.prior_auth = { required: !r.is_bridge_program, handled_by_us: true };
  ed.confidence = {};
  r.drug_requested = drug;
  r.status = "ready_for_review";
  addEvent(r, "ai_extraction_completed");
}

// ── Router ───────────────────────────────────────────────────────────────
type Handler = (m: RegExpMatchArray, q: URLSearchParams, body: any, method: string) => DemoResponse | Promise<DemoResponse>;
const routes: { method: string; re: RegExp; fn: Handler }[] = [];
const on = (method: string | string[], pattern: string, fn: Handler) => {
  for (const mm of Array.isArray(method) ? method : [method]) {
    routes.push({ method: mm, re: new RegExp("^" + pattern.replace(/:[a-zA-Z]+/g, "([^/]+)") + "/?$"), fn });
  }
};

// Current user / clinic
on("GET", "/clinics/me", () => ok(store.clinic));
on(["PATCH", "PUT"], "/clinics/me", (_m, _q, b) => {
  Object.assign(store.clinic, b);
  if ("default_pharmacy_id" in b) store.clinic.default_pharmacy_name = b.default_pharmacy_id ? pharmacy().name : null;
  return ok(store.clinic);
});
on("GET", "/clinics/me/profile", () => ok(store.profile));
on(["PATCH", "PUT"], "/clinics/me/profile", (_m, _q, b) => ok(Object.assign(store.profile, b, { profile_complete: true })));
on("GET", "/clinics/me/consent-status", () => ok({
  needs_acceptance: false,
  current_versions: { tos_version: "2026-08", privacy_version: "2026-08" },
  user_versions: { tos_version: "2026-08", privacy_version: "2026-08" },
}));
on("POST", "/clinics/me/consent", () => ok());

// Services / add-ons
const catalog = () => [
  { id: "addon-eligibility", code: "eligibility", name: "Real-time eligibility checks", description: "Verify coverage before every referral goes out.", monthly_price_cents: 9900, monthly_price_usd: 99, icon: "ShieldCheck", active: true },
  { id: "addon-analytics", code: "analytics", name: "Referral analytics", description: "Turnaround, approval rates and denial reasons by drug and payer.", monthly_price_cents: 14900, monthly_price_usd: 149, icon: "BarChart3", active: true },
  { id: "addon-seats", code: "seats", name: "Extra team seats", description: "Add office staff beyond the seats included in your plan.", monthly_price_cents: 4900, monthly_price_usd: 49, icon: "Users", active: true },
];
on("GET", "/clinics/me/services", () => {
  const taken = (id: string) => store.services.active.some((a) => a.addon_id === id) ? "active" : store.services.pending.some((p) => p.addon_id === id) ? "requested" : "available";
  return ok({
    clinic: { id: CLINIC_ID, name: store.clinic.name, specialty: "dermatology" },
    active_addons: store.services.active,
    pending_requests: store.services.pending,
    catalog: catalog().map((c) => ({ ...c, state: taken(c.id) })),
  });
});
on("POST", "/clinics/me/addon-requests", (_m, _q, b) => {
  const c = catalog().find((x) => x.id === b.addon_id);
  if (!c) return bad(404, "Add-on not found");
  const req = {
    id: nextId("req"), addon_id: c.id, addon_code: c.code, addon_name: c.name, addon_icon: c.icon,
    monthly_price_cents: c.monthly_price_cents, monthly_price_usd: c.monthly_price_usd, status: "pending",
    requested_at: nowIso(), clinic_notes: b.clinic_notes ?? null,
  };
  store.services.pending.push(req);
  return ok(req);
});
on("DELETE", "/clinics/me/addon-requests/:id", (m) => {
  store.services.pending = store.services.pending.filter((p) => p.id !== m[1]);
  return ok({ ok: true, id: m[1], status: "cancelled" });
});

// Pharmacies + formulary
on("GET", "/pharmacies", () => ok({ items: [pharmacy()] }));
on("GET", "/pharmacies/:id", () => ok(pharmacy()));
on("GET", "/referrals/drugs", (_m, q) => {
  const term = (q.get("q") || "").toLowerCase();
  return ok({ items: formulary.filter((d) => !term || d.drug_name.toLowerCase().includes(term) || (d.generic_name || "").toLowerCase().includes(term)) });
});

// Patients
on("GET", "/patients", (_m, q) => {
  const s = (q.get("search") || "").toLowerCase().trim();
  const items = store.patients.filter((p) => !s || p.full_name.toLowerCase().includes(s));
  return ok({ items });
});
on("POST", "/patients", (_m, _q, b) => {
  const full = (b.full_name || [b.first_name, b.last_name].filter(Boolean).join(" ")).trim() || "New Patient";
  const [first, ...rest] = full.split(" ");
  const p: DemoPatient = {
    first_name: first, last_name: rest.join(" "), phone_primary: b.phone_primary || b.phone || "", email: "", address: "", city: "",
    state: "", zip: "", height: "", weight: "", allergies: "", insurance_type: "", insurance_notes: "", gender: "", dob: "",
    last_drug: "", last_dosage: "", pa_status: "none", pa_expiration_date: null,
    ...b, id: `pt-new-${++store.seq}`, full_name: full, created_at: nowIso(),
  };
  store.patients.unshift(p);
  return ok(p);
});
on("GET", "/patients/:id", (m) => {
  const p = store.patients.find((x) => x.id === m[1]);
  return p ? ok(p) : bad(404, "Patient not found");
});
on("PUT", "/patients/:id", (m, _q, b) => {
  const p = store.patients.find((x) => x.id === m[1]);
  if (!p) return bad(404, "Patient not found");
  Object.assign(p, b);
  if (b.full_name) { const [f, ...r] = String(b.full_name).split(" "); p.first_name = f; p.last_name = r.join(" "); }
  return ok(p);
});
on("GET", "/patients/:id/drugs", (m) => ok({ drugs: patientDrugs(m[1]) }));

// Referrals: collection
const inMonth = (iso: string, month: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` === month;
};
on("GET", "/referrals", (_m, q) => {
  const month = q.get("month");
  const archived = q.get("archived") === "true";
  const items = store.referrals
    .filter((r) => r.archived === archived)
    .filter((r) => !month || month === "all" || inMonth(r.created_at, month))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .map(view);
  return ok({ items });
});
on("GET", "/referrals/action-needed/count", () =>
  ok({ count: store.referrals.filter((r) => !r.archived).reduce((n, r) => n + openTasks(r).length, 0) }));
on("POST", "/referrals", (_m, _q, b) => {
  const pt = store.patients.find((p) => p.id === b.patient_id);
  if (!pt) return bad(400, "Choose a patient first");
  const id = hexId();
  const ed = b.extracted_data ?? {};
  const r: DemoReferral = {
    id, patient_id: pt.id, patient_name: pt.full_name, patient_dob: pt.dob, drug_requested: b.drug_requested || "",
    status: "uploaded", created_at: nowIso(), updated_at: nowIso(), created_by_name: "Rosa Kelly",
    pharmacy_name: b.target_pharmacy_id ? pharmacy().name : null, pharmacy_city: "Austin", pharmacy_state: "TX", pharmacy_phone: "(512) 555-0140",
    clinic_name: store.clinic.name, pa_required: !b.is_bridge_program, pa_status: null,
    pa_required_reason: b.is_bridge_program ? "Bridge program" : "Biologic therapy requires payer approval",
    pa_expiration_date: null, pa_data: {}, appeal_outcome: null, is_bridge_program: !!b.is_bridge_program, insurance_expired: false,
    rejection_reason: null, missing_fields: null, archived: false, extracted_data: { ...ed, patient: { ...(ed.patient ?? {}) } },
    delivery: null, documents: [], history: [], notes: [], tasks: [],
  };
  addEvent(r, "referral_created");
  r.created_at = r.history[0].created_at;
  store.referrals.unshift(r);
  return ok(view(r));
});

// Referrals: one
on("GET", "/referrals/:id", (m) => { const r = find(m[1]); return r ? ok(view(r)) : bad(404, "Referral not found"); });
on("PATCH", "/referrals/:id", (m, _q, b) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  deepMerge(r.extracted_data, b);
  if (b.patient?.first_name || b.patient?.last_name) {
    r.patient_name = `${r.extracted_data.patient.first_name || ""} ${r.extracted_data.patient.last_name || ""}`.trim() || r.patient_name;
  }
  if (b.clinical?.drug_requested) r.drug_requested = b.clinical.drug_requested;
  addEvent(r, "referral_edited_by_clinic");
  return ok(view(r));
});
on("PUT", "/referrals/:id/insurance", (m, _q, b) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  deepMerge(r.extracted_data.insurance, b.insurance ?? {});
  r.insurance_expired = false;
  return ok(view(r));
});
on("POST", "/referrals/:id/archive", (m) => { const r = find(m[1]); if (!r) return bad(404, "Referral not found"); r.archived = true; addEvent(r, "referral_archived"); return ok(); });
on("POST", "/referrals/:id/unarchive", (m) => { const r = find(m[1]); if (!r) return bad(404, "Referral not found"); r.archived = false; addEvent(r, "referral_unarchived"); return ok(); });

on("GET", "/referrals/:id/history", (m) => {
  const r = find(m[1]);
  return r ? ok({ items: [...r.history].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)) }) : bad(404, "Referral not found");
});
on("GET", "/referrals/:id/documents", (m) => {
  const r = find(m[1]);
  return r ? ok({ items: r.documents.map(docView) }) : bad(404, "Referral not found");
});
on("POST", "/referrals/:id/documents", (m, _q, b) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  const file: File | null = b instanceof FormData ? (b.get("file") as File | null) : null;
  const docType = (b instanceof FormData ? (b.get("doc_type") as string) : "") || "other";
  const taskId = b instanceof FormData ? (b.get("task_id") as string | null) : null;
  const name = file?.name || "document.pdf";
  const doc: DemoDoc = {
    id: nextId(`${r.id}-doc`), original_filename: name, file_type: file?.type || "application/pdf", doc_type: docType,
    uploaded_at: nowIso(), sampleKey: SAMPLE_PDFS[docType] ? docType : "other",
    blobUrl: file && (file.type === "application/pdf" || file.type.startsWith("image/")) ? URL.createObjectURL(file) : undefined,
  };
  r.documents.push(doc);
  addEvent(r, "document_uploaded", { filename: name });
  const task = taskId ? r.tasks.find((t) => t.id === taskId) : undefined;
  if (task) {
    task.response_documents.push({ id: doc.id, filename: name, doc_type: docType });
    task.document_count = task.response_documents.length;
  }
  return ok(docView(doc));
});
const docUrl = (d: DemoDoc | undefined) => d && { url: d.blobUrl || abs(SAMPLE_PDFS[d.sampleKey] ?? SAMPLE_PDFS.other), filename: d.original_filename, expires_in: 900 };
on("GET", "/referrals/:id/documents/:docId/url", (m) => {
  const r = find(m[1]);
  const body = docUrl(r?.documents.find((d) => d.id === m[2]));
  return body ? ok(body) : bad(404, "Document not found");
});
on("GET", "/referrals/:id/delivery/documents/:docId/url", (m) => {
  const r = find(m[1]);
  const d = r?.delivery?.documents.find((x) => x.id === m[2]);
  if (!r || !d) return bad(404, "Document not found");
  return ok({ url: abs(SAMPLE_PDFS[d.kind === "pa_letter" ? "pa_letter" : "referral_packet"]), filename: d.filename, expires_in: 900 });
});

on("GET", "/referrals/:id/notes", (m) => {
  const r = find(m[1]);
  return r ? ok({ items: [...r.notes].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)) }) : bad(404, "Referral not found");
});
on("POST", "/referrals/:id/notes", (m, _q, b) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  const note = { id: nextId("note"), author_type: "clinic" as const, author_name: "Rosa Kelly", content: String(b.content || ""), created_at: nowIso() };
  r.notes.push(note);
  return ok(note);
});

on("GET", "/referrals/:id/tasks", (m) => {
  const r = find(m[1]);
  return r ? ok({ items: r.tasks }) : bad(404, "Referral not found");
});
on("POST", "/referrals/:id/tasks/:taskId/respond", (m, _q, b) => {
  const r = find(m[1]);
  const t = r?.tasks.find((x) => x.id === m[2]);
  if (!r || !t) return bad(404, "Task not found");
  t.clinic_response = String(b.message || "");
  t.responded_at = nowIso();
  t.status = "completed";
  t.completed_at = nowIso();
  addEvent(r, "task_completed");
  return ok({ task: t });
});

on("POST", "/referrals/:id/finalize", (m) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  r.status = "processing";
  addEvent(r, "referral_finalized");
  later(3000, () => completeExtraction(r));
  return ok(view(r));
});
on("POST", "/referrals/:id/resubmit", (m) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  r.status = "processing";
  r.rejection_reason = null;
  r.missing_fields = null;
  addEvent(r, "referral_resubmitted");
  later(3000, () => {
    r.status = "ready_for_review";
    addEvent(r, "ai_extraction_completed");
  });
  return ok(view(r));
});
on("POST", "/referrals/:id/delivery-issue", (m, _q, b) => {
  const r = find(m[1]);
  if (!r) return bad(404, "Referral not found");
  const c: DemoCase = {
    id: nextId("case"), short_id: Math.random().toString(16).slice(2, 8).toUpperCase(), category: "delivery_issue",
    subject: `Delivery issue: ${r.patient_name} (${r.drug_requested})`, status: "open", referral_id: r.id,
    referral_short: r.id.slice(0, 8).toUpperCase(), created_at: nowIso(), updated_at: nowIso(), resolved_at: null,
    messages: [{ id: nextId("msg"), author_type: "clinic_user", author_name: "Rosa Kelly", body: String(b.details || ""), created_at: nowIso() }],
  };
  store.cases.unshift(c);
  addEvent(r, "delivery_issue_reported");
  autoReply(c, "Thanks Rosa, this is our top priority. I am calling Summit Specialty Pharmacy right now to confirm they received the packet and I will update you here within the hour.");
  return ok({ ok: true, case_id: c.id, note_id: nextId("note") });
});

// Support
function autoReply(c: DemoCase, body: string) {
  later(4000, () => {
    c.messages.push({ id: nextId("msg"), author_type: "admin", author_name: MARI, body, created_at: nowIso() });
    c.updated_at = nowIso();
  });
}
on("GET", "/support/summary", () => {
  const admin = store.cases.flatMap((c) => c.messages.filter((m) => m.author_type === "admin").map((m) => m.created_at)).sort().pop() ?? null;
  return ok({ open_cases: store.cases.filter((c) => c.status !== "resolved").length, latest_admin_at: admin });
});
on("GET", "/support/cases", () => ok({ items: store.cases.map(caseView) }));
on("POST", "/support/cases", (_m, _q, b) => {
  const body = String(b.body || "");
  const ref = b.referral_id ? find(b.referral_id) : undefined;
  const c: DemoCase = {
    id: nextId("case"), short_id: Math.random().toString(16).slice(2, 8).toUpperCase(),
    category: b.category === "feedback" ? "feedback" : "support",
    subject: b.subject || (body.length > 70 ? body.slice(0, 67) + "..." : body), status: "open",
    referral_id: ref?.id ?? null, referral_short: ref ? ref.id.slice(0, 8).toUpperCase() : null,
    created_at: nowIso(), updated_at: nowIso(), resolved_at: null,
    messages: [{ id: nextId("msg"), author_type: "clinic_user", author_name: "Rosa Kelly", body, created_at: nowIso() }],
  };
  store.cases.unshift(c);
  autoReply(c, c.category === "feedback"
    ? "Thank you for the feedback, Rosa. I have passed it to the product team and we will let you know if we ship something because of it."
    : "Thanks Rosa, I have your message and I am looking into it now. I will reply here shortly.");
  return ok(caseView(c));
});
on("GET", "/support/cases/:id", (m) => {
  const c = store.cases.find((x) => x.id === m[1]);
  return c ? ok({ case: caseView(c), messages: c.messages }) : bad(404, "Case not found");
});
on("POST", "/support/cases/:id/messages", (m, _q, b) => {
  const c = store.cases.find((x) => x.id === m[1]);
  if (!c) return bad(404, "Case not found");
  c.messages.push({ id: nextId("msg"), author_type: "clinic_user", author_name: "Rosa Kelly", body: String(b.body || ""), created_at: nowIso() });
  c.updated_at = nowIso();
  if (c.status === "resolved") { c.status = "open"; c.resolved_at = null; }
  return ok(caseView(c));
});

// ── Entry point used by the fetch shim ──────────────────────────────────
async function handleRequest(method: string, rawPath: string, query: URLSearchParams, body: any): Promise<DemoResponse> {
  const path = rawPath.replace(/\/+$/, "") || "/";
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = path.match(r.re);
    if (m) return r.fn(m, query, body, method);
  }
  console.warn(`[demo-api] unhandled ${method} ${path}`);
  return { status: 404, body: { error: `Not available in the demo: ${method} ${path}` } };
}

// ── Public contract used by main.tsx ─────────────────────────────────────
export function setScenario(name: string): void {
  if (!applyScenario(name)) console.warn("[demo-api] unknown scenario", name);
}

export async function handleDemoRequest(method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const q = path.indexOf("?");
  const pathname = q >= 0 ? path.slice(0, q) : path;
  const query = new URLSearchParams(q >= 0 ? path.slice(q + 1) : "");
  const res = await handleRequest(method.toUpperCase(), pathname, query, body ?? {});
  return { status: res.status, json: res.body };
}
