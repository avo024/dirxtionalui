import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Plus, User, Shield, Copy, FileText, Pill, ClipboardList,
  Loader2, Pencil, Save, X, Eye, AlertTriangle, Check,
} from "lucide-react";
import { clinicApi } from "@/lib/api";
import { formatDateShort } from "@/lib/dateUtils";
import { toast } from "sonner";
import "./wizard.css";
import "./patient.css";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];
const GENDERS = ["Male", "Female", "Other", "Prefer not to say"];

const formatDateForInput = (s: string | null | undefined): string => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s as string;
  return d.toISOString().split("T")[0];
};
const getAge = (dob: string) => {
  const b = new Date(dob);
  const t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) age--;
  return age;
};

type Tone = "success" | "approved" | "warning" | "error" | "rejected" | "muted" | "processing" | "review" | "sent" | "uploaded";

// PA badge for a medication — verbatim logic from the original page.
function getDrugPABadge(drug: any): { label: string; tone: Tone } {
  const today = new Date();
  if (drug.is_active === false) return { label: "Discontinued", tone: "muted" };
  if (drug.pa_status === "appeal") return { label: "PA In Appeal", tone: "error" };
  if (drug.pa_status === "denied") return { label: "PA Denied", tone: "error" };
  if (["pending", "submitted", "processing"].includes(drug.pa_status)) return { label: "PA Pending", tone: "warning" };
  if (drug.pa_status === "approved" && drug.pa_expiration_date) {
    const exp = new Date(drug.pa_expiration_date);
    if (exp < today) return { label: "PA Expired", tone: "error" };
    const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
    if (days <= 30) return { label: "PA Expiring Soon", tone: "warning" };
    return { label: "PA Active", tone: "success" };
  }
  if (drug.pa_status === "approved") return { label: "PA Active", tone: "success" };
  return { label: "No PA", tone: "muted" };
}
// Referral status → tone + label (real status values).
function refStatusBadge(status: string): [Tone, string] {
  const m: Record<string, [Tone, string]> = {
    uploaded: ["uploaded", "Uploaded"], processing: ["processing", "Processing"],
    ready_for_review: ["review", "Ready for review"], needs_info: ["uploaded", "Needs info"],
    approved_to_send: ["approved", "Approved"], sent_to_pharmacy: ["sent", "Sent to pharmacy"],
    rejected: ["rejected", "Needs Attention"],
  };
  return m[status] || ["uploaded", status || "—"];
}
function clinicPABadge(status: string | null | undefined): [Tone, string] {
  const m: Record<string, [Tone, string]> = {
    none: ["muted", "No PA"], pending: ["uploaded", "PA Pending"], submitted: ["review", "PA Submitted"],
    processing: ["processing", "PA In Progress"], approved: ["approved", "PA Approved"], denied: ["rejected", "PA Denied"],
    appeal: ["rejected", "PA In Appeal"],
  };
  return m[status || "none"] || ["uploaded", "PA Pending"];
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`pd-badge ${tone}`}>{children}</span>;
}
function Btn({ variant = "outline", sm, children, ...rest }: any) {
  return <button className={`rw-btn ${variant}${sm ? " sm" : ""}`} {...rest}>{children}</button>;
}

