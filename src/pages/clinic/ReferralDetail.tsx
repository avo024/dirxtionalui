import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, FileText, Clock, User, Pill, Stethoscope, Shield, Copy, CheckCircle,
  Send, Upload, Loader2, XCircle, AlertTriangle, Image, RefreshCw,
  Circle, Inbox, Save, X, Pencil, ArrowRight, Printer, Paperclip, ClipboardList, Download,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { underlineTabsListClass, underlineTabsTriggerClass } from "@/components/patterns/underlineTabs";
import { DefinitionList } from "@/components/patterns/DefinitionList";
import { MessageThread } from "@/components/patterns/MessageThread";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ReferralStatus } from "@/types";
import { clinicApi } from "@/lib/api";
import { mapReferralFromBackend } from "@/lib/dataMapper";
import { formatDateTime, formatDateShort } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer } from "@/components/patterns/PageContainer";

const statusDescriptions: Record<string, string> = {
  uploaded: "Your referral has been received and is awaiting review.",
  processing: "Your referral is currently being reviewed by our team.",
  ready_for_review: "Our clinical team is reviewing the referral details.",
  approved_to_send: "Your referral has been approved and is being sent to the pharmacy.",
  sent_to_pharmacy: "Your referral has been sent to the assigned pharmacy.",
  rejected: "This referral needs your attention before it can proceed.",
  closed: "This referral is closed — see the Prior Authorization section for what happened and what your options are.",
};

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
  if (t === "ai_extraction_completed" || t === "ai_extraction_completed_auto") return CheckCircle;
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved", "pa_appeal_won", "task_completed"].includes(t)) return CheckCircle;
  if (["referral_rejected", "referral_rejectd", "delivery_failed", "pa_denied", "pa_appeal_final", "delivery_issue_reported"].includes(t)) return XCircle;
  if (["pa_submitted", "pa_processing", "pa_appeal_started", "pa_appeal_level2"].includes(t)) return Clock;
  if (t === "task_created") return ClipboardList;
  return Circle;
}
function eventColorClass(t: string) {
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved", "pa_appeal_won", "task_completed"].includes(t)) return "bg-success/12 text-success";
  if (["referral_rejected", "referral_rejectd", "pa_denied", "delivery_failed", "pa_appeal_final", "delivery_issue_reported"].includes(t)) return "bg-destructive/12 text-destructive";
  if (["pa_submitted", "pa_processing", "pa_appeal_started", "pa_appeal_level2", "task_created"].includes(t)) return "bg-warning/15 text-[#B45309]";
  if (["ai_extraction_completed", "ai_extraction_completed_auto"].includes(t)) return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}
