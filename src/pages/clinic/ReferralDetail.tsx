import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, FileText, Clock, User, Pill, Stethoscope, Shield, Copy, CheckCircle,
  Send, Upload, Loader2, XCircle, Plus, AlertTriangle, Image, RefreshCw, Sparkles,
  Circle, Inbox, Search as SearchIcon, Save, X, Pencil, ListChecks, MessageSquareWarning,
  Heart, ArrowRight, Printer, Download, Paperclip, ClipboardList,
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
  closed: "This referral is closed — see the Prior Authorization section for what happened and what your options are.",
};

const DOC_CATEGORIES = [
  { key: "referral_form", label: "Referral Form / Prescription", types: ["referral_form"] },
  { key: "insurance", label: "Insurance Documents", types: ["insurance_front", "insurance_back"] },
  { key: "chart_notes", label: "Chart Notes", types: ["chart_notes"] },
  { key: "other", label: "Other Documents", types: [] as string[] },
  { key: "team", label: "From your Dirxctional team", types: [] as string[] },
];

const MISSING_DOC_LABELS: Record<string, string> = {
  referral_form: "Referral form / prescription",
  demographics: "Patient demographics",
  insurance_front: "Insurance card — front",
  insurance_back: "Insurance card — back",
  chart_notes: "Chart notes",
  prior_auth: "Prior authorization form",
};
const prettyFieldPath = (p: string) =>
  p.split(".").map((s) => s.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase())).join(" · ");

const EVENT_LABELS: Record<string, string> = {
  referral_created: "Referral submitted", referral_finalized: "Documents submitted for processing",
  document_uploaded: "Document uploaded", ai_extraction_completed: "AI extraction completed",
  ai_extraction_completed_auto: "AI extraction completed",
  referral_approved: "Referral approved by admin", referral_rejected: "Referral needs attention",
  referral_rejectd: "Referral needs attention", referral_resubmitted: "Referral resubmitted by clinic",
  referral_edited_by_clinic: "Clinic corrected referral details", pharmacy_reassigned: "Pharmacy reassigned",
  delivery_completed: "Sent to pharmacy", sent_to_pharmacy: "Sent to pharmacy", delivery_failed: "Pharmacy delivery failed",
  delivery_issue_reported: "Delivery issue reported — team alerted",
  pa_submitted: "Prior authorization submitted", pa_approved: "Prior authorization approved",
  pa_denied: "Prior authorization denied", pa_processing: "Prior authorization in processing",
  pa_appeal_started: "Appeal filed with the insurer", pa_appeal_won: "Appeal won — PA approved",
  pa_appeal_level2: "Appeal moved to Level 2 (insurer will contact your office)",
  pa_appeal_final: "Appeal decision final",
  task_created: "Dirxctional requested something from your office",
  task_completed: "Request from Dirxctional completed",
  referral_archived: "Referral archived", referral_unarchived: "Referral restored",
};
// History is an ALLOWLIST of human milestones — compliance/telemetry events
// (document_accessed, validation passes, internal edits, eligibility checks…)
// live in the audit log, not the clinic's timeline. New audit event types are
// invisible here until deliberately added with a label.
const VISIBLE_EVENTS = new Set(Object.keys(EVENT_LABELS));