const INFO_GROUPS = [
  { key: "personal", label: "Personal Information", fields: [
    { key: "full_name", label: "Full Name" },
    { key: "dob", label: "Date of Birth", kind: "date" },
    { key: "gender", label: "Gender", kind: "select", options: GENDERS },
    { key: "email", label: "Email", copy: true },
  ]},
  { key: "contact", label: "Contact", fields: [
    { key: "phone_primary", label: "Phone", copy: true },
    { key: "phone_alternate", label: "Alternate Phone" },
    { key: "address", label: "Street Address", span: true },
    { key: "city", label: "City" },
    { key: "state", label: "State", kind: "select", options: US_STATES },
    { key: "zip", label: "Zip" },
  ]},
  { key: "medical", label: "Medical", fields: [
    { key: "height", label: "Height" },
    { key: "weight", label: "Weight" },
    { key: "allergies", label: "Allergies", kind: "textarea", span: true },
  ]},
  { key: "guardian", label: "Guardian / Authorized Representative", fields: [
    { key: "authorized_representative", label: "Authorized Representative" },
    { key: "authorized_representative_phone", label: "Representative Phone" },
  ]},
] as const;

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<any>(null);
  const [medications, setMedications] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [medsLoading, setMedsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("history");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const loadPatient = () => {
    if (!id) return;
    setLoading(true);
    clinicApi.getPatient(id).then((data) => setPatient(data)).catch(() => setError("Failed to load patient")).finally(() => setLoading(false));
  };
  useEffect(() => { loadPatient(); }, [id]);
  useEffect(() => {
    if (!id) return;
    setMedsLoading(true);
    clinicApi.getPatientDrugs(id).then((data) => setMedications(data.drugs || [])).catch(() => setMedications([])).finally(() => setMedsLoading(false));
  }, [id]);
  useEffect(() => {
    if (!id) return;
    clinicApi.getReferrals().then((data) => setReferrals((data.items || []).filter((r: any) => r.patient_id === id))).catch(() => setReferrals([]));
  }, [id]);

  const sortedMedications = useMemo(() => [...medications].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    const ad = a.pa_expiration_date ? new Date(a.pa_expiration_date).getTime() : Infinity;
    const bd = b.pa_expiration_date ? new Date(b.pa_expiration_date).getTime() : Infinity;
    return ad - bd;
  }), [medications]);

  const beginEdit = () => {
    setDraft({
      full_name: patient.full_name || "", dob: formatDateForInput(patient.dob), gender: patient.gender || "",
      phone_primary: patient.phone_primary || "", phone_alternate: patient.phone_alternate || "", email: patient.email || "",
      address: patient.address || "", city: patient.city || "", state: patient.state || "", zip: patient.zip || "",
      height: patient.height || "", weight: patient.weight || "", allergies: patient.allergies || "",
      authorized_representative: patient.authorized_representative || "", authorized_representative_phone: patient.authorized_representative_phone || "",
    });
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setDraft({}); };
  const saveEdits = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await clinicApi.updatePatient(id, draft);
      toast.success("Patient updated successfully");
      setEditing(false);
      loadPatient();
    } catch (err: any) {
      toast.error(err.message || "Failed to update patient");
    } finally { setSaving(false); }
  };
  const setField = (k: string, v: string) => setDraft((d: any) => ({ ...d, [k]: v }));
  const copy = (text: string, label: string) => { navigator.clipboard?.writeText(text); toast.success(`${label} copied to clipboard`); };

  if (loading) return <div className="rw-page" style={{ display: "flex", justifyContent: "center", padding: 80 }}><span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span></div>;
  if (error || !patient) return (
    <div className="rw-page" style={{ textAlign: "center", padding: 80 }}>
      <p style={{ color: "var(--text-muted)" }}>{error || "Patient not found"}</p>
      <Btn variant="outline" style={{ marginTop: 16 }} onClick={() => navigate("/clinic/patients")}>Back to Patients</Btn>
    </div>
  );

  const fullName = patient.full_name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "—";
  const firstName = patient.full_name?.split(" ")[0] || "Patient";
  const [paTone, paLabel] = clinicPABadge(patient.pa_status);

  return (
    <div className="rw-page pd-page rw-fade">
      {/* Bar A — back */}
      <button className="pd-back" onClick={() => navigate("/clinic/patients")}><ArrowLeft size={15} />Back to Patients</button>

      {/* Bar B — two-column banner header (serif name) */}
      <div>
        <div className="pd-header" style={{ alignItems: "center", marginBottom: 14 }}>
          <h1 className="pd-name serif" style={{ margin: 0 }}>{fullName}</h1>
          <Btn variant="primary" onClick={() => navigate(`/clinic/referrals/new?patientId=${patient.id}`)}><Plus size={15} />New Referral for {firstName}</Btn>
        </div>
        <div className="pd-banner2">
          <div className="col demo">
            <p className="bk"><User size={13} />Demographics</p>
            <div className="pairs">
              <div className="pd-pair"><div className="pk">Age</div><div className="pv">{patient.dob ? getAge(patient.dob) : "—"}</div></div>
              <div className="pd-pair"><div className="pk">DOB</div><div className="pv">{patient.dob ? formatDateShort(patient.dob) : "—"}</div></div>
              <div className="pd-pair"><div className="pk">Phone</div><div className="pv">{patient.phone_primary || "—"}</div></div>
              <div className="pd-pair"><div className="pk">Gender</div><div className="pv">{patient.gender || "—"}</div></div>
            </div>
          </div>
          <div className="col ins">
            <p className="bk"><Shield size={13} />Insurance &amp; PA</p>
            <div className="pairs">
              <div className="pd-pair"><div className="pk">Insurance Type</div><div className="pv">{patient.insurance_type || "—"}</div></div>
              <div className="pd-pair"><div className="pk">PA Status</div><div className="pv"><Badge tone={paTone}>{paLabel}</Badge></div></div>
              <div className="pd-pair" style={{ gridColumn: "1 / -1" }}><div className="pk">Plan Details</div><div className="pv" style={{ fontWeight: 500, fontSize: "var(--text-xs)" }}>{patient.insurance_notes || "—"}</div></div>
            </div>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="pd-tabs">
        {[{ key: "history", label: "Referral History", icon: FileText }, { key: "info", label: "Patient Information", icon: User }, { key: "medications", label: "Prior Authorizations", icon: ClipboardList }].map((t) => (
          <button key={t.key} className={`pd-tab${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
            <span className="ti"><t.icon size={15} /></span>{t.label}
          </button>
        ))}
      </div>

      <div className="pd-content">
        {activeTab === "history" && <TabHistory medsLoading={medsLoading} medications={medications} referrals={referrals} navigate={navigate} patientId={patient.id} />}
        {activeTab === "info" && (
          <TabInfo
            patient={patient} editing={editing} draft={draft} saving={saving}
            beginEdit={beginEdit} cancelEdit={cancelEdit} saveEdits={saveEdits} setField={setField} copy={copy}
            paTone={paTone} paLabel={paLabel}
          />
        )}
        {activeTab === "medications" && <TabMeds medsLoading={medsLoading} meds={sortedMedications} navigate={navigate} patientId={patient.id} />}
      </div>
    </div>
  );
}

/* ── Referral History tab ── */
function TabHistory({ medsLoading, medications, referrals, navigate, patientId }: any) {
  const today = new Date();
  const activeDrugs = medications.filter((m: any) => m.is_active);
  const drug = [...activeDrugs].sort((a, b) => new Date(b.last_filled || b.created_at || 0).getTime() - new Date(a.last_filled || a.created_at || 0).getTime())[0] || null;
  const exp = drug?.pa_expiration_date ? new Date(drug.pa_expiration_date) : null;
  const isExpired = exp && exp < today;
  const days = exp ? Math.ceil((exp.getTime() - today.getTime()) / 86400000) : null;
  const isExpiringSoon = days !== null && days > 0 && days <= 30;
  const badge = drug ? getDrugPABadge(drug) : null;

  return (
    <div className="rw-fade" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="pd-card">
        <div className="pd-card-head"><span className="hi"><Shield size={16} /></span><div><h3>Prior Authorization Status</h3><p className="sub">Most recent active medication</p></div></div>
        {medsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 16 }}><span className="rw-spin" style={{ color: "var(--text-muted)" }}><Loader2 size={18} /></span></div>
        ) : !drug ? (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: "4px 0" }}>No active medications — medications appear here after a referral is approved.</p>
        ) : (
          <div>
            <div className="pd-health">
              <div className={`pd-health-rail ${badge!.tone}`} />
              <div className="pd-health-body">
                <div className="pd-health-main">
                  <span className="drug">{drug.drug_name}{drug.dosage && <span className="dose">{drug.dosage}</span>}</span>
                  <Badge tone={badge!.tone}>{badge!.label}</Badge>
                </div>
                <div className="pd-health-meta">
                  <div><div className="mk">PA Expiration</div><div className={`mv ${isExpired ? "danger" : isExpiringSoon ? "warn" : ""}`}>{exp ? (isExpired ? `Expired ${formatDateShort(drug.pa_expiration_date)}` : formatDateShort(drug.pa_expiration_date)) : "N/A"}</div></div>
                  <div><div className="mk">Last Filled</div><div className="mv">{drug.last_filled ? formatDateShort(drug.last_filled) : "—"}</div></div>
                </div>
              </div>
            </div>
            {isExpiringSoon && <div className="pd-alert warn"><span className="ai"><AlertTriangle size={16} /></span><span>PA for {drug.drug_name} expires on {formatDateShort(drug.pa_expiration_date)}. Consider creating a new referral.</span></div>}
            {isExpired && <div className="pd-alert danger"><span className="ai"><AlertTriangle size={16} /></span><span>PA for {drug.drug_name} expired on {formatDateShort(drug.pa_expiration_date)}. A new referral with PA is required.</span></div>}
          </div>
        )}
      </div>

      {referrals.length > 0 ? (
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead><tr><th>Referral ID</th><th>Drug</th><th>Status</th><th>PA Status</th><th>Created</th><th className="right">Actions</th></tr></thead>
            <tbody>
              {referrals.map((r: any) => {
                const [sTone, sLabel] = refStatusBadge(r.status);
                const [pTone, pLabel] = clinicPABadge(r.pa_status);
                return (
                  <tr key={r.id} onClick={() => navigate(`/clinic/referrals/${r.id}`)}>
                    <td><span className="pd-refid">{r.id.toUpperCase()}</span></td>
                    <td>{r.drug || r.drug_requested || "—"}</td>
                    <td><Badge tone={sTone}>{sLabel}</Badge></td>
                    <td><Badge tone={pTone}>{pLabel}</Badge></td>
                    <td style={{ color: "var(--text-muted)" }}>{r.created_at ? formatDateShort(r.created_at) : "—"}</td>
                    <td className="right" onClick={(e) => e.stopPropagation()}><Btn variant="outline" sm onClick={() => navigate(`/clinic/referrals/${r.id}`)}>View</Btn></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pd-empty">
          <span className="ei"><FileText size={28} /></span>
          <p className="t">No referrals for this patient</p>
          <p className="s">Create a referral to get started</p>
          <Btn variant="primary" onClick={() => navigate(`/clinic/referrals/new?patientId=${patientId}`)}><Plus size={15} />Create Referral</Btn>
        </div>
      )}
    </div>
  );
}

/* ── Patient Information tab (read sections + edit drawer) ── */
function ReadField({ patient, f, copy }: any) {
  const v = patient[f.key];
  const display = f.key === "dob" ? (v ? `${formatDateShort(v)} (Age ${getAge(v)})` : "—") : (v || "—");
  return (
    <div className={`pd-info${f.span ? " pd-col-span" : ""}`}>
      <p className="ik">{f.label}</p>
      <div className="iv">
        <span>{display}</span>
        {f.copy && v && <button className="pd-copy" title="Copy" onClick={() => copy(v, f.label)}><Copy size={13} /></button>}
      </div>
    </div>
  );
}
function EditFieldRow({ f, draft, setField }: any) {
  const v = draft[f.key] || "";
  return (
    <div className={f.span ? "pd-col-span" : ""}>
      <p className="ik" style={{ marginBottom: 4 }}>{f.label}</p>
      {f.kind === "select" ? (
        <select className="rw-select" value={v} onChange={(e) => setField(f.key, e.target.value)}>
          <option value="">Select</option>
          {f.options.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : f.kind === "date" ? (
        <input className="rw-input" type="date" value={v} onChange={(e) => setField(f.key, e.target.value)} />
      ) : f.kind === "textarea" ? (
        <textarea className="rw-textarea" rows={2} value={v} onChange={(e) => setField(f.key, e.target.value)} />
      ) : (
        <input className="rw-input" value={v} onChange={(e) => setField(f.key, e.target.value)} />
      )}
    </div>
  );
}
function TabInfo({ patient, editing, draft, saving, beginEdit, cancelEdit, saveEdits, setField, copy, paTone, paLabel }: any) {
  return (
    <div className="rw-fade">
      <div className="pd-edit-bar">
        <Btn variant="outline" sm onClick={beginEdit}><Pencil size={14} />Edit</Btn>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {INFO_GROUPS.map((g) => {
          if (g.key === "guardian" && !patient.authorized_representative) return null;
          return (
            <div className="pd-card soft" key={g.key}>
              <p className="pd-sect-label">{g.label}</p>
              <div className="pd-grid2">{g.fields.map((f: any) => <ReadField key={f.key} patient={patient} f={f} copy={copy} />)}</div>
            </div>
          );
        })}
        <div className="pd-card soft">
          <p className="pd-sect-label">Insurance Information</p>
          <div className="pd-grid2">
            <div className="pd-info"><p className="ik">Insurance Type</p><div className="iv">{patient.insurance_type || "—"}</div></div>
            <div className="pd-info"><p className="ik">Plan Details</p><div className="iv">{patient.insurance_notes || "—"}</div></div>
            <div className="pd-info"><p className="ik">PA Status</p><div className="iv"><Badge tone={paTone}>{paLabel}</Badge></div></div>
            <div className="pd-info"><p className="ik">PA Expiration</p><div className="iv">{patient.pa_expiration_date ? formatDateShort(patient.pa_expiration_date) : "N/A"}</div></div>
          </div>
        </div>
      </div>

      {editing && (
        <>
          <div className="pd-drawer-scrim" onClick={cancelEdit} />
          <div className="pd-drawer">
            <div className="pd-drawer-head"><h3>Edit Patient</h3><button className="rw-x" onClick={cancelEdit} aria-label="Close"><X size={18} /></button></div>
            <div className="pd-drawer-body">
              {INFO_GROUPS.map((g) => (
                <div className="pd-edit-sect" key={g.key}>
                  <p className="pd-sect-label">{g.label}</p>
                  <div className="pd-grid2">{g.fields.map((f: any) => <EditFieldRow key={f.key} f={f} draft={draft} setField={setField} />)}</div>
                </div>
              ))}
            </div>
            <div className="pd-drawer-foot">
              <Btn variant="outline" onClick={cancelEdit} disabled={saving}>Cancel</Btn>
              <Btn variant="primary" onClick={saveEdits} disabled={saving}>{saving ? <span className="rw-spin"><Loader2 size={14} /></span> : <Save size={14} />}Save</Btn>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Prior Authorizations tab (dense table) ── */
function TabMeds({ medsLoading, meds, navigate, patientId }: any) {
  if (medsLoading) return <div className="rw-fade" style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 64, gap: 8 }}><span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={22} /></span><span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Loading medications...</span></div>;
  if (meds.length === 0) return (
    <div className="rw-fade pd-empty">
      <span className="ei"><ClipboardList size={28} /></span>
      <p className="t">No Medications on Record</p>
      <p className="s">No active prescriptions for this patient yet</p>
      <Btn variant="primary" onClick={() => navigate(`/clinic/referrals/new?patientId=${patientId}`)}><Plus size={15} />Create First Referral</Btn>
    </div>
  );
  return (
    <div className="rw-fade pd-table-wrap">
      <table className="pd-table">
        <thead><tr><th>Medication</th><th>Dosage · Frequency</th><th>PA Status</th><th>PA Expires</th><th>Last Filled</th><th className="right">Actions</th></tr></thead>
        <tbody>
          {meds.map((d: any) => {
            const badge = getDrugPABadge(d);
            const disabled = !d.last_referral_id;
            return (
              <tr key={d.id} onClick={() => !disabled && navigate(`/clinic/referrals/${d.last_referral_id}`)} style={d.is_active === false ? { opacity: 0.62 } : undefined}>
                <td><div style={{ display: "flex", alignItems: "center", gap: 9 }}><span className="pd-med-ic"><Pill size={14} /></span><span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.drug_name}</span></div></td>
                <td style={{ color: "var(--text-muted)" }}>{d.dosage} · {d.frequency || "—"}</td>
                <td><Badge tone={badge.tone}>{badge.label}</Badge></td>
                <td>{d.pa_expiration_date ? formatDateShort(d.pa_expiration_date) : "N/A"}</td>
                <td style={{ color: "var(--text-muted)" }}>{d.last_filled ? formatDateShort(d.last_filled) : "Never"}</td>
                <td className="right" onClick={(e) => e.stopPropagation()}>
                  <Btn variant="outline" sm disabled={disabled} onClick={() => !disabled && navigate(`/clinic/referrals/${d.last_referral_id}`)} title={disabled ? "No referral linked to this medication." : undefined}><Eye size={13} />View</Btn>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