function docIcon(filename: string) {
  const ext = filename?.split(".").pop()?.toLowerCase();
  return ["jpg", "jpeg", "png", "tiff", "tif"].includes(ext || "") ? Image : FileText;
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
// Required-ish fields that get a flag when empty.
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
  const [editing, setEditing] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [attachingNote, setAttachingNote] = useState(false);
  const noteFileRef = useRef<HTMLInputElement>(null);

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
      try {
        await clinicApi.uploadDocument(id, file, "other");
      } catch (err: any) {
        toast({ title: "Attach failed", description: err.message, variant: "destructive" });
        return;
      }
      try {
        const content = `📎 Attached document: ${file.name}`;
        const result = await clinicApi.addReferralNote(id, content);
        setNotes((prev) => [...prev, { id: result.id, author_type: "clinic", author_name: "You", content, created_at: new Date().toISOString(), ...result }]);
        toast({ title: "Document attached", description: `${file.name} — saved to Documents, noted in the timeline.` });
      } catch (err: any) {
        toast({ title: "Document attached — but the note failed to post", description: err.message, variant: "destructive" });
      }
      const d = await clinicApi.getReferralDocuments(id).catch(() => ({ items: [] }));
      setDocuments(d.items || []);
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
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add note", variant: "destructive" });
    } finally { setSendingNote(false); }
  };

  if (loading) {
    return <PageContainer fade={false} className="flex justify-center py-20"><Loader2 width={26} height={26} className="animate-spin text-primary" /></PageContainer>;
  }
  if (error || !referral) {
    return (
      <PageContainer fade={false} className="text-center py-20">
        <p className="text-muted-foreground">{error || "Referral not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Back to Referrals</Button>
      </PageContainer>
    );
  }

  const data = referral.extracted_data || {};
  const patient = data.patient || {}, clinical = data.clinical || {}, provider = data.provider || {}, insurance = data.insurance || {}, priorAuth = data.prior_auth || {};
  const patientFullName = patient.full_name || `${patient.first_name || ""} ${patient.last_name || ""}`.trim() || "—";
  const rejected = referral.status === "rejected";
  // Highlight ONLY what the admin team explicitly flagged on reject — never fields the
  // AI merely left blank. The clinic fixes exactly what we marked, nothing else.
  const adminFlaggedSet = new Set<string>(referral.missing_fields?.flagged_fields || []);
  const isFlagged = (sec: string, k: string) => adminFlaggedSet.has(`${sec}.${k}`);
  const flagCount = (sec: string) => [...adminFlaggedSet].filter((p) => p.startsWith(sec + ".")).length;
  const missingDocs: string[] = referral.missing_fields?.missing_documents || [];
  const flaggedFieldPaths: string[] = referral.missing_fields?.flagged_fields || [];
  const fieldVal = (path: string) => { const [s, k] = path.split("."); return (data?.[s] || {})[k]; };
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
  const editedSinceReject = !!rejectedAt && history.some(
    (e: any) => e.event_type === "referral_edited_by_clinic" && new Date(e.created_at) > new Date(rejectedAt));
  const canResubmit = fixItems.length === 0 || hasNewDoc || editedSinceReject;

  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied!", description: `${label} copied to clipboard` }); };
  const visibleHistory = history.filter((e: any) => VISIBLE_EVENTS.has(e.event_type));

  const downloadDoc = async (docId: string) => {
    try {
      const res = await clinicApi.getReferralDocumentUrl(id!, docId);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast({ title: "Couldn't open document", description: e.message, variant: "destructive" });
    }
  };

  return (
    <PageContainer>
      <button className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft width={15} height={15} strokeWidth={1.75} />Back to Referrals
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-semibold font-editorial text-foreground">{referral.patient_name || patientFullName}</h1>
            <StatusBadge status={referral.status} size="md" showIcon variant="soft" />
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
              {referral.id.toUpperCase()}
              <button title="Copy ID" onClick={() => copy(referral.id, "Referral ID")}><Copy width={12} height={12} strokeWidth={1.75} /></button>
            </span>
            {referral.pa_status && <ClinicPABadge status={referral.pa_status} appealOutcome={referral.appeal_outcome} />}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1.5">
            <b className="text-foreground font-semibold">{referral.drug || "—"}</b>
            <span>·</span><span>Created {formatDateShort(referral.created_at)}</span>
            {referral.created_by_name && <><span>·</span><span>by {referral.created_by_name}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(referral.status === "ready_for_review" || referral.status === "uploaded") && (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil width={14} height={14} strokeWidth={1.75} />Edit details</Button>
          )}
          <Button size="sm" variant="outline" onClick={() => window.print()}><Printer width={14} height={14} strokeWidth={1.75} />Print</Button>
          {(referral.status === "uploaded" || referral.status === "rejected") && (
            <Button
              size="sm"
              variant="outline"
              title="Hide this referral from your list (reversible from the Archived view)"
              onClick={async () => {
                if (!window.confirm("Archive this referral? It will be hidden from your list — you can restore it anytime from the Archived view.")) return;
                try {
                  await clinicApi.archiveReferral(id!);
                  toast({ title: "Referral archived", description: "Find it under Archived on My Referrals if you need it back." });
                  navigate("/clinic/referrals");
                } catch (e: any) {
                  toast({ title: "Couldn't archive", description: e.message, variant: "destructive" });
                }
              }}
            >
              <Inbox width={14} height={14} strokeWidth={1.75} />Archive
            </Button>
          )}
        </div>
      </div>

      {/* FixPanel (rejected) or success banner */}
      {rejected ? (
        <FixPanel
          reason={referral.rejection_reason}
          items={fixItems}
          canResubmit={canResubmit}
          resubmitting={resubmitting}
          onEdit={() => setEditing(true)}
          onUploadFile={(f: File) => handleUpload(f, "supplemental")}
          uploading={uploadingCategory === "supplemental"}
          onResubmit={handleResubmit}
        />
      ) : (referral.status === "approved_to_send" || referral.status === "sent_to_pharmacy") && referral.pharmacy_name ? (
        <Alert variant="success" className="mb-5">
          <CheckCircle width={18} height={18} strokeWidth={1.75} />
          <AlertDescription>
            <p className="font-semibold text-foreground mb-1">
              {referral.status === "sent_to_pharmacy" ? "Referral Sent" : "Referral Approved & Sending"}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              {referral.status === "sent_to_pharmacy" ? "This referral has been sent to the pharmacy." : "This referral is approved and on its way to the pharmacy."}
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              <div><p className="text-xs text-muted-foreground">Pharmacy</p><p className="font-medium text-foreground">{referral.pharmacy_name}</p></div>
              {[referral.pharmacy_city, referral.pharmacy_state].filter(Boolean).join(", ") && (
                <div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium text-foreground">{[referral.pharmacy_city, referral.pharmacy_state].filter(Boolean).join(", ")}</p></div>
              )}
              {(referral.pharmacy_phone || referral.pharmacy_email) && (
                <div><p className="text-xs text-muted-foreground">Contact</p><p className="font-medium text-foreground">{referral.pharmacy_phone || referral.pharmacy_email}</p></div>
              )}
            </div>
            {referral.status === "sent_to_pharmacy" && (
              <DeliveryIssueReporter referralId={id!} onReported={loadData} />
            )}
          </AlertDescription>
        </Alert>
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
      <Tabs value={tab} onValueChange={(v) => { setTab(v); if (v === "notes" && id) localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString()); }}>
        <TabsList className={underlineTabsListClass}>
          <TabsTrigger value="overview" className={underlineTabsTriggerClass}>Overview</TabsTrigger>
          <TabsTrigger value="documents" className={underlineTabsTriggerClass}>Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="history" className={underlineTabsTriggerClass}>History ({visibleHistory.length || 0})</TabsTrigger>
          <TabsTrigger value="notes" className={underlineTabsTriggerClass}>Notes ({notes.length || 0})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="pt-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
            <div className="flex flex-col gap-4">
              <InfoCardDL icon={<User width={16} height={16} strokeWidth={1.75} />} title="Patient Information" obj={patient} fields={PATIENT_FIELDS} section="patient" flagCount={flagCount("patient")} isFlagged={isFlagged} />
              <InfoCardDL icon={<Pill width={16} height={16} strokeWidth={1.75} />} title="Clinical Information" obj={clinical} fields={CLINICAL_FIELDS} section="clinical" flagCount={flagCount("clinical")} isFlagged={isFlagged} />
              <InfoCardDL icon={<Stethoscope width={16} height={16} strokeWidth={1.75} />} title="Provider Information" obj={provider} fields={PROVIDER_FIELDS} section="provider" flagCount={flagCount("provider")} isFlagged={isFlagged} />
            </div>
            <div className="flex flex-col gap-4">
              <StatusCard status={referral.status} desc={statusDescriptions[referral.status] || "In progress."} />
              <InsurancePA referral={referral} insurance={insurance} priorAuth={priorAuth} reloadOnUpdate={loadData} referralId={id!} isFlagged={isFlagged} />
            </div>
          </div>
        </TabsContent>

        {/* DOCUMENTS — flat list, never a side-by-side viewer */}
        <TabsContent value="documents" className="pt-5">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileText width={20} height={20} strokeWidth={1.75} /></span>
              <p className="text-sm font-semibold text-foreground">No documents yet</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {documents.map((doc: any) => {
                const DocIcon = docIcon(doc.original_filename || doc.file_name || "");
                const isTeam = !!doc.from_team;
                return (
                  <div key={doc.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><DocIcon width={16} height={16} strokeWidth={1.75} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{doc.original_filename || doc.file_name || doc.name || "Document"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateShort(doc.uploaded_at || doc.created_at)}
                        {doc.doc_type && ` · ${doc.doc_type.replace(/_/g, " ")}`}
                        {isTeam && " · From your Dirxctional team"}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadDoc(doc.id)}><Download width={14} height={14} strokeWidth={1.75} />Download</Button>
                  </div>
                );
              })}
            </div>
          )}
          {rejected && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <ClipboardList width={13} height={13} strokeWidth={1.75} />To add missing documents, use "Upload documents" in the fix panel above.
            </p>
          )}
        </TabsContent>

        {/* HISTORY */}
        <TabsContent value="history" className="pt-5">
          {visibleHistory.length > 0 ? (
            <div className="flex flex-col">
              {visibleHistory.map((event: any, i: number, arr: any[]) => {
                const Icon = eventIcon(event.event_type);
                let label = eventLabel(event.event_type);
                if (event.event_type === "document_uploaded" && event.metadata?.filename) label += `: ${event.metadata.filename}`;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${eventColorClass(event.event_type)}`}><Icon width={15} height={15} strokeWidth={1.75} /></span>
                      {i < arr.length - 1 && <span className="w-px flex-1 bg-border my-1" />}
                    </div>
                    <div className="pb-5 min-w-0">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      {event.event_type === "referral_rejected" && event.metadata?.reason && (
                        <p className="text-sm text-muted-foreground mt-0.5">{event.metadata.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(event.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Clock width={20} height={20} strokeWidth={1.75} /></span>
              <p className="text-sm font-semibold text-foreground">No history yet</p>
              <p className="text-sm text-muted-foreground">Events will appear here as the referral progresses.</p>
            </div>
          )}
        </TabsContent>

        {/* NOTES — the backend already hides PA internals from clinic notes;
            nothing is stripped here, no system lines are added. */}
        <TabsContent value="notes" className="pt-5">
          <MessageThread
            ours="clinic"
            messages={notes.map((note: any) => ({
              side: note.author_type === "admin" ? "ours" : "clinic",
              name: note.author_type === "admin" ? "Dirxctional Team" : (note.author_name || "You"),
              time: formatDateTime(note.created_at),
              body: note.content,
            }))}
            value={newNote}
            onChange={setNewNote}
            onSend={addNote}
            onAttach={() => noteFileRef.current?.click()}
            placeholder="Add a note about this referral… (or attach a document with the clip)"
            empty="No notes yet — anything you write here stays with this referral, and your Dirxctional team sees it."
            hint={attachingNote ? "Attaching document…" : sendingNote ? "Sending…" : "Visible to your Dirxctional team"}
          />
          <input
            ref={noteFileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) attachViaNote(f); }}
          />
        </TabsContent>
      </Tabs>

      {/* Edit drawer */}
      {editing && <EditDrawer referralId={id!} data={data} flaggedSet={adminFlaggedSet} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); loadData(); }} />}
    </PageContainer>
  );
}

/* ── Definition-list info card with flags ── */
function InfoCardDL({ icon, title, obj, fields, section, flagCount, isFlagged }: any) {
  const rows = fields.map((f: any) => {
    const flag = isFlagged ? isFlagged(section, f.k) : ((IMPORTANT[section] || []).includes(f.k) && isEmpty(obj[f.k]));
    let v = obj[f.k];
    if (f.bool) v = v ? "Yes" : "No";
    else if (f.date && v) v = formatDateShort(v);
    return { label: f.label, value: v || undefined, mono: f.mono, copy: f.copy, flag };
  });
  return <DefinitionList title={title} icon={icon} flagged={flagCount} rows={rows} />;
}

/* ── Status card with plain-language sentence ── */
function StatusCard({ status, desc }: { status: string; desc: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="mb-2"><StatusBadge status={status as ReferralStatus} size="lg" showIcon variant="soft" /></div>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
      {status === "rejected" && (
        <p className="flex items-center gap-1.5 text-xs text-destructive mt-2"><ArrowRight width={14} height={14} strokeWidth={1.75} />Flagged for attention at review — fix &amp; resubmit to continue</p>
      )}
      {status === "closed" && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2"><ArrowRight width={14} height={14} strokeWidth={1.75} />Closed after the insurance appeal — see Prior Authorization below for your options</p>
      )}
    </div>
  );
}

/* ── Insurance & PA (two cards) ── */
function InsurancePA({ referral, insurance, priorAuth, reloadOnUpdate, referralId, isFlagged }: any) {
  if (referral.is_bridge_program) {
    return (
      <DefinitionList
        title="Insurance & PA"
        icon={<Shield width={16} height={16} strokeWidth={1.75} />}
        rows={[{ label: "Bridge Program", value: "PA not required" }]}
      />
    );
  }
  const paStatus = referral.pa_status;
  const paLabelMap: Record<string, string> = {
    approved: "Approved", processing: "PA In Progress", submitted: "PA Submitted",
  };
  let paLabel: string | undefined;
  if (!paStatus) paLabel = "Pending";
  else if (paStatus === "approved") paLabel = "Approved";
  else if (paStatus === "denied" && referral.appeal_outcome === "level2") paLabel = "Level 2";
  else if (paStatus === "denied" && referral.appeal_outcome === "final") paLabel = "Final Denial";
  else if (paStatus === "denied") paLabel = "Denied";
  else if (paStatus === "appeal") paLabel = "In Appeal";
  else paLabel = paLabelMap[paStatus] || paStatus;

  return (
    <>
      <DefinitionList
        title="Insurance"
        icon={<Shield width={16} height={16} strokeWidth={1.75} />}
        action={
          referral.insurance_expired ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><XCircle width={14} height={14} strokeWidth={1.75} />Expired</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><CheckCircle width={14} height={14} strokeWidth={1.75} />Valid</span>
          )
        }
        rows={[
          { label: "Has Insurance", value: insurance.has_insurance_card ? "Yes" : "No" },
          ...(insurance.primary_insurance_name || isFlagged?.("insurance", "primary_insurance_name")
            ? [{ label: "Primary Insurance", value: insurance.primary_insurance_name, flag: !!isFlagged?.("insurance", "primary_insurance_name") }]
            : []),
          { label: "Member ID", value: insurance.primary_member_id, flag: !!isFlagged?.("insurance", "primary_member_id") },
          ...(insurance.secondary_insurance_name ? [{ label: "Secondary Insurance", value: insurance.secondary_insurance_name }] : []),
          ...(insurance.notes ? [{ label: "Insurance Notes", value: insurance.notes }] : []),
        ]}
      />
      {referral.insurance_expired && (
        <div className="-mt-2">
          <ExpiredInsuranceBanner referralId={referralId} onUpdated={reloadOnUpdate} />
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground mb-2">Prior Authorization</h3>
        {referral.pa_reference && (
          <div className="mb-3 p-3 rounded-md bg-primary/5 border border-primary/15">
            <p className="text-[10.5px] font-bold tracking-wide uppercase text-primary">CoverMyMeds Access Key</p>
            <div className="flex items-center gap-2 my-1">
              <span className="font-mono text-base font-bold tracking-wide text-foreground">{referral.pa_reference}</span>
              <button
                type="button"
                title="Copy key"
                onClick={() => { navigator.clipboard?.writeText(referral.pa_reference); toast({ title: "Key copied" }); }}
                className="inline-flex items-center rounded-md border border-primary/20 px-1.5 py-1 text-primary"
              >
                <Copy width={13} height={13} strokeWidth={1.75} />
              </button>
            </div>
            <p className="text-[11.5px] leading-relaxed text-primary">
              Track this prior authorization yourself anytime: enter this key at <b>covermymeds.com</b> along with the patient's last name and date of birth.
            </p>
          </div>
        )}
        <DefinitionList
          title="PA details"
          className="border-0 p-0 [&_h3]:hidden [&_.mb-2]:mb-0"
          rows={[
            { label: "PA Required", value: referral.pa_required ? "Yes" : "No" },
            ...(referral.pa_required ? [
              { label: "PA Status", value: paLabel },
              ...(referral.pa_number ? [{ label: "PA Approval #", value: referral.pa_number, mono: true }] : []),
              ...(paStatus === "approved" && referral.pa_expiration_date ? [{ label: "PA Expires", value: formatDateShort(referral.pa_expiration_date) }] : []),
              ...(paStatus === "denied" && referral.pa_denial_reason ? [{ label: "Denial Reason", value: referral.pa_denial_reason }] : []),
              { label: "PA Handled By", value: priorAuth.handled_by_us ? "Dirxctional" : "Clinic" },
            ] : []),
          ]}
        />
        {referral.appeal_outcome === "level2" && (
          <p className="text-xs leading-relaxed mt-2 p-2 rounded-md bg-status-review-bg text-status-review-fg">
            The insurance company is working with your office directly on this appeal — expect contact from them.
          </p>
        )}
      </div>
    </>
  );
}

/* ── FixPanel (rejected recovery) ── */
function FixPanel({ reason, items = [], canResubmit, resubmitting, onEdit, onUploadFile, uploading, onResubmit }: any) {
  const [showUpload, setShowUpload] = useState(false);
  const doneCount = items.filter((i: any) => i.done).length;
  const total = items.length;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden mb-5">
      <Alert variant="destructive" className="rounded-none border-0 border-b border-border">
        <AlertTriangle width={18} height={18} strokeWidth={1.75} />
        <AlertDescription>
          <p className="font-semibold text-foreground mb-1">Referral Needs Attention</p>
          <p>{reason || "This referral needs attention. Contact our team for details."}</p>
        </AlertDescription>
      </Alert>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <p className="text-sm font-semibold text-foreground">What's needed</p>
          {total > 0 && (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${canResubmit ? "bg-success/13 text-success" : "bg-warning/14 text-[#B45309]"}`}>
              {doneCount}/{total} resolved
            </span>
          )}
        </div>
        <ul className="flex flex-col gap-2 mb-4">
          {total === 0 && (
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox checked={false} disabled />Review what needs attention and correct the referral.
            </li>
          )}
          {items.map((it: any) => (
            <li key={it.kind + it.id} className="flex items-center gap-2 text-sm">
              <Checkbox checked={!!it.done} disabled />
              <span className={it.done ? "text-muted-foreground line-through" : "text-foreground"}>{it.label}</span>
              {!it.done && <AlertTriangle width={12} height={12} strokeWidth={1.75} className="text-warning" />}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={onEdit}><Pencil width={15} height={15} strokeWidth={1.75} />Edit referral details</Button>
          <Button variant="outline" onClick={() => setShowUpload((v: boolean) => !v)}><Upload width={15} height={15} strokeWidth={1.75} />Upload documents</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button onClick={onResubmit} disabled={!canResubmit || resubmitting}>
                  {resubmitting ? <Loader2 width={15} height={15} className="animate-spin" /> : <RefreshCw width={15} height={15} strokeWidth={1.75} />}Resubmit
                </Button>
              </span>
            </TooltipTrigger>
            {!canResubmit && <TooltipContent>Edit a field or upload a document before resubmitting</TooltipContent>}
          </Tooltip>
        </div>

        {showUpload && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="max-w-[440px] mx-auto flex flex-col gap-3">
              {items.filter((i: any) => i.kind === "doc").length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center mb-2">Documents requested</p>
                  <ul className="flex flex-col gap-1.5 items-center">
                    {items.filter((i: any) => i.kind === "doc").map((d: any) => (
                      <li key={d.id} className={`flex items-center gap-2 text-sm ${d.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {d.done ? <CheckCircle width={14} height={14} strokeWidth={1.75} className="text-success" /> : <Circle width={14} height={14} strokeWidth={1.75} />}
                        {d.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <UploadZone label="Upload referral packet or any missing document" uploading={uploading} onUpload={onUploadFile} />
              <p className="text-xs text-muted-foreground text-center">Adding a document — or editing a field — lets you resubmit.</p>
            </div>
          </div>
        )}
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
      toast({ title: "Details saved", description: "Your progress is saved — resubmit from the checklist once everything is resolved." });
      onSaved();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message || "Could not save changes.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-[560px] bg-card border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div><h3 className="text-base font-semibold">Edit Referral Details</h3><p className="text-xs text-muted-foreground mt-0.5">Correct any extracted fields, then save — it returns to our team for review.</p></div>
          <button className="text-muted-foreground hover:text-foreground" onClick={onClose} aria-label="Close"><X width={18} height={18} strokeWidth={1.75} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {flaggedSet && flaggedSet.size > 0 && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-warning/12 border border-warning/35 text-[#92400E] text-sm font-semibold">
              <AlertTriangle width={15} height={15} strokeWidth={1.75} className="shrink-0" />
              {flaggedSet.size} field{flaggedSet.size > 1 ? "s" : ""} flagged by our team — highlighted below.
            </div>
          )}
          {EDIT_GROUPS.map((g) => (
            <div key={g.section}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><g.icon width={15} height={15} strokeWidth={1.75} />{g.label}</p>
              <div className="grid grid-cols-2 gap-3">
                {g.fields.map((f: any) => {
                  const flag = !!(flaggedSet && flaggedSet.has(`${g.section}.${f.k}`));
                  const v = draft[g.section][f.k];
                  const span = f.k === "notes" || f.k === "allergies" || f.k === "address";
                  return (
                    <div key={f.k} className={span ? "col-span-2" : undefined}>
                      <Label className="text-xs flex items-center gap-1">{f.label}{flag && <AlertTriangle width={12} height={12} strokeWidth={1.75} className="text-warning" />}</Label>
                      {f.bool ? (
                        <Select value={v ? "Yes" : "No"} onValueChange={(val) => setField(g.section, f.k, val === "Yes")}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="No">No</SelectItem><SelectItem value="Yes">Yes</SelectItem></SelectContent>
                        </Select>
                      ) : f.date ? (
                        <Input type="date" className="mt-1" value={v || ""} onChange={(e) => setField(g.section, f.k, e.target.value)} />
                      ) : span ? (
                        <Textarea className="mt-1" rows={2} value={v || ""} onChange={(e) => setField(g.section, f.k, e.target.value)} />
                      ) : (
                        <Input className={`mt-1 ${flag ? "border-warning" : ""}`} value={v || ""} onChange={(e) => setField(g.section, f.k, e.target.value)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 width={15} height={15} className="animate-spin" /> : <Save width={15} height={15} strokeWidth={1.75} />}Save Details</Button>
        </div>
      </div>
    </>
  );
}

/* ── Upload zone ── */
function UploadZone({ label, uploading, onUpload }: { label: string; uploading: boolean; onUpload: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      onClick={() => ref.current?.click()}
    >
      <input ref={ref} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
      <span className="text-muted-foreground">{uploading ? <Loader2 width={22} height={22} className="animate-spin" /> : <Upload width={22} height={22} strokeWidth={1.75} />}</span>
      <div className="text-sm font-medium text-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">Click to upload</div>
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
    <div className="mt-3.5 rounded-md border border-warning/40 bg-warning/8 p-3.5">
      <div className="flex gap-2 items-start">
        <AlertTriangle width={16} height={16} strokeWidth={1.75} className="text-[#B45309] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#92400E]">Insurance on file has expired</p>
          <p className="text-xs text-[#B45309] mt-0.5">Upload a current card or enter the new plan details to continue.</p>
        </div>
      </div>
      {!mode && !uploading && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={() => fileRef.current?.click()}><Upload width={14} height={14} strokeWidth={1.75} />Upload Card</Button>
          <Button size="sm" variant="outline" onClick={() => setMode("manual")}><Pencil width={14} height={14} strokeWidth={1.75} />Enter Manually</Button>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
        </div>
      )}
      {uploading && <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2.5"><Loader2 width={14} height={14} className="animate-spin" />Uploading and re-extracting...</div>}
      {mode === "manual" && (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div><Label className="text-xs">Plan Name</Label><Input className="h-8 text-sm mt-1" value={form.primary_plan_name} onChange={(e) => setForm((f) => ({ ...f, primary_plan_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Member ID</Label><Input className="h-8 text-sm mt-1" value={form.primary_member_id} onChange={(e) => setForm((f) => ({ ...f, primary_member_id: e.target.value }))} /></div>
            <div><Label className="text-xs">Group #</Label><Input className="h-8 text-sm mt-1" value={form.primary_group_number} onChange={(e) => setForm((f) => ({ ...f, primary_group_number: e.target.value }))} /></div>
            <div><Label className="text-xs">Policyholder</Label><Input className="h-8 text-sm mt-1" value={form.policyholder_name} onChange={(e) => setForm((f) => ({ ...f, policyholder_name: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveManual} disabled={saving}>{saving ? <Loader2 width={14} height={14} className="animate-spin" /> : <CheckCircle width={14} height={14} strokeWidth={1.75} />}Save Insurance</Button>
            <Button size="sm" variant="outline" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

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

  const viewAttachment = async (docId: string) => {
    try {
      const res = await clinicApi.getReferralDocumentUrl(referralId, docId);
      window.open(res.url, "_blank");
    } catch (e: any) {
      toast({ title: "Couldn't open document", description: e.message, variant: "destructive" });
    }
  };

  const allSent = open.length === 0;

  return (
    <div className={`rounded-lg border p-4 mb-5 ${allSent ? "border-success/40 bg-success/6" : "border-warning/50 bg-warning/8"}`}>
      <div className="flex items-center gap-2 mb-1">
        {allSent ? <CheckCircle width={17} height={17} strokeWidth={1.75} className="text-success" /> : <ClipboardList width={17} height={17} strokeWidth={1.75} className="text-[#B45309]" />}
        <h3 className="text-sm font-semibold text-foreground">Action needed from your office</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Nothing is wrong with this referral — your Dirxctional team just needs something extra to keep it moving.
      </p>
      <div className="flex flex-col gap-2.5">
        {tasks.map((t) => {
          const isOpen = t.status === "open";
          const sent = !isOpen;
          return (
            <div key={t.id} className="bg-card border border-border rounded-md p-3.5">
              {(t.attachments?.length ?? 0) > 0 && (
                <div className="mb-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Attached for you:</p>
                  <div className="flex flex-col gap-1.5">
                    {t.attachments.map((a: any) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => viewAttachment(a.id)}
                        className="flex items-center gap-2 w-full text-left text-sm px-2.5 py-2 rounded-md border border-primary/20 bg-primary/5 text-primary"
                      >
                        <Paperclip width={14} height={14} strokeWidth={1.75} className="shrink-0" />
                        <span className="flex-1 font-semibold break-words">{a.filename}</span>
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold shrink-0"><Download width={12} height={12} strokeWidth={1.75} />View / Download</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm leading-relaxed break-words">{t.instructions}</p>
              <p className="text-[11.5px] text-muted-foreground mt-1 mb-2.5">
                Requested {formatDateShort(t.created_at)} by {t.created_by}
              </p>

              {sent ? (
                <div className="rounded-md bg-success/8 border border-success/25 px-3 py-2 text-sm">
                  {t.clinic_response && <p className="text-foreground mb-1">{t.clinic_response}</p>}
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-success"><CheckCircle width={13} height={13} strokeWidth={1.75} />Sent · waiting for your Dirxctional team</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Textarea
                    rows={2}
                    className="resize-none"
                    placeholder="Reply…"
                    value={replies[t.id] || ""}
                    onChange={(e) => setReplies((r) => ({ ...r, [t.id]: e.target.value }))}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" disabled={busy === t.id} onClick={() => fileRefs.current[t.id]?.click()}>
                      <Upload width={14} height={14} strokeWidth={1.75} />{(t.attachments?.length ?? 0) > 0 ? "Upload the completed copy" : "Upload file"}
                    </Button>
                    <input ref={(el) => { fileRefs.current[t.id] = el; }} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadForTask(t.id, f); }} />
                    <Button size="sm" disabled={busy === t.id || !(replies[t.id] || "").trim()} onClick={() => sendReply(t.id)}>
                      {busy === t.id ? <Loader2 width={14} height={14} className="animate-spin" /> : <Send width={14} height={14} strokeWidth={1.75} />}Send response
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {done.length > 0 && open.length > 0 && (
        <p className="text-[11.5px] text-muted-foreground mt-2.5">
          {done.length} earlier request{done.length === 1 ? "" : "s"} completed
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
      setOpenedCaseId(res.case_id);
    } catch (err: any) {
      toast({ title: "Couldn't send", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (openedCaseId) {
    return (
      <div className="mt-3 bg-primary/5 border border-primary/15 rounded-md p-4 max-w-[560px]">
        <p className="text-base font-bold text-primary flex items-center gap-2"><CheckCircle width={18} height={18} strokeWidth={1.75} />Urgent case opened — #{openedCaseId.slice(0, 8)}</p>
        <p className="text-sm text-foreground mt-2 leading-relaxed">
          Our team has been <b>alerted immediately</b> — delivery issues are a top priority for us.
          Your message is attached to this referral for our team, and your case tracks it from
          here until it's resolved. We'll email you with every update.
        </p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" onClick={() => navigate(`/clinic/support?case=${openedCaseId}`)}>View my case<ArrowRight width={14} height={14} strokeWidth={1.75} /></Button>
          <Button size="sm" variant="outline" onClick={() => { setOpenedCaseId(null); onReported(); }}>Stay on this referral</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {!open ? (
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Pharmacy didn't receive this?</Button>
      ) : (
        <div className="bg-warning/7 border border-warning/30 rounded-md p-3.5 max-w-[560px]">
          <p className="text-sm font-semibold text-foreground mb-2">Tell us what the pharmacy said</p>
          <Textarea rows={3} placeholder='e.g. "Called the pharmacy at 2pm — they have no record of receiving this referral."' value={details} onChange={(e) => setDetails(e.target.value)} />
          <div className="flex gap-2 justify-end mt-2">
            <Button size="sm" variant="outline" onClick={() => { setOpen(false); setDetails(""); }} disabled={sending}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={!details.trim() || sending}>
              {sending ? <Loader2 width={14} height={14} className="animate-spin" /> : <Send width={14} height={14} strokeWidth={1.75} />}Report issue
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">This alerts our team immediately and opens a tracked request you can follow in Help &amp; Support.</p>
        </div>
      )}
    </div>
  );
}