function eventLabel(t: string) { return EVENT_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/, (c) => c.toUpperCase()); }
function eventIcon(t: string) {
  if (["referral_created", "referral_finalized", "referral_resubmitted"].includes(t)) return Send;
  if (t === "document_uploaded") return FileText;
  if (t === "referral_edited_by_clinic") return Pencil;
  if (t === "ai_extraction_completed" || t === "ai_extraction_completed_auto") return Sparkles;
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved", "pa_appeal_won", "task_completed"].includes(t)) return CheckCircle;
  if (["referral_rejected", "referral_rejectd", "delivery_failed", "pa_denied", "pa_appeal_final", "delivery_issue_reported"].includes(t)) return XCircle;
  if (["pa_submitted", "pa_processing", "pa_appeal_started", "pa_appeal_level2"].includes(t)) return Clock;
  if (t === "task_created") return ClipboardList;
  return Circle;
}
function eventColor(t: string) {
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved", "pa_appeal_won", "task_completed"].includes(t)) return "green";
  if (["referral_rejected", "referral_rejectd", "pa_denied", "delivery_failed", "pa_appeal_final", "delivery_issue_reported"].includes(t)) return "red";
  if (["pa_submitted", "pa_processing", "pa_appeal_started", "pa_appeal_level2", "task_created"].includes(t)) return "amber";
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
    // Documents the Dirxctional team shared back (PA approval letter, appeal
    // outcomes, payer letters) get their own group, whatever their type.
    if (d.from_team) { grouped.team.push(d); return; }
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
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get("tab") === "notes" ? "notes" : "overview");
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [viewerDocId, setViewerDocId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [attachingNote, setAttachingNote] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const noteFileRef = useRef<HTMLInputElement>(null);

  const fetchClinicDocUrl = (docId: string) => clinicApi.getReferralDocumentUrl(id!, docId).then((r) => ({ url: r.url }));

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      clinicApi.getReferral(id),
      clinicApi.getReferralDocuments(id).catch(() => ({ items: [] })),
      clinicApi.getReferralHistory(id).catch(() => ({ items: [] })),
      clinicApi.getReferralNotes(id).catch(() => ({ items: [] })),
      clinicApi.getReferralTasks(id).catch(() => ({ items: [] })),
    ])
      .then(([r, d, h, n, t]) => {
        setReferral(mapReferralFromBackend(r));
        setDocuments(d.items || []);
        setHistory(h.items || []);
        setNotes(n.items || []);
        setTasks(t.items || []);
      })
      .catch((err) => { console.error("Failed to load referral:", err); setError("Failed to load referral details."); })
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadData(); }, [id]);
  // Deep-linked from the dashboard note bell (?tab=notes) — mark notes read so the
  // notification clears once they've actually landed on the Notes tab.
  useEffect(() => {
    if (tab === "notes" && id) localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Chat pane: open on the newest message, and follow as new ones arrive.
  useEffect(() => {
    if (tab === "notes") notesEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [tab, notes.length]);

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
  // Notes-drop (Mari's ask): a file dropped/picked in Notes becomes a normal
  // referral document PLUS a timeline note marking when and why it arrived.
  // One store — the note is the marker, the file lives in Documents.
  const attachViaNote = async (file: File) => {
    if (!id) return;
    setAttachingNote(true);
    try {
      await clinicApi.uploadDocument(id, file, "other");
      const content = `📎 Attached document: ${file.name}`;
      const result = await clinicApi.addReferralNote(id, content);
      setNotes((prev) => [...prev, { id: result.id, author_type: "clinic", author_name: "You", content, created_at: new Date().toISOString(), ...result }]);
      const d = await clinicApi.getReferralDocuments(id).catch(() => ({ items: [] }));
      setDocuments(d.items || []);
      toast({ title: "Document attached", description: `${file.name} — saved to Documents, noted in the timeline.` });
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    } catch (err: any) {
      toast({ title: "Attach failed", description: err.message, variant: "destructive" });
    } finally {
      setAttachingNote(false);
      if (noteFileRef.current) noteFileRef.current.value = "";
    }
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
  // Live fix checklist — each flagged field / missing doc with its resolved state.
  const fieldVal = (path: string) => { const [s, k] = path.split("."); return (data?.[s] || {})[k]; };
  // Forgiving document rule: clinics rarely name/label files, so we don't try to
  // match specific doc types. The requested document(s) count as satisfied once the
  // clinic uploads at least ONE new document after the rejection — the admin
  // re-reviews everything anyway. Fields, by contrast, are checked exactly.
  const rejectedAt = history
    .filter((e: any) => e.event_type === "referral_rejected")
    .reduce((max: string | null, e: any) => (!max || new Date(e.created_at) > new Date(max) ? e.created_at : max), null as string | null);
  const hasNewDoc = documents.some((d: any) => {
    const t = d.uploaded_at || d.created_at;
    return t && (!rejectedAt || new Date(t) > new Date(rejectedAt));
  });
  const fixItems = [
    ...missingDocs.map((k) => ({ kind: "doc", id: k, label: MISSING_DOC_LABELS[k] || k, done: hasNewDoc })),
    ...flaggedFieldPaths.map((p) => ({ kind: "field", id: p, label: `Correct ${prettyFieldPath(p)}`, done: !isEmpty(fieldVal(p)) })),
  ];
  // The checklist is GUIDANCE, not a hard gate — the admin re-reviews on resubmit.
  // Allow resubmit once the clinic has made at least one change since the rejection
  // (edited a field OR uploaded a document). They needn't satisfy every item — e.g.
  // if they had the info on hand they can just edit and resubmit, no re-upload needed.
  const editedSinceReject = !!rejectedAt && history.some(
    (e: any) => e.event_type === "referral_edited_by_clinic" && new Date(e.created_at) > new Date(rejectedAt));
  const canResubmit = fixItems.length === 0 || hasNewDoc || editedSinceReject;

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
          {(referral.status === "uploaded" || referral.status === "rejected") && (
            <button className="rw-btn outline sm" title="Hide this referral from your list (reversible from the Archived view)"
              onClick={async () => {
                if (!window.confirm("Archive this referral? It will be hidden from your list — you can restore it anytime from the Archived view.")) return;
                try {
                  await clinicApi.archiveReferral(id!);
                  toast({ title: "Referral archived", description: "Find it under Archived on My Referrals if you need it back." });
                  navigate("/clinic/referrals");
                } catch (e: any) {
                  toast({ title: "Couldn't archive", description: e.message, variant: "destructive" });
                }
              }}><Inbox size={14} />Archive</button>
          )}
        </div>
      </div>

      {/* Bar C — FixPanel (rejected) or success banner */}
      {rejected ? (
        <FixPanel reason={referral.rejection_reason} items={fixItems} canResubmit={canResubmit} resubmitting={resubmitting}
          onEdit={() => setEditing(true)} onUploadFile={(f: File) => handleUpload(f, "supplemental")} uploading={uploadingCategory === "supplemental"}
          onResubmit={handleResubmit} />
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
            {referral.status === "sent_to_pharmacy" && (
              <DeliveryIssueReporter referralId={id!} onReported={loadData} />
            )}
          </div>
        </div>
      ) : null}

      {/* Action needed — open tasks from the Dirxctional team (not a rejection:
          nothing is wrong, something extra is needed to keep this moving). */}
      {tasks.some((t) => t.status === "open") && (
        <ClinicTasksPanel
          tasks={tasks}
          referralId={id!}
          onChanged={async () => {
            const [t, d] = await Promise.all([
              clinicApi.getReferralTasks(id!).catch(() => ({ items: [] })),
              clinicApi.getReferralDocuments(id!).catch(() => ({ items: [] })),
            ]);
            setTasks(t.items || []);
            setDocuments(d.items || []);
          }}
        />
      )}

      {/* Tabs */}
      <div className="rd-tabs">
        {[{ k: "overview", label: "Overview", icon: FileText, n: null },
          { k: "documents", label: "Documents", icon: FileText, n: documents.length },
          { k: "history", label: "History", icon: Clock, n: history.filter((e) => VISIBLE_EVENTS.has(e.event_type)).length || null },
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
                  <DocumentViewer key={activeDocId} documents={documents} fetchUrl={fetchClinicDocUrl} initialDocId={activeDocId} className="flex-1 min-w-0" />
                ) : (
                  <div className="rd-doc-viewer-empty"><FileText size={28} /><span>No documents to preview</span></div>
                )}
              </div>
            </div>

            {rejected && (
              <p className="rd-upload-hint" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "14px 2px 0", display: "flex", alignItems: "center", gap: 6 }}>
                <ListChecks size={13} />To add missing documents, use “Upload documents” in the fix panel on the Overview tab.
              </p>
            )}
          </>
        )}

        {/* HISTORY */}
        {tab === "history" && (
          <div className="rd-hist">
            {history.filter((e) => VISIBLE_EVENTS.has(e.event_type)).length > 0 ? (
              history.filter((e: any) => VISIBLE_EVENTS.has(e.event_type)).map((event: any, i: number, arr: any[]) => {
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

        {/* NOTES — chat pane: messages scroll inside a capped area, the
            composer stays anchored beneath it, always visible. */}
        {tab === "notes" && (
          <div className="rd-notes">
            <div className="rd-notes-scroll">
              {notes.length === 0 && (
                <div className="rd-notes-empty">
                  <Send size={20} />
                  <p>No notes yet — anything you write here stays with this referral, and your Dirxctional team sees it.</p>
                </div>
              )}
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
            </div>
            <div className="rd-composer">
              <button
                className="rw-btn outline"
                title="Attach a document — it's saved to Documents and noted here"
                disabled={attachingNote}
                onClick={() => noteFileRef.current?.click()}
                style={{ flexShrink: 0 }}
              >
                {attachingNote ? <span className="rw-spin"><Loader2 size={15} /></span> : <Paperclip size={15} />}
              </button>
              <input ref={noteFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) attachViaNote(f); }} />
              <textarea placeholder="Add a note about this referral... (or attach a document with the clip)" value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) attachViaNote(f); }} />
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
  // "closed" = terminal stop at the review step — the PA section explains why.
  const closed = status === "closed";
  const stopped = rejected || closed;
  return (
    <div className="rd-status-card">
      <div className="rd-status-top"><StatusBadge status={status} size="lg" showIcon /></div>
      <p className="rd-status-desc">{desc}</p>
      <div className="rd-prog">
        {steps.map((s, i) => {
          let cls = i < cur ? "done" : i === cur ? "current" : "todo";
          if (stopped && i === 1) cls = "rejected";
          const Icon = s.icon;
          return (
            <div key={s.key} className={`rd-prog-step ${cls}`}>
              <div className="rd-prog-bar" />
              <div className="rd-prog-node">{stopped && i === 1 ? <X size={15} /> : i < cur ? <CheckCircle size={15} /> : <Icon size={15} />}</div>
              <div className="rd-prog-lbl">{stopped && i === 1 ? (rejected ? "Rejected" : "Closed") : s.label}</div>
            </div>
          );
        })}
      </div>
      {rejected && <div className="rd-prog-note"><ArrowRight size={14} />Flagged for attention at review — fix &amp; resubmit to continue</div>}
      {closed && <div className="rd-prog-note"><ArrowRight size={14} />Closed after the insurance appeal — see Prior Authorization below for your options</div>}
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
        {/* CMM access key — front and center, self-explanatory: the clinic can
            open this exact PA in CoverMyMeds at any stage with this key. */}
        {referral.pa_reference && (
          <div style={{ margin: "8px 0 12px", padding: "11px 13px", borderRadius: "var(--radius-md)", background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)" }}>
            <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--color-teal-700)" }}>
              CoverMyMeds Access Key
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "5px 0 6px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, letterSpacing: ".04em", color: "var(--text-primary)" }}>
                {referral.pa_reference}
              </span>
              <button
                type="button"
                title="Copy key"
                onClick={() => { navigator.clipboard?.writeText(referral.pa_reference); toast({ title: "Key copied" }); }}
                style={{ display: "inline-flex", background: "none", border: "1px solid var(--color-teal-100)", borderRadius: 6, padding: "3px 6px", cursor: "pointer", color: "var(--color-teal-700)" }}
              >
                <Copy size={13} />
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: "var(--color-teal-700)" }}>
              Track this prior authorization yourself anytime: enter this key at <b>covermymeds.com</b> along with the patient's last name and date of birth.
            </p>
          </div>
        )}
        <div className="rd-dl">
          <DlRow label="PA Required" value={referral.pa_required ? "Yes" : "No"} />
          {referral.pa_required && (
            <>
              <div className="rd-dl-row"><div className="dk">PA Status</div><div className="dv">
                {!paStatus ? <span className="rd-pa-pill" style={paPillStyle("pending")}>Pending</span>
                  : paStatus === "approved" ? <span style={paPillStyle("approved")}>Approved</span>
                  : paStatus === "denied" && referral.appeal_outcome === "level2" ? <span style={paPillStyle("denied")}>Level 2</span>
                  : paStatus === "denied" && referral.appeal_outcome === "final" ? <span style={paPillStyle("denied")}>Final Denial</span>
                  : paStatus === "denied" ? <span style={paPillStyle("denied")}>Denied</span>
                  : paStatus === "appeal" ? <span style={paPillStyle("denied")}>In Appeal</span>
                  : paStatus === "processing" ? <span style={paPillStyle("processing")}>PA In Progress</span>
                  : paStatus === "submitted" ? <span style={paPillStyle("submitted")}>PA Submitted</span>
                  : <span style={paPillStyle("pending")}>{paStatus}</span>}
              </div></div>
              {/* CMM reference shows whenever it exists — the clinic can look
                  the PA up in CoverMyMeds themselves at any stage. */}
              {/* Payer approval # (issued on approval) vs CMM access key
                  (issued at request creation — lets the office look the PA up
                  in CoverMyMeds at any stage). Different things, both shown. */}
              {referral.pa_number && <DlRow label="PA Approval #" value={referral.pa_number} mono />}
              {paStatus === "approved" && referral.pa_expiration_date && <DlRow label="PA Expires" value={formatDateShort(referral.pa_expiration_date)} />}
              {paStatus === "denied" && referral.pa_denial_reason && <DlRow label="Denial Reason" value={referral.pa_denial_reason} />}
              <DlRow label="PA Handled By" value={priorAuth.handled_by_us ? "Dirxctional" : "Clinic"} />
              {referral.appeal_outcome === "level2" && (
                <p style={{ fontSize: 12, lineHeight: 1.5, margin: "8px 0 0", padding: "8px 10px", borderRadius: 8, background: "hsl(var(--status-review-bg))", color: "hsl(var(--status-review-fg))" }}>
                  The insurance company is working with your office directly on this appeal — expect contact from them.
                </p>
              )}
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
function FixPanel({ reason, items = [], canResubmit, resubmitting, onEdit, onUploadFile, uploading, onResubmit }: any) {
  const [showUpload, setShowUpload] = useState(false);
  const doneCount = items.filter((i: any) => i.done).length;
  const total = items.length;
  const docItems = items.filter((i: any) => i.kind === "doc");
  return (
    <div className="rd-fix">
      <div className="rd-fix-head">
        <span className="fi"><AlertTriangle size={20} /></span>
        <div><p className="ft">Referral Needs Attention</p><p className="fs">Resolve the items below, then resubmit for review.</p></div>
        <span className="he"><StatusBadge status="rejected" size="md" /></span>
      </div>
      <div className="rd-fix-grid">
        <div className="rd-fix-block">
          <p className="rd-fix-k"><MessageSquareWarning size={14} />What needs attention</p>
          <div className="rd-fix-reason">{reason || "This referral needs attention. Contact our team for details."}</div>
        </div>
        <div className="rd-fix-block">
          <p className="rd-fix-k">
            <ListChecks size={14} />What's needed
            {total > 0 && (
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 9999, color: canResubmit ? "var(--color-success)" : "var(--color-warning)", background: canResubmit ? "color-mix(in srgb, var(--color-success) 13%, transparent)" : "color-mix(in srgb, var(--color-warning) 14%, transparent)" }}>{doneCount}/{total} resolved</span>
            )}
          </p>
          <ul className="rd-checklist">
            {total === 0 && <li className="rd-check-item"><span className="ck"><Circle size={15} /></span><span>Review what needs attention and correct the referral.</span></li>}
            {items.map((it: any) => (
              <li className="rd-check-item" key={it.kind + it.id}>
                <span className="ck" style={it.done ? { color: "var(--color-success)" } : undefined}>{it.done ? <CheckCircle size={15} /> : <Circle size={15} />}</span>
                <span style={it.done ? { color: "var(--text-muted)", textDecoration: "line-through" } : undefined}>
                  {it.label}{!it.done && <AlertTriangle size={12} style={{ verticalAlign: "-1px", marginLeft: 4, color: "var(--color-warning)" }} />}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="rd-fix-actions">
        <span className="rd-fix-actions-lbl">Fix this referral</span>
        <button className="rw-btn outline" onClick={onEdit}><Pencil size={15} />Edit details</button>
        <button className="rw-btn outline" onClick={() => setShowUpload((v: boolean) => !v)}><Upload size={15} />Upload documents</button>
        <span title={!canResubmit ? "Edit a field or upload a document before resubmitting" : undefined} style={{ display: "inline-flex" }}>
          <button className="rw-btn primary" onClick={onResubmit} disabled={!canResubmit || resubmitting}>
            {resubmitting ? <span className="rw-spin"><Loader2 size={15} /></span> : <RefreshCw size={15} />}Resubmit
          </button>
        </span>
      </div>
      {showUpload && (
        <div style={{ padding: "18px 24px 22px", borderTop: "1px solid var(--border-default)", background: "var(--bg-muted)" }}>
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            {docItems.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--text-muted)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: ".04em", textAlign: "center" }}>Documents requested</p>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                  {docItems.map((d: any) => (
                    <li key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "var(--text-sm)", color: d.done ? "var(--text-muted)" : "var(--text-body)" }}>
                      <span style={{ color: d.done ? "var(--color-success)" : "var(--color-stone-400)", display: "inline-flex" }}>{d.done ? <CheckCircle size={14} /> : <Circle size={14} />}</span>
                      <span style={d.done ? { textDecoration: "line-through" } : undefined}>{d.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <UploadZone label="Upload referral packet or any missing document" uploading={uploading} onUpload={onUploadFile} />
            <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "10px 0 0", textAlign: "center" }}>Adding a document — or editing a field — lets you resubmit.</p>
          </div>
        </div>
      )}
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
      toast({ title: "Details saved", description: "Your progress is saved — resubmit from the checklist once everything is resolved." });
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

/** "Pharmacy didn't receive this?" — clinic-side delivery-issue reporter.
 * One click files the details as a referral note (kept with the patient's
 * record) AND opens a tracked Delivery-issue case in Help & Support, alerting
 * the Dirxctional team urgently. Inline expand — no modal dependencies. */
/* ── Action-needed panel: open tasks from the Dirxctional team ── */
function ClinicTasksPanel({ tasks, referralId, onChanged }: { tasks: any[]; referralId: string; onChanged: () => Promise<void> }) {
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status !== "open");

  const sendReply = async (taskId: string) => {
    const msg = (replies[taskId] || "").trim();
    if (!msg) return;
    setBusy(taskId);
    try {
      await clinicApi.respondToTask(referralId, taskId, msg);
      setReplies((r) => ({ ...r, [taskId]: "" }));
      toast({ title: "Reply sent", description: "Your Dirxctional team has been notified." });
      await onChanged();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  const uploadForTask = async (taskId: string, file: File) => {
    setBusy(taskId);
    try {
      await clinicApi.uploadDocument(referralId, file, "other", taskId);
      toast({ title: "Document uploaded", description: `${file.name} — attached to this request.` });
      await onChanged();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
      const ref = fileRefs.current[taskId];
      if (ref) ref.value = "";
    }
  };

  return (
    <div style={{
      border: "1px solid hsl(var(--warning) / 0.5)", background: "hsl(var(--warning) / 0.08)",
      borderRadius: "var(--radius)", padding: "16px 18px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ClipboardList size={17} style={{ color: "hsl(var(--warning))" }} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Action needed from your office</h3>
      </div>
      <p style={{ fontSize: 12.5, color: "hsl(var(--muted-foreground))", margin: "0 0 12px" }}>
        Nothing is wrong with this referral — your Dirxctional team just needs something extra to keep it moving.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {open.map((t) => (
          <div key={t.id} style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)", padding: "12px 14px" }}>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{t.instructions}</p>
            <p style={{ margin: "4px 0 10px", fontSize: 11.5, color: "hsl(var(--muted-foreground))" }}>
              {t.created_by} · {formatDateShort(t.created_at)}
              {t.document_count > 0 && ` · ${t.document_count} document${t.document_count === 1 ? "" : "s"} uploaded`}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                placeholder="Type a reply…"
                value={replies[t.id] || ""}
                onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") sendReply(t.id); }}
                style={{ flex: "1 1 220px", font: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: "var(--radius)", border: "1px solid hsl(var(--border))", background: "hsl(var(--background))" }}
              />
              <button className="rw-btn primary sm" disabled={busy === t.id || !(replies[t.id] || "").trim()} onClick={() => sendReply(t.id)}>
                {busy === t.id ? <Loader2 size={14} className="rw-spin" /> : <Send size={14} />}Reply
              </button>
              <button className="rw-btn outline sm" disabled={busy === t.id} onClick={() => fileRefs.current[t.id]?.click()}>
                <Upload size={14} />Upload document
              </button>
              <input ref={(el) => { fileRefs.current[t.id] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadForTask(t.id, f); }} />
            </div>
          </div>
        ))}
      </div>
      {done.length > 0 && (
        <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "hsl(var(--muted-foreground))" }}>
          ✓ {done.length} earlier request{done.length === 1 ? "" : "s"} completed
        </p>
      )}
    </div>
  );
}

function DeliveryIssueReporter({ referralId, onReported }: { referralId: string; onReported: () => void }) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [openedCaseId, setOpenedCaseId] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async () => {
    const body = details.trim();
    if (!body) return;
    setSending(true);
    try {
      const res = await clinicApi.reportDeliveryIssue(referralId, body);
      setOpen(false);
      setDetails("");
      // NOTE: do NOT reload the page here — the parent's loading spinner would
      // unmount this component and silently eat the confirmation card. The
      // refresh happens when the user dismisses the confirmation.
      setOpenedCaseId(res.case_id);
    } catch (err: any) {
      toast({ title: "Couldn't send", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  // Success confirmation — make the moment unmissable: an URGENT case exists,
  // here's its number, and one click goes straight to it.
  if (openedCaseId) {
    return (
      <div style={{ marginTop: 12, background: "var(--color-teal-50)", border: "1px solid var(--color-teal-100)", borderRadius: "var(--radius-md)", padding: "16px 18px", maxWidth: 560 }}>
        <p style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--color-teal-700)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle size={18} /> Urgent case opened — #{openedCaseId.slice(0, 8)}
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--text-body)", margin: "8px 0 0", lineHeight: 1.55 }}>
          Our team has been <b>alerted immediately</b> — delivery issues are a top priority for us.
          Your message is attached to this referral for our team, and your case tracks it from
          here until it's resolved. We'll email you with every update.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="rw-btn primary sm" onClick={() => navigate(`/clinic/support?case=${openedCaseId}`)}>
            View my case<ArrowRight size={14} />
          </button>
          <button className="rw-btn outline sm" onClick={() => { setOpenedCaseId(null); onReported(); }}>Stay on this referral</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {!open ? (
        <button className="rw-btn outline sm" onClick={() => setOpen(true)}>
          <MessageSquareWarning size={14} />
          Pharmacy didn't receive this?
        </button>
      ) : (
        <div style={{ background: "color-mix(in srgb, var(--color-warning) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)", borderRadius: "var(--radius-md)", padding: "12px 14px", maxWidth: 560 }}>
          <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px" }}>
            Tell us what the pharmacy said
          </p>
          <textarea
            className="rw-textarea"
            rows={3}
            placeholder='e.g. "Called the pharmacy at 2pm — they have no record of receiving this referral."'
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="rw-btn outline sm" onClick={() => { setOpen(false); setDetails(""); }} disabled={sending}>Cancel</button>
            <button className="rw-btn primary sm" onClick={submit} disabled={!details.trim() || sending}>
              {sending ? <span className="rw-spin" style={{ display: "inline-flex" }}><Loader2 size={14} /></span> : <Send size={14} />}
              Report issue
            </button>
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "8px 0 0" }}>
            This alerts our team immediately and opens a tracked request you can follow in Help &amp; Support.
          </p>
        </div>
      )}
    </div>
  );
}
