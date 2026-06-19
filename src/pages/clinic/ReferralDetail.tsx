import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, FileText, Clock, User, Pill, Stethoscope, Shield, Copy, CheckCircle,
  Send, Upload, Loader2, XCircle, Plus, AlertTriangle, Image, RefreshCw, Sparkles,
  Circle, Inbox, Search as SearchIcon, Save, X, Pencil, ListChecks, MessageSquareWarning,
  Heart, ArrowRight, Printer, Download,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { clinicApi } from "@/lib/api";
import { mapReferralFromBackend } from "@/lib/dataMapper";
import { formatDateTime, formatDateShort } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { getDisplayAuthor, getAuthorInitials } from "@/lib/noteAuthor";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import "./wizard.css";
import "./referral-detail.css";

const statusDescriptions: Record<string, string> = {
  uploaded: "Your referral has been received and is awaiting review.",
  processing: "Your referral is currently being reviewed by our team.",
  ready_for_review: "Our clinical team is reviewing the referral details.",
  approved_to_send: "Your referral has been approved and is being sent to the pharmacy.",
  sent_to_pharmacy: "Your referral has been sent to the assigned pharmacy.",
  rejected: "This referral needs your attention before it can proceed.",
};

const DOC_CATEGORIES = [
  { key: "referral_form", label: "Referral Form / Prescription", types: ["referral_form"] },
  { key: "insurance", label: "Insurance Documents", types: ["insurance_front", "insurance_back"] },
  { key: "chart_notes", label: "Chart Notes", types: ["chart_notes"] },
  { key: "other", label: "Other Documents", types: [] as string[] },
];

const MISSING_DOC_LABELS: Record<string, string> = {
  referral_form: "Referral form / prescription",
  demographics: "Patient demographics",
  insurance_front: "Insurance card — front",
  insurance_back: "Insurance card — back",
  chart_notes: "Chart notes",
  prior_auth: "Prior authorization form",
};

const EVENT_LABELS: Record<string, string> = {
  referral_created: "Referral submitted", referral_finalized: "Documents submitted for processing",
  document_uploaded: "Document uploaded", ai_extraction_completed: "AI extraction completed",
  ai_extraction_completed_auto: "AI extraction completed", validation_updated: "Document validation updated",
  referral_approved: "Referral approved by admin", referral_rejected: "Referral rejected",
  referral_rejectd: "Referral rejected", referral_resubmitted: "Referral resubmitted by clinic",
  referral_edited_by_clinic: "Clinic corrected referral details", pharmacy_reassigned: "Pharmacy reassigned",
  delivery_completed: "Sent to pharmacy", sent_to_pharmacy: "Sent to pharmacy", delivery_failed: "Pharmacy delivery failed",
  pa_submitted: "Prior authorization submitted", pa_approved: "Prior authorization approved",
  pa_denied: "Prior authorization denied", pa_processing: "Prior authorization in processing",
  admin_edit: "Admin updated referral details", final_pdf_generated: "Referral PDF generated",
};
const HIDDEN_EVENTS = new Set(["validation_updated", "admin_edit", "final_pdf_generated"]);

function eventLabel(t: string) { return EVENT_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase()); }
function eventIcon(t: string) {
  if (["referral_created", "referral_finalized", "referral_resubmitted"].includes(t)) return Send;
  if (t === "document_uploaded") return FileText;
  if (t === "referral_edited_by_clinic") return Pencil;
  if (t === "ai_extraction_completed" || t === "ai_extraction_completed_auto") return Sparkles;
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved"].includes(t)) return CheckCircle;
  if (["referral_rejected", "referral_rejectd", "delivery_failed", "pa_denied"].includes(t)) return XCircle;
  if (["pa_submitted", "pa_processing"].includes(t)) return Clock;
  return Circle;
}
function eventColor(t: string) {
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved"].includes(t)) return "green";
  if (["referral_rejected", "referral_rejectd", "pa_denied", "delivery_failed"].includes(t)) return "red";
  if (["pa_submitted", "pa_processing"].includes(t)) return "amber";
  if (["ai_extraction_completed", "ai_extraction_completed_auto"].includes(t)) return "blue";
  return "navy";
}
function docIcon(filename: string) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "tiff", "tif"].includes(ext || "") ? Image : FileText;
}
function groupDocuments(docs: any[]) {
  const grouped: Record<string, any[]> = {};
  DOC_CATEGORIES.forEach((c) => { grouped[c.key] = []; });
  docs.forEach((d) => {
    const cat = DOC_CATEGORIES.find((c) => c.types.includes(d.doc_type || ""));
    grouped[cat ? cat.key : "other"].push(d);
  });
  return grouped;
}

// Display field configs (real extracted_data keys)
const PATIENT_FIELDS = [
  { k: "first_name", label: "First Name" }, { k: "last_name", label: "Last Name" }, { k: "mi", label: "MI" },
  { k: "dob", label: "Date of Birth", date: true }, { k: "gender", label: "Gender" },
  { k: "phone", label: "Phone", copy: true }, { k: "email", label: "Email", copy: true },
  { k: "address", label: "Address" }, { k: "city", label: "City" }, { k: "state", label: "State" }, { k: "zip", label: "Zip Code" },
  { k: "height", label: "Height" }, { k: "weight", label: "Weight" }, { k: "allergies", label: "Allergies" },
  { k: "authorized_representative", label: "Authorized Representative" }, { k: "authorized_representative_phone", label: "Representative Phone" },
];
const CLINICAL_FIELDS = [
  { k: "diagnosis_icd10", label: "Diagnosis (ICD-10)" }, { k: "drug_requested", label: "Drug Requested" },
  { k: "therapy_type", label: "Therapy Type" }, { k: "date_therapy_initiated", label: "Date Therapy Initiated", date: true },
  { k: "duration_of_therapy", label: "Duration of Therapy" }, { k: "dosing", label: "Dose/Strength" },
  { k: "frequency", label: "Frequency" }, { k: "quantity", label: "Quantity" }, { k: "length_of_therapy", label: "Length of Therapy / #Refills" },
  { k: "administration", label: "Administration" }, { k: "administration_location", label: "Administration Location" },
  { k: "is_refill", label: "Refill / Renewal", bool: true },
];
const PROVIDER_FIELDS = [
  { k: "first_name", label: "First Name" }, { k: "last_name", label: "Last Name" }, { k: "specialty", label: "Specialty" },
  { k: "npi", label: "NPI", mono: true }, { k: "dea_number", label: "DEA Number", mono: true }, { k: "address", label: "Address" },
  { k: "city", label: "City" }, { k: "state", label: "State" }, { k: "zip", label: "Zip Code" },
  { k: "phone", label: "Phone" }, { k: "fax", label: "Fax" }, { k: "email", label: "Email" },
  { k: "office_contact", label: "Office Contact Person" }, { k: "requestor", label: "Requestor" }, { k: "signature_date", label: "Signature Date", date: true },
];
// Required-ish fields that get a ⚠ when empty.
const IMPORTANT: Record<string, string[]> = {
  patient: ["first_name", "last_name", "dob", "phone"],
  clinical: ["diagnosis_icd10", "drug_requested"],
  provider: ["first_name", "last_name", "npi"],
  insurance: ["primary_member_id"],
};
const isEmpty = (v: any) => v === undefined || v === null || v === "" || v === "—";

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [viewerDocId, setViewerDocId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const fetchClinicDocUrl = (docId: string) => clinicApi.getReferralDocumentUrl(id!, docId).then((r) => ({ url: r.url }));

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      clinicApi.getReferral(id),
      clinicApi.getReferralDocuments(id).catch(() => ({ items: [] })),
      clinicApi.getReferralHistory(id).catch(() => ({ items: [] })),
      clinicApi.getReferralNotes(id).catch(() => ({ items: [] })),
    ])
      .then(([r, d, h, n]) => {
        setReferral(mapReferralFromBackend(r));
        setDocuments(d.items || []);
        setHistory(h.items || []);
        setNotes(n.items || []);
      })
      .catch((err) => { console.error("Failed to load referral:", err); setError("Failed to load referral details."); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, [id]);

  const handleUpload = async (file: File, docType: string) => {
    if (!id) return;
    setUploadingCategory(docType);
    try {
      await clinicApi.uploadDocument(id, file, docType);
      toast({ title: "Document uploaded", description: file.name });
      const d = await clinicApi.getReferralDocuments(id).catch(() => ({ items: [] }));
      setDocuments(d.items || []);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally { setUploadingCategory(null); }
  };
  const handleResubmit = async () => {
    if (!id) return;
    setResubmitting(true);
    try {
      await clinicApi.resubmitReferral(id);
      toast({ title: "Referral resubmitted!", description: "Our AI is re-extracting your documents and our team will review shortly." });
      loadData();
    } catch (err: any) {
      toast({ title: "Resubmit failed", description: err.message, variant: "destructive" });
    } finally { setResubmitting(false); }
  };
  const addNote = async () => {
    if (!newNote.trim() || !id) return;
    setSendingNote(true);
    try {
      const result = await clinicApi.addReferralNote(id, newNote.trim());
      setNotes((prev) => [...prev, { id: result.id, author_type: "clinic", author_name: "You", content: newNote.trim(), created_at: new Date().toISOString(), ...result }]);
      setNewNote("");
      toast({ title: "Note added" });
      localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add note", variant: "destructive" });
    } finally { setSendingNote(false); }
  };

  if (loading) {
    return (
      <div className="rw-page" style={{ display: "flex", justifyContent: "center", padding: 80 }}>
        <span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span>
      </div>
    );
  }
  if (error || !referral) {
    return (
      <div className="rw-page" style={{ textAlign: "center", padding: 80 }}>
        <p style={{ color: "var(--text-muted)" }}>{error || "Referral not found"}</p>
        <button className="rw-btn outline" style={{ marginTop: 16 }} onClick={() => navigate(-1)}>Back to Referrals</button>
      </div>
    );
  }

  const data = referral.extracted_data || {};
  const patient = data.patient || {}, clinical = data.clinical || {}, provider = data.provider || {}, insurance = data.insurance || {}, priorAuth = data.prior_auth || {};
  const patientFullName = patient.full_name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "—";
  const grouped = groupDocuments(documents);
  const rejected = referral.status === "rejected";
  // Highlight ONLY what the admin team explicitly flagged on reject — never fields the
  // AI merely left blank. The clinic fixes exactly what we marked, nothing else.
  const adminFlaggedSet = new Set<string>(referral.missing_fields?.flagged_fields || []);
  const isFlagged = (sec: string, k: string) => adminFlaggedSet.has(`${sec}.${k}`);
  const flagCount = (sec: string) => [...adminFlaggedSet].filter((p) => p.startsWith(sec + ".")).length;
  const missingDocs: string[] = referral.missing_fields?.missing_documents || [];
  const flaggedFieldPaths: string[] = referral.missing_fields?.flagged_fields || [];

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied!", description: `${label} copied to clipboard` }); };
  const activeDocId = viewerDocId || documents[0]?.id || null;

  return (
    <div className="rw-page rd-page rw-fade">
      <button className="rd-back" onClick={() => navigate(-1)}><ArrowLeft size={15} />Back to Referrals</button>

      {/* Header */}
      <div className="rd-header">
        <div className="rd-head-l">
          <div className="rd-name-row">
            <h1 className="rd-name serif">{referral.patient_name || patientFullName}</h1>
            <StatusBadge status={referral.status} size="md" showIcon />
            <span className="rd-idchip">{referral.id.toUpperCase()}<button className="cp" title="Copy ID" onClick={() => copy(referral.id, "Referral ID")}><Copy size={12} /></button></span>
          </div>
          <div className="rd-meta">
            <b>{referral.drug || "—"}</b><span className="sepbar">·</span><span>Created {formatDateShort(referral.created_at)}</span>
            {referral.created_by_name && <><span className="sepbar">·</span><span>by {referral.created_by_name}</span></>}
          </div>
        </div>
        <div className="rd-head-actions">
          {(referral.status === "ready_for_review" || referral.status === "uploaded") && (
            <button className="rw-btn outline sm" onClick={() => setEditing(true)}><Pencil size={14} />Edit details</button>
          )}
          <button className="rw-btn outline sm" onClick={() => window.print()}><Printer size={14} />Print</button>
        </div>
      </div>

      {/* Bar C — FixPanel (rejected) or success banner */}
      {rejected ? (
        <FixPanel reason={referral.rejection_reason} missingDocs={missingDocs} flaggedFields={flaggedFieldPaths}
          flags={0}
          onEdit={() => setEditing(true)} onUpload={() => { setTab("documents"); }} />
      ) : (referral.status === "approved_to_send" || referral.status === "sent_to_pharmacy") && referral.pharmacy_name ? (
        <div className="rd-banner success">
          <span className="bi"><CheckCircle size={20} /></span>
          <div className="rd-banner-body">
            <p className="rd-banner-title">{referral.status === "sent_to_pharmacy" ? "Referral Sent" : "Referral Approved & Sending"}</p>
            <p className="rd-banner-text">{referral.status === "sent_to_pharmacy" ? "This referral has been sent to the pharmacy." : "This referral is approved and on its way to the pharmacy."}</p>
            <div className="rd-banner-cols">
              <div className="rd-banner-col"><p className="bk">Pharmacy</p><div className="bv">{referral.pharmacy_name}</div></div>
              {referral.pharmacy_location && <div className="rd-banner-col"><p className="bk">Location</p><div className="bv">{referral.pharmacy_location}</div></div>}
              {referral.pharmacy_contact && <div className="rd-banner-col"><p className="bk">Contact</p><div className="bv">{referral.pharmacy_contact}</div></div>}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="rd-tabs">
        {[{ k: "overview", label: "Overview", icon: FileText, n: null },
          { k: "documents", label: "Documents", icon: FileText, n: documents.length },
          { k: "history", label: "History", icon: Clock, n: history.filter((e) => !HIDDEN_EVENTS.has(e.event_type)).length || null },
          { k: "notes", label: "Notes", icon: Send, n: notes.length || null }].map((t) => (
          <button key={t.k} className={`rd-tab${tab === t.k ? " active" : ""}`}
            onClick={() => { setTab(t.k); if (t.k === "notes" && id) localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString()); }}>
            <span className="ti"><t.icon size={15} /></span>{t.label}{t.n != null && <span className="tcount">{t.n}</span>}
          </button>
        ))}
      </div>

      <div className="rd-content">
        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="rd-overview">
            <div className="rd-ov-main">
              <InfoCardDL icon={User} title="Patient Information" obj={patient} fields={PATIENT_FIELDS} section="patient" flagCount={flagCount("patient")} isFlagged={isFlagged} onCopy={copy} />
              <InfoCardDL icon={Pill} title="Clinical Information" obj={clinical} fields={CLINICAL_FIELDS} section="clinical" flagCount={flagCount("clinical")} isFlagged={isFlagged} onCopy={copy} />
              <InfoCardDL icon={Stethoscope} title="Provider Information" obj={provider} fields={PROVIDER_FIELDS} section="provider" flagCount={flagCount("provider")} isFlagged={isFlagged} onCopy={copy} />
            </div>
            <div className="rd-rail">
              <StatusProgress status={referral.status} desc={statusDescriptions[referral.status] || "In progress."} />
              <InsurancePA referral={referral} insurance={insurance} priorAuth={priorAuth} reloadOnUpdate={loadData} referralId={id!} isFlagged={isFlagged} />
            </div>
          </div>
        )}

        {/* DOCUMENTS — split */}
        {tab === "documents" && (
          <>
            <div className="rd-doc-split">
              <div className="rd-doc-list">
                {DOC_CATEGORIES.map((cat) => {
                  const catDocs = grouped[cat.key] || [];
                  return (
                    <div className="rd-doc-group" key={cat.key}>
                      <h4>{cat.label}</h4>
                      {catDocs.length === 0 ? (
                        <div className="rd-doc-empty">No {cat.label.toLowerCase()} uploaded</div>
                      ) : (
                        <div className="rd-doc-cards">
                          {catDocs.map((doc: any) => {
                            const DocIcon = docIcon(doc.original_filename || doc.file_name || "");
                            return (
                              <button key={doc.id} className={`rd-doc-card${activeDocId === doc.id ? " active" : ""}`} onClick={() => setViewerDocId(doc.id)}>
                                <span className="rd-doc-ic"><DocIcon size={15} /></span>
                                <span className="rd-doc-info">
                                  <span className="rd-doc-name">{doc.original_filename || doc.file_name || doc.name || "Document"}</span>
                                  <span className="rd-doc-sub">{formatDateShort(doc.uploaded_at || doc.created_at)}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="rd-doc-viewer">
                {activeDocId ? (
                  <DocumentViewer key={activeDocId} documents={documents} fetchUrl={fetchClinicDocUrl} initialDocId={activeDocId} />
                ) : (
                  <div className="rd-doc-viewer-empty"><FileText size={28} /><span>No documents to preview</span></div>
                )}
              </div>
            </div>

            {rejected && (
              <div className="rd-upload">
                <h4>Upload Additional Documents</h4>
                <div className="rd-upload-grid">
                  {[{ type: "required", label: "Referral Form / Prescription" }, { type: "insurance", label: "Insurance Card" }, { type: "additional", label: "Chart Notes" }].map((z) => (
                    <UploadZone key={z.type} label={z.label} uploading={uploadingCategory === z.type} onUpload={(f) => handleUpload(f, z.type)} />
                  ))}
                </div>
                <div className="rd-resubmit-bar">
                  <button className="rw-btn primary" onClick={handleResubmit} disabled={resubmitting}>
                    {resubmitting ? <span className="rw-spin"><Loader2 size={15} /></span> : <RefreshCw size={15} />}Resubmit Referral
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div className="rd-hist">
            {history.filter((e) => !HIDDEN_EVENTS.has(e.event_type)).length > 0 ? (
              history.filter((e: any) => !HIDDEN_EVENTS.has(e.event_type)).map((event: any, i: number, arr: any[]) => {
                const Icon = eventIcon(event.event_type);
                let label = eventLabel(event.event_type);
                if (event.event_type === "document_uploaded" && event.metadata?.filename) label += `: ${event.metadata.filename}`;
                return (
                  <div className="rd-hist-row" key={i}>
                    <span className={`rd-hist-node ${eventColor(event.event_type)}`}><Icon size={16} /></span>
                    {i < arr.length - 1 && <span className="rd-hist-line" />}
                    <div className="rd-hist-body">
                      <div className="rd-hist-label">{label}</div>
                      {event.event_type === "referral_rejected" && event.metadata?.reason && <div className="rd-hist-reason">{event.metadata.reason}</div>}
                      <div className="rd-hist-when">{formatDateTime(event.created_at)}</div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rd-empty"><span className="ei"><Clock size={28} /></span><p className="t">No history yet</p><p className="s">Events will appear here as the referral progresses.</p></div>
            )}
          </div>
        )}

        {/* NOTES */}
        {tab === "notes" && (
          <div className="rd-notes">
            {notes.map((note) => {
              const isAdmin = note.author_type === "admin";
              return (
                <div key={note.id} className={`rd-note ${isAdmin ? "admin" : "clinic"}`}>
                  <span className="rd-note-ava">{getAuthorInitials(note, "clinic")}</span>
                  <div className="rd-note-body">
                    <div className="rd-note-card">
                      <div className="rd-note-head">
                        <span className="rd-note-author">{getDisplayAuthor(note, "clinic")}</span>
                        <span className="rd-note-when">{formatDateTime(note.created_at)}</span>
                      </div>
                      <p className="rd-note-text">{note.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={notesEndRef} />
            <div className="rd-composer">
              <textarea placeholder="Add a note about this referral..." value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} />
              <button className="rw-btn primary" onClick={addNote} disabled={!newNote.trim() || sendingNote}>
                {sendingNote ? <span className="rw-spin"><Loader2 size={15} /></span> : <Send size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit drawer */}
      {editing && <EditDrawer referralId={id!} data={data} flaggedSet={adminFlaggedSet} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadData(); }} />}
    </div>
  );
}

/* ── Definition-list info card with ⚠ flags ── */
function InfoCardDL({ icon: Icon, title, obj, fields, section, flagCount, isFlagged, onCopy }: any) {
  return (
    <div className="rd-card">
      <div className="rd-card-head">
        <span className="hi"><Icon size={16} /></span><h3>{title}</h3>
        {flagCount > 0 && <span className="rd-card-flag" title={`${flagCount} field${flagCount > 1 ? "s" : ""} need attention`}><AlertTriangle size={13} />{flagCount}</span>}
      </div>
      <div className="rd-dl">
        {fields.map((f: any) => {
          const flag = isFlagged ? isFlagged(section, f.k) : ((IMPORTANT[section] || []).includes(f.k) && isEmpty(obj[f.k]));
          let v = obj[f.k];
          if (f.bool) v = v ? "Yes" : "No";
          else if (f.date && v) v = formatDateShort(v);
          else v = v || "—";
          return (
            <div key={f.k} className={`rd-dl-row${flag ? " flagged" : ""}`}>
              <div className="dk">{f.label}{flag && <span className="rd-flag" title="Missing — please add"><AlertTriangle size={12} /></span>}</div>
              <div className={`dv${f.mono ? " mono" : ""}`}>
                <span>{v}</span>
                {f.copy && obj[f.k] && <button className="rd-copy" title="Copy" onClick={() => onCopy(obj[f.k], f.label)}><Copy size={13} /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Status progress with rejected branch ── */
function StatusProgress({ status, desc }: { status: string; desc: string }) {
  const steps = [{ key: "received", label: "Received", icon: Inbox }, { key: "review", label: "In Review", icon: SearchIcon }, { key: "sent", label: "Sent", icon: Send }];
  const cur = status === "sent_to_pharmacy" || status === "approved_to_send" ? 2 : 1;
  const rejected = status === "rejected";
  return (
    <div className="rd-status-card">
      <div className="rd-status-top"><StatusBadge status={status} size="lg" showIcon /></div>
      <p className="rd-status-desc">{desc}</p>
      <div className="rd-prog">
        {steps.map((s, i) => {
          let cls = i < cur ? "done" : i === cur ? "current" : "todo";
          if (rejected && i === 1) cls = "rejected";
          const Icon = s.icon;
          return (
            <div key={s.key} className={`rd-prog-step ${cls}`}>
              <div className="rd-prog-bar" />
              <div className="rd-prog-node">{rejected && i === 1 ? <X size={15} /> : i < cur ? <CheckCircle size={15} /> : <Icon size={15} />}</div>
              <div className="rd-prog-lbl">{rejected && i === 1 ? "Rejected" : s.label}</div>
            </div>
          );
        })}
      </div>
      {rejected && <div className="rd-prog-note"><ArrowRight size={14} />Branched to rejected at review — fix &amp; resubmit to continue</div>}
    </div>
  );
}

/* ── Insurance & PA (two cards) ── */
function InsurancePA({ referral, insurance, priorAuth, reloadOnUpdate, referralId, isFlagged }: any) {
  if (referral.is_bridge_program) {
    return (
      <div className="rd-status-card">
        <div className="rd-card-head"><span className="hi"><Shield size={16} /></span><h3>Insurance &amp; PA</h3></div>
        <div className="rd-bridge"><span className="bi"><Heart size={18} /></span><div><div className="bt">Bridge Program</div><div className="bs">PA not required</div></div></div>
      </div>
    );
  }
  const paStatus = referral.pa_status;
  return (
    <>
      <div className="rd-status-card">
        <p className="rd-sub-label">Insurance
          <span className={`vchk ${referral.insurance_expired ? "bad" : "ok"}`}>{referral.insurance_expired ? <XCircle size={15} /> : <CheckCircle size={15} />}</span>
          <span style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: referral.insurance_expired ? "var(--color-error)" : "var(--color-success)", textTransform: "none", letterSpacing: 0 }}>{referral.insurance_expired ? "Expired" : "Valid"}</span>
        </p>
        <div className="rd-dl">
          <DlRow label="Has Insurance" value={insurance.has_insurance_card ? "Yes" : "No"} />
          {(insurance.primary_insurance_name || (isFlagged && isFlagged("insurance", "primary_insurance_name"))) && <DlRow label="Primary Insurance" value={insurance.primary_insurance_name || "—"} flag={!!(isFlagged && isFlagged("insurance", "primary_insurance_name"))} />}
          <DlRow label="Member ID" value={insurance.primary_member_id || "—"} flag={!!(isFlagged && isFlagged("insurance", "primary_member_id"))} />
          {insurance.secondary_insurance_name && <DlRow label="Secondary Insurance" value={insurance.secondary_insurance_name} />}
          {insurance.notes && <DlRow label="Insurance Notes" value={insurance.notes} />}
        </div>
        {referral.insurance_expired && <ExpiredInsuranceBanner referralId={referralId} onUpdated={reloadOnUpdate} />}
      </div>

      <div className="rd-status-card">
        <p className="rd-sub-label">Prior Authorization</p>
        <div className="rd-dl">
          <DlRow label="PA Required" value={referral.pa_required ? "Yes" : "No"} />
          {referral.pa_required && (
            <>
              <div className="rd-dl-row"><div className="dk">PA Status</div><div className="dv">
                {!paStatus ? <span className="rd-pa-pill" style={paPillStyle("pending")}>Pending</span>
                  : paStatus === "approved" ? <span style={paPillStyle("approved")}>Approved</span>
                  : paStatus === "denied" ? <span style={paPillStyle("denied")}>Denied</span>
                  : paStatus === "processing" ? <span style={paPillStyle("processing")}>PA In Progress</span>
                  : paStatus === "submitted" ? <span style={paPillStyle("submitted")}>PA Submitted</span>
                  : <span style={paPillStyle("pending")}>{paStatus}</span>}
              </div></div>
              {paStatus === "approved" && referral.pa_number && <DlRow label="PA Number" value={referral.pa_number} mono />}
              {paStatus === "approved" && referral.pa_expiration_date && <DlRow label="PA Expires" value={formatDateShort(referral.pa_expiration_date)} />}
              {paStatus === "denied" && referral.pa_denial_reason && <DlRow label="Denial Reason" value={referral.pa_denial_reason} />}
              <DlRow label="PA Handled By" value={priorAuth.handled_by_us ? "DiRxtional" : "Clinic"} />
            </>
          )}
        </div>
      </div>
    </>
  );
}
function paPillStyle(kind: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    pending: ["--status-uploaded-bg", "--status-uploaded-fg"], submitted: ["--status-review-bg", "--status-review-fg"],
    processing: ["--status-processing-bg", "--status-processing-fg"], approved: ["--status-approved-bg", "--status-approved-fg"],
    denied: ["--status-rejected-bg", "--status-rejected-fg"],
  };
  const [bg, fg] = map[kind] || map.pending;
  return { display: "inline-flex", fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 9999, background: `hsl(var(${bg}))`, color: `hsl(var(${fg}))` };
}
function DlRow({ label, value, mono, flag }: { label: string; value: string; mono?: boolean; flag?: boolean }) {
  return (
    <div className={`rd-dl-row${flag ? " flagged" : ""}`}>
      <div className="dk">{label}{flag && <span className="rd-flag" title="Missing — please add"><AlertTriangle size={12} /></span>}</div>
      <div className={`dv${mono ? " mono" : ""}`}>{value}</div>
    </div>
  );
}

/* ── FixPanel (rejected recovery) ── */
function FixPanel({ reason, missingDocs, flaggedFields = [], flags, onEdit, onUpload }: any) {
  const prettyField = (p: string) => p.split(".").map((s) => s.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase())).join(" · ");
  const nothing = missingDocs.length === 0 && flaggedFields.length === 0 && flags === 0;
  return (
    <div className="rd-fix">
      <div className="rd-fix-head">
        <span className="fi"><AlertTriangle size={20} /></span>
        <div><p className="ft">Referral Needs Attention</p><p className="fs">Resolve the items below, then resubmit for review.</p></div>
        <span className="he"><StatusBadge status="rejected" size="md" /></span>
      </div>
      <div className="rd-fix-grid">
        <div className="rd-fix-block">
          <p className="rd-fix-k"><MessageSquareWarning size={14} />Rejection reason</p>
          <div className="rd-fix-reason">{reason || "This referral was rejected. Contact our team for details."}</div>
        </div>
        <div className="rd-fix-block">
          <p className="rd-fix-k"><ListChecks size={14} />What's needed</p>
          <ul className="rd-checklist">
            {nothing && <li className="rd-check-item"><span className="ck"><Circle size={15} /></span><span>Review the rejection reason and correct the referral.</span></li>}
            {missingDocs.map((m: string) => (
              <li className="rd-check-item" key={m}><span className="ck"><Circle size={15} /></span><span>{MISSING_DOC_LABELS[m] || m}</span></li>
            ))}
            {flaggedFields.map((p: string) => (
              <li className="rd-check-item" key={p}><span className="ck"><Circle size={15} /></span><span>Correct {prettyField(p)} <AlertTriangle size={12} style={{ verticalAlign: "-1px", color: "var(--color-warning)" }} /></span></li>
            ))}
            {flags > 0 && <li className="rd-check-item"><span className="ck"><Circle size={15} /></span><span>Verify {flags} more field{flags > 1 ? "s" : ""} marked <AlertTriangle size={12} style={{ verticalAlign: "-1px", color: "var(--color-warning)" }} /></span></li>}
          </ul>
        </div>
      </div>
      <div className="rd-fix-actions">
        <span className="rd-fix-actions-lbl">Fix this referral</span>
        <button className="rw-btn outline" onClick={onEdit}><Pencil size={15} />Edit details</button>
        <button className="rw-btn primary" onClick={onUpload}><Upload size={15} />Upload documents</button>
      </div>
    </div>
  );
}

/* ── Edit drawer ── */
const EDIT_GROUPS = [
  { section: "patient", label: "Patient", icon: User, fields: PATIENT_FIELDS },
  { section: "clinical", label: "Clinical", icon: Stethoscope, fields: CLINICAL_FIELDS },
  { section: "provider", label: "Provider", icon: Stethoscope, fields: PROVIDER_FIELDS },
  { section: "insurance", label: "Insurance", icon: Shield, fields: [
    { k: "primary_insurance_name", label: "Primary Insurance" }, { k: "primary_member_id", label: "Member ID" },
    { k: "secondary_insurance_name", label: "Secondary Insurance" }, { k: "notes", label: "Insurance Notes" },
  ] },
];
function EditDrawer({ referralId, data, flaggedSet, onClose, onSaved }: any) {
  const [draft, setDraft] = useState<any>(() => {
    const d: any = {};
    EDIT_GROUPS.forEach((g) => {
      d[g.section] = {};
      g.fields.forEach((f: any) => { d[g.section][f.k] = (data[g.section] || {})[f.k] ?? (f.bool ? false : ""); });
    });
    return d;
  });
  const [saving, setSaving] = useState(false);
  const setField = (sec: string, k: string, v: any) => setDraft((dr: any) => ({ ...dr, [sec]: { ...dr[sec], [k]: v } }));

  const save = async () => {
    setSaving(true);
    try {
      await clinicApi.editReferral(referralId, draft);
      toast({ title: "Referral details updated", description: "Sent back to our team for review." });
      onSaved();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Could not save changes.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="rd-drawer-scrim" onClick={onClose} />
      <div className="rd-drawer">
        <div className="rd-drawer-head">
          <div><h3>Edit Referral Details</h3><p>Correct any extracted fields, then save — it returns to our team for review.</p></div>
          <button className="rw-ic-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="rd-drawer-body">
          {flaggedSet && flaggedSet.size > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 12, borderRadius: "var(--radius-md)", background: "color-mix(in srgb, var(--color-warning) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)", color: "#92400E", fontSize: "var(--text-sm)", fontWeight: 600 }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {flaggedSet.size} field{flaggedSet.size > 1 ? "s" : ""} flagged by our team — highlighted below.
            </div>
          )}
          {EDIT_GROUPS.map((g) => (
            <div className="rd-edit-sect" key={g.section}>
              <p className="rd-edit-sect-label"><span className="ei"><g.icon size={15} /></span>{g.label}</p>
              <div className="rd-edit-grid">
                {g.fields.map((f: any) => {
                  const flag = !!(flaggedSet && flaggedSet.has(`${g.section}.${f.k}`));
                  const v = draft[g.section][f.k];
                  return (
                    <div key={f.k} className={`rd-efield${f.span || f.k === "notes" || f.k === "allergies" || f.k === "address" ? " span" : ""}`}>
                      <label className="rd-elabel">{f.label}{flag && <span className="rd-flag" title="Missing — please add"><AlertTriangle size={12} /></span>}</label>
                      {f.bool ? (
                        <select className="rw-select" value={v ? "Yes" : "No"} onChange={(e) => setField(g.section, f.k, e.target.value === "Yes")}>
                          <option>No</option><option>Yes</option>
                        </select>
                      ) : f.date ? (
                        <input className="rw-input" type="date" value={v || ""} onChange={(e) => setField(g.section, f.k, e.target.value)} />
                      ) : (
                        <input className={`rw-input${flag ? " rd-input-flag" : ""}`} value={v || ""} onChange={(e) => setField(g.section, f.k, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="rd-drawer-foot">
          <button className="rw-btn outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="rw-btn primary" onClick={save} disabled={saving}>{saving ? <span className="rw-spin"><Loader2 size={15} /></span> : <Save size={15} />}Save Details</button>
        </div>
      </div>
    </>
  );
}

/* ── Upload zone ── */
function UploadZone({ label, uploading, onUpload }: { label: string; uploading: boolean; onUpload: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`rd-zone${uploading ? " uploading" : ""}`} onClick={() => ref.current?.click()} style={uploading ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
      <input ref={ref} type="file" className="hidden" style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      <span className="zi">{uploading ? <span className="rw-spin"><Loader2 size={22} /></span> : <Upload size={22} />}</span>
      <div className="zt">{label}</div>
      <div className="zs">Click to upload</div>
    </div>
  );
}

/* ── Expired insurance banner (real logic preserved) ── */
function ExpiredInsuranceBanner({ referralId, onUpdated }: { referralId: string; onUpdated: () => void }) {
  const [mode, setMode] = useState<null | "manual">(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    primary_plan_name: "", primary_member_id: "", primary_group_number: "", primary_rxbin: "", primary_rxpcn: "",
    policyholder_name: "", secondary_plan_name: "", secondary_member_id: "",
  });
  const upload = async (file: File) => {
    setUploading(true);
    try {
      await clinicApi.uploadDocument(referralId, file, "insurance");
      await clinicApi.finalizeReferral(referralId);
      toast({ title: "Insurance card uploaded", description: "Re-extracting data..." });
      onUpdated();
    } catch (err: any) { toast({ title: "Upload failed", description: err.message, variant: "destructive" }); }
    finally { setUploading(false); }
  };
  const saveManual = async () => {
    setSaving(true);
    try { await clinicApi.updateReferralInsurance(referralId, form); toast({ title: "Insurance updated" }); onUpdated(); }
    catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };
  return (
    <div style={{ marginTop: 14, borderRadius: "var(--radius-md)", border: "1px solid color-mix(in srgb, var(--color-warning) 38%, transparent)", background: "color-mix(in srgb, var(--color-warning) 8%, transparent)", padding: 13 }}>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
        <AlertTriangle size={16} style={{ color: "#B45309", flexShrink: 0, marginTop: 1 }} />
        <div><p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "#92400E", margin: 0 }}>Insurance on file has expired</p><p style={{ fontSize: "var(--text-xs)", color: "#B45309", margin: "2px 0 0" }}>Upload a current card or enter the new plan details to continue.</p></div>
      </div>
      {!mode && !uploading && (
        <div style={{ display: "flex", gap: 9, marginTop: 12 }}>
          <button className="rw-btn primary sm" onClick={() => fileRef.current?.click()}><Upload size={14} />Upload Card</button>
          <button className="rw-btn outline sm" onClick={() => setMode("manual")}><Pencil size={14} />Enter Manually</button>
          <input ref={fileRef} type="file" style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
      )}
      {uploading && <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: "var(--text-muted)", marginTop: 10 }}><span className="rw-spin"><Loader2 size={14} /></span> Uploading and re-extracting...</div>}
      {mode === "manual" && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            <div><Label className="text-xs">Plan Name</Label><Input className="h-8 text-sm mt-1" value={form.primary_plan_name} onChange={(e) => setForm((f) => ({ ...f, primary_plan_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Member ID</Label><Input className="h-8 text-sm mt-1" value={form.primary_member_id} onChange={(e) => setForm((f) => ({ ...f, primary_member_id: e.target.value }))} /></div>
            <div><Label className="text-xs">Group #</Label><Input className="h-8 text-sm mt-1" value={form.primary_group_number} onChange={(e) => setForm((f) => ({ ...f, primary_group_number: e.target.value }))} /></div>
            <div><Label className="text-xs">Policyholder</Label><Input className="h-8 text-sm mt-1" value={form.policyholder_name} onChange={(e) => setForm((f) => ({ ...f, policyholder_name: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 9 }}>
            <button className="rw-btn primary sm" onClick={saveManual} disabled={saving}>{saving ? <span className="rw-spin"><Loader2 size={14} /></span> : <CheckCircle size={14} />}Save Insurance</button>
            <button className="rw-btn outline sm" onClick={() => setMode(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
