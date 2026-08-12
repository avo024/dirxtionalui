import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { ArrowLeft, FileText, Loader2, Send, RefreshCw, AlertTriangle, Shield, User, CreditCard, Pill, Stethoscope, UserRound, Inbox, Paperclip,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DeliveryConfirmModal } from "@/components/DeliveryConfirmModal";
import { PAManagementCard, type PALetterInfo } from "@/components/PAManagementCard";
import { TagListEditor } from "@/components/TagListEditor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getReferralPAInfo } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateShort } from "@/lib/dateUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DrugCombobox } from "@/components/DrugCombobox";
import { getDisplayAuthor, getAuthorInitials } from "@/lib/noteAuthor";
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { AdminRejectModal, FLAGGABLE_FIELDS, type RejectPayload } from "@/components/AdminRejectModal";
import { EligibilityPanel } from "@/components/EligibilityPanel";
import { PAAppealCard } from "@/components/PAAppealCard";
import { ReferralTasksCard } from "@/components/ReferralTasksCard";
import "../clinic/wizard.css";
import "./admin-referral-review.css";

// Critical fields that should be flagged when missing
const CRITICAL_FIELDS = [
  "patient.first_name",
  "patient.last_name",
  "patient.dob",
  "insurance.primary_member_id",
  "clinical.drug_requested",
  "clinical.diagnosis_icd10_primary",
  "provider.npi",
];

/**
 * Next-step strip — one computed line answering "what does this referral need
 * from me right now?" The cards below are reference; this is the instruction.
 */
function NextStepStrip({ referral, referralId }: { referral: any; referralId: string }) {
  const [openTaskCount, setOpenTaskCount] = useState(0);
  useEffect(() => {
    adminApi.getTasks(referralId)
      .then((r) => setOpenTaskCount((r.items || []).filter((t: any) => t.status === "open").length))
      .catch(() => { /* strip just omits the task line */ });
  }, [referralId, referral.status, referral.pa_status]);

  const s = referral.status;
  const pa = referral.pa_status;
  const paRelevant = !referral.is_bridge_program && referral.pa_required;
  // Detail endpoint carries the raw timestamps, not the list's computed
  // flags — derive overdue locally (same 72h rule).
  const isOverdue = (iso?: string | null) => !!iso && Date.now() > new Date(iso).getTime() + 72 * 3600_000;

  let tone: "work" | "wait" | "urgent" | "done" = "wait";
  let text = "";

  if (s === "processing") { tone = "wait"; text = "AI is extracting the documents — nothing to do here yet."; }
  else if (s === "rejected") { tone = "wait"; text = "Waiting on the clinic to fix and resubmit."; }
  else if (s === "sent_to_pharmacy") { tone = "done"; text = "Sent to the pharmacy — done unless a delivery issue comes in."; }
  else if (paRelevant && pa === "appeal") {
    tone = "urgent";
    text = isOverdue(referral.appeal_started_at)
      ? "Appeal follow-up is DUE — check the payer and record the outcome below."
      : "Level-1 appeal in progress — record the outcome when the payer responds.";
  }
  else if (paRelevant && pa === "denied") { tone = "urgent"; text = "PA denied — start an appeal or reject the referral."; }
  else if (paRelevant && pa === "submitted") {
    const due = isOverdue(referral.pa_submitted_at);
    tone = due ? "urgent" : "wait";
    text = due
      ? "PA follow-up is DUE — check CoverMyMeds and record the decision."
      : "PA is with the payer — check CoverMyMeds when the follow-up clock comes due.";
  }
  else if (s === "approved_to_send") { tone = "work"; text = "Double-check everything, then Send to Pharmacy."; }
  else if ((s === "ready_for_review" || s === "uploaded") && paRelevant && pa !== "approved") {
    tone = "work"; text = "Review the extracted data, then submit the PA in PA Management.";
  }
  else if (s === "ready_for_review" || s === "uploaded") {
    tone = "work"; text = "Review the extracted data, then Approve.";
  }
  else return null;

  const style: Record<string, { bg: string; fg: string; border: string }> = {
    work:   { bg: "var(--color-teal-50)", fg: "var(--color-teal-700)", border: "var(--color-teal-100)" },
    wait:   { bg: "color-mix(in srgb, var(--text-muted) 7%, transparent)", fg: "var(--text-muted)", border: "var(--border-default)" },
    urgent: { bg: "color-mix(in srgb, var(--color-error) 8%, transparent)", fg: "var(--color-error)", border: "color-mix(in srgb, var(--color-error) 35%, transparent)" },
    done:   { bg: "color-mix(in srgb, var(--color-success) 8%, transparent)", fg: "var(--color-success)", border: "color-mix(in srgb, var(--color-success) 30%, transparent)" },
  };
  const t = style[tone];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9, margin: "10px 0 0",
      padding: "10px 14px", borderRadius: "var(--radius-md, 8px)",
      background: t.bg, border: `1px solid ${t.border}`, color: t.fg,
      fontSize: 13.5, fontWeight: 600,
    }}>
      {tone === "urgent" ? <AlertTriangle size={15} /> : <ArrowLeft size={15} style={{ transform: "rotate(225deg)" }} />}
      <span style={{ flex: 1 }}>
        Next step: {text}
        {openTaskCount > 0 && <span style={{ fontWeight: 500 }}> · Also waiting on the clinic for {openTaskCount} task{openTaskCount === 1 ? "" : "s"}.</span>}
      </span>
    </div>
  );
}

function ConfidenceDot({ confidence }: { confidence?: number }) {
  if (confidence === undefined || confidence >= 0.85) return null;
  const tone = confidence >= 0.5 ? "mid" : "low";
  return <span className={`arr-dot ${tone}`} title={`Confidence: ${Math.round(confidence * 100)}%`} />;
}

function SummaryField({ label, value, confidence, isCritical = false }: { label: string; value?: string | null; confidence?: number; isCritical?: boolean }) {
  const isEmpty = !value || value.trim() === "";
  return (
    <div className="arr-srow">
      <span className="arr-sk">{label}</span>
      <span className="arr-sv">
        {isEmpty ? (
          isCritical
            ? <span className="arr-field-miss"><AlertTriangle size={11} />Missing — check docs</span>
            : <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>—</span>
        ) : (
          <>
            {value}
            <ConfidenceDot confidence={confidence} />
          </>
        )}
      </span>
    </div>
  );
}

export default function AdminReferralReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fromCaseId = (useLocation().state as any)?.fromCaseId as string | undefined;
  const [searchParams] = useSearchParams();
  const notesDeepLink = searchParams.get("tab") === "notes";
  const [referral, setReferral] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  const [changedSections, setChangedSections] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [paLetterInfo, setPaLetterInfo] = useState<PALetterInfo | null>(null);
  const [isReExtracting, setIsReExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const noteFileRef = useRef<HTMLInputElement>(null);
  const [attachingNote, setAttachingNote] = useState(false);
  const { data: adminProfile } = useAdminProfile();

  // Notes-drop: file → shared team document (clinic sees it under "From your
  // Dirxctional team") + a timeline note marking it. One store, no duplicates.
  const attachViaNote = async (file: File) => {
    if (!id) return;
    setAttachingNote(true);
    try {
      await adminApi.uploadAdminDocument(id, file, "team_document");
      const content = `📎 Attached document: ${file.name}`;
      const result = await adminApi.addReferralNote(id, content);
      const fallbackName = adminProfile && (adminProfile.first_name || adminProfile.last_name)
        ? `${adminProfile.first_name || ''} ${adminProfile.last_name || ''}`.trim()
        : 'Admin';
      setNotes((prev) => [...prev, { id: result.id, author_type: 'admin', author_name: fallbackName, content, created_at: new Date().toISOString(), ...result }]);
      try {
        const docsRes = await adminApi.getReferralDocuments(id);
        setDocuments(docsRes.items || docsRes || []);
      } catch { /* list refresh is best-effort */ }
      toast({ title: "Document attached", description: `${file.name} — saved to Documents, shared with the clinic, noted in the timeline.` });
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (err: any) {
      toast({ title: "Attach failed", description: err.message, variant: "destructive" });
    } finally {
      setAttachingNote(false);
      if (noteFileRef.current) noteFileRef.current.value = "";
    }
  };

  const handlePALetterChange = useCallback((info: PALetterInfo) => {
    setPaLetterInfo(info);
  }, []);

  const fetchReferralData = async (isPolling = false) => {
    if (!id) return;

    try {
      if (!isPolling) setLoading(true);
      const data = await adminApi.getReferral(id);

      const mapped = {
        ...data,
        drug: data.drug_requested,
        blocked: data.preferred_pharmacy_blocked,
      };

      setReferral(mapped);
      setEditedData(mapped.extracted_data || {});

      try {
        const docsRes = await adminApi.getReferralDocuments(id);
        setDocuments(docsRes.items || docsRes || []);
      } catch {
        // Documents may not exist yet
      }

      try {
        const notesRes = await adminApi.getReferralNotes(id);
        setNotes(notesRes.items || []);
      } catch {
        // Notes may not exist yet
      }
    } catch (err: any) {
      if (!isPolling) {
        toast({
          title: "Error",
          description: err.message || "Failed to load referral",
          variant: "destructive",
        });
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [id]);

  // Deep-linked from the dashboard note bell (?tab=notes) — clear the unread flag.
  useEffect(() => {
    if (notesDeepLink && id) localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
  }, [id, notesDeepLink]);

  useEffect(() => {
    if (referral?.status !== 'processing' && !isReExtracting) return;
    const timer = setInterval(async () => {
      await fetchReferralData(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [referral?.status, id, isReExtracting]);

  // Exit re-extract loading only after we've seen the backend flip to 'processing'
  // and then back out (to ready_for_review). Otherwise the initial poll sees the
  // pre-flip status and exits immediately.
  const sawProcessingRef = useRef(false);
  useEffect(() => {
    if (!isReExtracting) {
      sawProcessingRef.current = false;
      return;
    }
    if (referral?.status === 'processing') {
      sawProcessingRef.current = true;
    } else if (sawProcessingRef.current && referral?.status && referral.status !== 'processing') {
      setIsReExtracting(false);
      sawProcessingRef.current = false;
    }
  }, [referral?.status, isReExtracting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading referral...</p>
        </div>
      </div>
    );
  }

  if (!referral) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Referral not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/referrals")}>Back</Button>
      </div>
    );
  }

  const { extracted_data: data } = referral;
  const conf = data?.meta?.confidence || data?.confidence || {};
  const paInfo = getReferralPAInfo(referral);

  const updateField = (section: string, field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: value,
      },
    }));
    setChangedSections(prev => new Set(prev).add(section));
  };

  const updateNestedField = (section: string, subsection: string, field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [subsection]: {
          ...prev?.[section]?.[subsection],
          [field]: value,
        },
      },
    }));
    setChangedSections(prev => new Set(prev).add(section));
  };

  const updateArrayField = (section: string, field: string, items: string[]) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: items,
      },
    }));
    setChangedSections(prev => new Set(prev).add(section));
  };

  const handleSaveSectionChanges = async (section: string) => {
    try {
      await adminApi.updateExtractedData(id!, editedData);
      toast({
        title: "Changes Saved",
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} information has been updated`,
      });
      setChangedSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
      const data = await adminApi.getReferral(id!);
      const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
      setReferral(mapped);
      setEditedData(mapped.extracted_data || {});
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async () => {
    try {
      await adminApi.makeDecision(id!, 'approve');
      toast({
        title: "Referral Approved",
        description: `${referral.patient_name}'s referral has been approved and PDF generated.`,
      });
      setApproveOpen(false);
      const data = await adminApi.getReferral(id!);
      const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
      setReferral(mapped);
      setEditedData(mapped.extracted_data || {});
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to approve referral",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (payload: RejectPayload) => {
    try {
      setRejecting(true);
      await adminApi.makeDecision(id!, 'reject', payload.reason, {
        missing_documents: payload.missing_documents,
        flagged_fields: payload.flagged_fields,
      });
      const flaggedNote = payload.flagged_fields.length ? ` · ${payload.flagged_fields.length} field(s) flagged` : "";
      toast({
        title: "Referral Rejected",
        description: `${referral.patient_name}'s referral was rejected. The clinic has been notified with the recovery checklist${flaggedNote}.`,
      });
      setRejectOpen(false);
      navigate("/admin/referrals");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reject referral",
        variant: "destructive",
      });
    } finally {
      setRejecting(false);
    }
  };

  const handleProcessWithAI = async () => {
    setExtractError(null);
    setIsReExtracting(true);
    try {
      await adminApi.processReferral(id!);
      // Polling effect will pick up new data and exit loading state
    } catch (err: any) {
      setIsReExtracting(false);
      setExtractError(err.message || "Extraction failed — try again");
    }
  };

  const handlePreviewPDF = async () => {
    try {
      const blob = await adminApi.getReferralPDF(id!, true);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const SectionSaveButton = ({ section }: { section: string }) =>
    changedSections.has(section) ? (
      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges(section); }} variant="outline" size="sm" className="ml-auto">Save</Button>
    ) : null;

  // Build summary data helpers
  const patient = editedData?.patient || {};
  const insurance = editedData?.insurance || {};
  const clinical = editedData?.clinical || {};
  const provider = editedData?.provider || {};
  const derm = editedData?.dermatology;

  const drugDisplay = (() => {
    const brand = clinical.brand_name || clinical.drug_requested || "";
    const generic = clinical.generic_name || "";
    if (brand && generic) return `${brand} (${generic})`;
    return brand || generic || "";
  })();

  const addressLine = [patient.address, patient.city, patient.state, patient.zip].filter(Boolean).join(", ");

  const getConf = (key: string) => conf[key];

  return (
    <div className="space-y-0 -mx-6 -my-8 lg:-mx-8">
      {/* Top bar */}
      <div className="arr-header">
        <button className="arr-back" aria-label="Back"
          title={fromCaseId ? "Back to the support case" : "Back to referrals"}
          onClick={() => navigate(fromCaseId ? `/admin/support/${fromCaseId}` : "/admin/referrals")}>
          <ArrowLeft size={16} />
        </button>
        <div className="arr-head-main">
          <div className="arr-name-row">
            <h1 className="arr-name serif">{referral.patient_name}</h1>
            <StatusBadge status={referral.status} />
            {documents.length > 0 && (
              <span className="arr-doc-chip"><FileText size={12} />{documents.length} doc{documents.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="arr-meta">
            <b>{referral.drug}</b>
            <span className="sepbar">·</span>
            <span>{referral.clinic_name}</span>
            <span className="sepbar">·</span>
            <span className="mono">{referral.id}</span>
          </div>
          <NextStepStrip referral={referral} referralId={id!} />
        </div>
        <div className="arr-head-actions">
          {!["processing", "ready_for_review", "approved_to_send"].includes(referral.status) && (
            <button className="rw-btn outline sm" title="Hide from lists (reversible from the Archived view)"
              onClick={async () => {
                if (!window.confirm("Archive this referral? It will be hidden from the lists — restore anytime from the Archived view.")) return;
                try {
                  await adminApi.archiveReferral(id!);
                  toast({ title: "Referral archived" });
                  navigate("/admin/referrals");
                } catch (e: any) {
                  toast({ title: "Couldn't archive", description: e.message, variant: "destructive" });
                }
              }}><Inbox size={14} />Archive</button>
          )}
          {(referral.status === 'uploaded' || referral.status === 'ready_for_review') && (
            <div className="flex flex-col items-end">
              <button className="rw-btn outline sm" onClick={handleProcessWithAI} disabled={isReExtracting}>
                <RefreshCw size={14} />Re-extract
              </button>
              {extractError && (
                <p className="text-xs text-destructive mt-1">{extractError}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Split screen */}
      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 140px)" }}>
        {/* Left: Document viewer */}
        <div className="lg:w-1/2 border-r border-border flex flex-col min-h-[400px]">
          <DocumentViewer documents={documents} className="flex-1" />
        </div>

        {/* Right: Tabbed panel */}
        <div className="lg:w-1/2 overflow-y-auto p-6 pb-28">
          {referral.status === 'processing' || isReExtracting ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold text-foreground">AI is extracting referral details...</p>
              <p className="text-sm text-muted-foreground mt-2">This takes about 30 seconds. You can safely leave this page and come back.</p>
            </div>
          ) : data ? (
            <Tabs
              defaultValue={notesDeepLink ? "notes" : "summary"}
              className="w-full"
              onValueChange={(v) => {
                if (v === "notes" && id) {
                  localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
                }
              }}
            >
              <TabsList className="w-full mb-4">
                <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
                <TabsTrigger value="all-fields" className="flex-1">All Fields</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Notes ({notes.length})</TabsTrigger>
              </TabsList>

              {/* ── Tab 1: Summary ── */}
              <TabsContent value="summary" className="space-y-3">
                {/* Card 1: Patient */}
                <div className="arr-card">
                  <div className="arr-card-head"><span className="hi"><User size={15} /></span><h3>Patient</h3></div>
                  <SummaryField label="Name" value={[patient.first_name, patient.last_name].filter(Boolean).join(" ") || null} confidence={getConf("patient.first_name")} isCritical />
                  <SummaryField label="DOB" value={patient.dob} confidence={getConf("patient.dob")} isCritical />
                  <SummaryField label="Phone" value={patient.phone_primary || patient.phone} confidence={getConf("patient.phone_primary")} />
                  <SummaryField label="Address" value={addressLine || null} />
                </div>

                {/* Card 2: Insurance */}
                <div className={cn("arr-card", referral.insurance_expired && "warn")}>
                  <div className="arr-card-head">
                    <span className="hi"><CreditCard size={15} /></span><h3>Insurance</h3>
                    {referral.insurance_expired && (
                      <span className="he"><span className="arr-badge-expired"><AlertTriangle size={10} />Expired</span></span>
                    )}
                  </div>
                  {referral.is_bridge_program ? (
                    <div className="arr-bridge">
                      <span className="bi"><Shield size={16} /></span>
                      <span className="bt">Bridge Program</span>
                    </div>
                  ) : (
                    <>
                      {insurance.insurance_not_provided && (
                        <div className="arr-ins-banner">
                          <span className="ii"><AlertTriangle size={15} /></span>
                          <span className="it">No insurance provided — patient requests cash pricing</span>
                        </div>
                      )}
                      <SummaryField label="Plan" value={insurance.primary_plan_name || insurance.primary_insurance_name} />
                      <SummaryField label="Member ID" value={insurance.primary_member_id} isCritical />
                      <SummaryField label="Group #" value={insurance.primary_group_number} />
                      <SummaryField label="RxBIN" value={insurance.primary_rxbin} />
                      <SummaryField label="RxPCN" value={insurance.primary_rxpcn} />
                    </>
                  )}
                </div>

                {/* Insurance Eligibility (Availity check from AI extraction) */}
                <EligibilityPanel referral={referral} referralId={id!} />

                {/* Card 3: Medication */}
                <div className="arr-card">
                  <div className="arr-card-head"><span className="hi"><Pill size={15} /></span><h3>Medication</h3></div>
                  <SummaryField label="Drug" value={drugDisplay || null} confidence={getConf("clinical.drug_requested")} isCritical />
                  <SummaryField label="Dose" value={clinical.dose_amount} />
                  <SummaryField label="Frequency" value={clinical.dose_frequency || clinical.frequency} />
                  <SummaryField label="Route" value={clinical.route || clinical.administration} />
                  <div className="mt-3">
                    {referral.is_bridge_program ? (
                      <span className="arr-chip-pa bridge"><Shield size={12} />Bridge Program — PA not required</span>
                    ) : referral.pa_required ? (
                      <span className="arr-chip-pa req"><AlertTriangle size={12} />PA Required{referral.pa_required_reason ? `: ${referral.pa_required_reason}` : ""}</span>
                    ) : (
                      <span className="arr-chip-pa no">No PA Required</span>
                    )}
                  </div>
                </div>

                {/* Card 4: PA Management */}
                {referral.is_bridge_program ? (
                  <div className="arr-card bridge">
                    <div className="arr-card-head"><span className="hi"><Shield size={15} /></span><h3>Prior Authorization</h3></div>
                    <p className="text-sm" style={{ color: "var(--color-teal-700)" }}>PA not required for Bridge Program referrals</p>
                  </div>
                ) : (
                  <PAManagementCard referral={referral} paInfo={paInfo} referralId={id!} onPALetterChange={handlePALetterChange} />
                )}

                {/* Level-1 appeal controls (denied → start; in appeal → outcomes) */}
                <PAAppealCard referral={referral} referralId={id!} onChanged={async () => {
                  const data = await adminApi.getReferral(id!);
                  const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
                  setReferral(mapped);
                }} />

                {/* Clinic tasks + share-a-document (admin ↔ clinic on this referral) */}
                <ReferralTasksCard referralId={id!} adminFirstName={adminProfile?.first_name} />

                {/* Card 5: Diagnosis & Clinical */}
                <div className="arr-card">
                  <div className="arr-card-head"><span className="hi"><Stethoscope size={15} /></span><h3>Diagnosis &amp; Clinical</h3></div>
                  <SummaryField label="ICD-10" value={clinical.diagnosis_icd10_primary || clinical.diagnosis_icd10} confidence={getConf("clinical.diagnosis_icd10_primary")} isCritical />
                  <SummaryField label="Description" value={clinical.diagnosis_description} />
                  {clinical.clinical_justification && (
                    <div className="mt-3">
                      <div className="arr-sub">Clinical Justification</div>
                      <p className="text-sm text-foreground">{clinical.clinical_justification}</p>
                    </div>
                  )}
                  {clinical.prior_failed_medications?.length > 0 && (
                    <div className="mt-3">
                      <div className="arr-sub">Prior Failed Medications</div>
                      <div className="flex flex-wrap gap-1">
                        {clinical.prior_failed_medications.map((med: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">{typeof med === 'string' ? med : (med as any).name || String(med)}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {derm && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="arr-sub" style={{ marginTop: 0 }}>Dermatology Assessment</div>
                      <div className="grid grid-cols-2 gap-x-4">
                        <SummaryField label="BSA%" value={derm.bsa_percentage} />
                        <SummaryField label="POEM" value={derm.poem_score} />
                        <SummaryField label="Itch NRS" value={derm.itch_nrs_score} />
                        <SummaryField label="Severity" value={derm.condition_severity} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card 6: Prescriber */}
                <div className="arr-card">
                  <div className="arr-card-head"><span className="hi"><UserRound size={15} /></span><h3>Prescriber</h3></div>
                  <SummaryField label="Name" value={provider.name} />
                  <SummaryField label="NPI" value={provider.npi} confidence={getConf("provider.npi")} isCritical />
                  <SummaryField label="Phone" value={provider.phone} />
                  <SummaryField label="Fax" value={provider.fax} />
                </div>
              </TabsContent>

              {/* ── Tab 2: All Fields ── */}
              <TabsContent value="all-fields">
                <Accordion type="multiple" defaultValue={["patient", "clinical", "insurance"]} className="space-y-3">

                  {/* ── Patient Information ── */}
                  <AccordionItem value="patient" className="rounded-xl border border-border bg-card card-shadow px-4">
                    <AccordionTrigger className="text-sm font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Patient Information</span>
                        <SectionSaveButton section="patient" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-3 gap-3 pb-2">
                        <FieldEdit label="First Name" value={editedData?.patient?.first_name || ""} confidence={conf["patient.first_name"] ?? conf.first_name} onChange={(v) => updateField("patient", "first_name", v)} />
                        <FieldEdit label="Last Name" value={editedData?.patient?.last_name || ""} confidence={conf["patient.last_name"] ?? conf.last_name} onChange={(v) => updateField("patient", "last_name", v)} />
                        <FieldEdit label="MI" value={editedData?.patient?.middle_initial || editedData?.patient?.mi || ""} onChange={(v) => updateField("patient", "middle_initial", v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Date of Birth" value={editedData?.patient?.dob || ""} confidence={conf["patient.dob"] ?? conf.dob} onChange={(v) => updateField("patient", "dob", v)} />
                        <FieldEdit label="Gender" value={editedData?.patient?.gender || ""} onChange={(v) => updateField("patient", "gender", v)} />
                        <FieldEdit label="Phone (Primary)" value={editedData?.patient?.phone_primary || editedData?.patient?.phone || ""} confidence={conf["patient.phone_primary"] ?? conf.phone} onChange={(v) => updateField("patient", "phone_primary", v)} />
                        <FieldEdit label="Phone (Secondary)" value={editedData?.patient?.phone_secondary || ""} onChange={(v) => updateField("patient", "phone_secondary", v)} />
                        <FieldEdit label="Email" value={editedData?.patient?.email || ""} className="col-span-2" onChange={(v) => updateField("patient", "email", v)} />
                        <FieldEdit label="Address" value={editedData?.patient?.address || ""} className="col-span-2" onChange={(v) => updateField("patient", "address", v)} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 pb-2">
                        <FieldEdit label="City" value={editedData?.patient?.city || ""} onChange={(v) => updateField("patient", "city", v)} />
                        <FieldEdit label="State" value={editedData?.patient?.state || ""} onChange={(v) => updateField("patient", "state", v)} />
                        <FieldEdit label="Zip" value={editedData?.patient?.zip || ""} onChange={(v) => updateField("patient", "zip", v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Height" value={editedData?.patient?.height || ""} onChange={(v) => updateField("patient", "height", v)} />
                        <FieldEdit label="Weight" value={editedData?.patient?.weight || ""} onChange={(v) => updateField("patient", "weight", v)} />
                      </div>
                      <div className="pb-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Allergies</Label>
                        <Textarea value={editedData?.patient?.allergies || ""} onChange={(e) => updateField("patient", "allergies", e.target.value)} className="text-sm" rows={2} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="MRN" value={editedData?.patient?.mrn || ""} onChange={(v) => updateField("patient", "mrn", v)} />
                        <FieldEdit label="Language" value={editedData?.patient?.language || ""} onChange={(v) => updateField("patient", "language", v)} />
                        <FieldEdit label="Preferred Contact Method" value={editedData?.patient?.preferred_contact_method || ""} onChange={(v) => updateField("patient", "preferred_contact_method", v)} />
                      </div>
                      {(editedData?.patient?.guardian?.name || editedData?.patient?.authorized_representative) && (
                        <div className="border-t border-border pt-3 mt-2">
                          <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Guardian / Representative</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <FieldEdit label="Name" value={editedData?.patient?.guardian?.name || editedData?.patient?.authorized_representative || ""} onChange={(v) => updateNestedField("patient", "guardian", "name", v)} />
                            <FieldEdit label="Relationship" value={editedData?.patient?.guardian?.relationship || ""} onChange={(v) => updateNestedField("patient", "guardian", "relationship", v)} />
                            <FieldEdit label="Phone" value={editedData?.patient?.guardian?.phone || editedData?.patient?.authorized_representative_phone || ""} onChange={(v) => updateNestedField("patient", "guardian", "phone", v)} />
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  {/* ── Prescriber Information ── */}
                  <AccordionItem value="provider" className="rounded-xl border border-border bg-card card-shadow px-4">
                    <AccordionTrigger className="text-sm font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Prescriber Information</span>
                        <SectionSaveButton section="provider" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Provider Name" value={editedData?.provider?.name || ""} onChange={(v) => updateField("provider", "name", v)} />
                        <FieldEdit label="NPI" value={editedData?.provider?.npi || ""} confidence={conf["provider.npi"] ?? conf.npi} onChange={(v) => updateField("provider", "npi", v)} />
                        <FieldEdit label="Specialty" value={editedData?.provider?.specialty || ""} className="col-span-2" onChange={(v) => updateField("provider", "specialty", v)} />
                        <FieldEdit label="Phone" value={editedData?.provider?.phone || ""} onChange={(v) => updateField("provider", "phone", v)} />
                        <FieldEdit label="Fax" value={editedData?.provider?.fax || ""} onChange={(v) => updateField("provider", "fax", v)} />
                        <FieldEdit label="Office / Facility Name" value={editedData?.provider?.office_name || ""} className="col-span-2" onChange={(v) => updateField("provider", "office_name", v)} />
                        <FieldEdit label="Office Address" value={editedData?.provider?.office_address || editedData?.provider?.address || ""} className="col-span-2" onChange={(v) => updateField("provider", "office_address", v)} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 pb-2">
                        <FieldEdit label="City" value={editedData?.provider?.office_city || editedData?.provider?.city || ""} onChange={(v) => updateField("provider", "office_city", v)} />
                        <FieldEdit label="State" value={editedData?.provider?.office_state || editedData?.provider?.state || ""} onChange={(v) => updateField("provider", "office_state", v)} />
                        <FieldEdit label="Zip" value={editedData?.provider?.office_zip || editedData?.provider?.zip || ""} onChange={(v) => updateField("provider", "office_zip", v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Collaborating Physician" value={editedData?.provider?.collaborating_physician || ""} onChange={(v) => updateField("provider", "collaborating_physician", v)} />
                        <FieldEdit label="Collaborating NPI" value={editedData?.provider?.collaborating_npi || ""} onChange={(v) => updateField("provider", "collaborating_npi", v)} />
                        <FieldEdit label="DEA Number" value={editedData?.provider?.dea_number || ""} onChange={(v) => updateField("provider", "dea_number", v)} />
                        <FieldEdit label="Tax ID" value={editedData?.provider?.tax_id || ""} onChange={(v) => updateField("provider", "tax_id", v)} />
                        <FieldEdit label="Signature Date" value={editedData?.provider?.signature_date || ""} onChange={(v) => updateField("provider", "signature_date", v)} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ── Prescription / Clinical ── */}
                  <AccordionItem value="clinical" className="rounded-xl border border-border bg-card card-shadow px-4">
                    <AccordionTrigger className="text-sm font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Prescription</span>
                        <SectionSaveButton section="clinical" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pb-3">
                        <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
                          Drug Requested
                          {(conf["clinical.drug_requested"] ?? conf.drug_requested) !== undefined && (
                            <ConfidenceIndicator confidence={conf["clinical.drug_requested"] ?? conf.drug_requested} />
                          )}
                        </Label>
                        <DrugCombobox
                          value={editedData?.clinical?.drug_requested || ""}
                          onChange={(v) => updateField("clinical", "drug_requested", v)}
                          fetchDrugs={adminApi.getFormularyDrugs}
                          onSelectItem={(item) => {
                            updateField("clinical", "brand_name", item.drug_name);
                            if (item.generic_name) {
                              updateField("clinical", "generic_name", item.generic_name);
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Brand Name" value={editedData?.clinical?.brand_name || ""} onChange={(v) => updateField("clinical", "brand_name", v)} />
                        <FieldEdit label="Generic Name" value={editedData?.clinical?.generic_name || ""} onChange={(v) => updateField("clinical", "generic_name", v)} />
                        <FieldEdit label="Primary ICD-10" value={editedData?.clinical?.diagnosis_icd10_primary || editedData?.clinical?.diagnosis_icd10 || ""} confidence={conf["clinical.diagnosis_icd10_primary"] ?? conf.diagnosis_icd10} onChange={(v) => updateField("clinical", "diagnosis_icd10_primary", v)} />
                        <FieldEdit label="Diagnosis Description" value={editedData?.clinical?.diagnosis_description || ""} onChange={(v) => updateField("clinical", "diagnosis_description", v)} />
                      </div>
                      <div className="pb-3">
                        <TagListEditor label="All Diagnoses (ICD-10)" items={editedData?.clinical?.diagnoses || []} onChange={(items) => updateArrayField("clinical", "diagnoses", items)} placeholder="Add ICD-10 code..." />
                      </div>
                      <div className="pb-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Dosing Directions</Label>
                        <Textarea value={editedData?.clinical?.dosing_directions || editedData?.clinical?.dosing || ""} onChange={(e) => updateField("clinical", "dosing_directions", e.target.value)} className="text-sm" rows={2} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 pb-2">
                        <FieldEdit label="Dose Amount" value={editedData?.clinical?.dose_amount || ""} onChange={(v) => updateField("clinical", "dose_amount", v)} />
                        <FieldEdit label="Dose Frequency" value={editedData?.clinical?.dose_frequency || editedData?.clinical?.frequency || ""} onChange={(v) => updateField("clinical", "dose_frequency", v)} />
                        <FieldEdit label="Route" value={editedData?.clinical?.route || editedData?.clinical?.administration || ""} onChange={(v) => updateField("clinical", "route", v)} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 pb-2">
                        <FieldEdit label="Quantity" value={editedData?.clinical?.quantity || ""} onChange={(v) => updateField("clinical", "quantity", v)} />
                        <FieldEdit label="Day Supply" value={editedData?.clinical?.day_supply || ""} onChange={(v) => updateField("clinical", "day_supply", v)} />
                        <FieldEdit label="Refills" value={editedData?.clinical?.refills || editedData?.clinical?.length_of_therapy || ""} onChange={(v) => updateField("clinical", "refills", v)} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Device Type</Label>
                          <Select value={editedData?.clinical?.device_type || ""} onValueChange={(v) => updateField("clinical", "device_type", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pre-filled syringe">Pre-filled syringe</SelectItem>
                              <SelectItem value="Pre-filled pen">Pre-filled pen</SelectItem>
                              <SelectItem value="Auto-injector">Auto-injector</SelectItem>
                              <SelectItem value="Oral">Oral</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Urgency</Label>
                          <Select value={editedData?.clinical?.urgency || ""} onValueChange={(v) => updateField("clinical", "urgency", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="routine">Routine</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                              <SelectItem value="stat">Stat</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 pb-3">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={editedData?.clinical?.is_new_start || false} onCheckedChange={(checked) => updateField("clinical", "is_new_start", checked)} />
                          <Label className="text-xs font-normal">New Start</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={editedData?.clinical?.is_refill || false} onCheckedChange={(checked) => updateField("clinical", "is_refill", checked)} />
                          <Label className="text-xs font-normal">Refill</Label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Loading Dose" value={editedData?.clinical?.loading_dose || ""} onChange={(v) => updateField("clinical", "loading_dose", v)} />
                        <FieldEdit label="Maintenance Dose" value={editedData?.clinical?.maintenance_dose || ""} onChange={(v) => updateField("clinical", "maintenance_dose", v)} />
                      </div>
                      <div className="pb-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Ship To</Label>
                        <Select value={editedData?.clinical?.ship_to || ""} onValueChange={(v) => updateField("clinical", "ship_to", v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Patient's Home">Patient's Home</SelectItem>
                            <SelectItem value="Doctor's Office">Doctor's Office</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2 items-center">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={editedData?.clinical?.loading_dose_received || false} onCheckedChange={(checked) => updateField("clinical", "loading_dose_received", checked)} />
                          <Label className="text-xs font-normal">Loading Dose Received?</Label>
                        </div>
                        {editedData?.clinical?.loading_dose_received && (
                          <FieldEdit label="Start Date" value={editedData?.clinical?.loading_dose_start_date || ""} onChange={(v) => updateField("clinical", "loading_dose_start_date", v)} />
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-2 items-center">
                        <div className="flex items-center gap-2">
                          <Checkbox checked={editedData?.clinical?.tb_ruled_out || false} onCheckedChange={(checked) => updateField("clinical", "tb_ruled_out", checked)} />
                          <Label className="text-xs font-normal">TB Ruled Out?</Label>
                        </div>
                        {editedData?.clinical?.tb_ruled_out && (
                          <FieldEdit label="TB Test Date" value={editedData?.clinical?.tb_test_date || ""} onChange={(v) => updateField("clinical", "tb_test_date", v)} />
                        )}
                      </div>
                      <div className="pb-3">
                        <TagListEditor label="Prior Failed Medications" items={editedData?.clinical?.prior_failed_medications || []} onChange={(items) => updateArrayField("clinical", "prior_failed_medications", items)} placeholder="Add medication..." />
                      </div>
                      <div className="pb-2">
                        <Label className="text-xs text-muted-foreground mb-1 block">Clinical Justification (for PA)</Label>
                        <Textarea value={editedData?.clinical?.clinical_justification || ""} onChange={(e) => updateField("clinical", "clinical_justification", e.target.value)} className="text-sm" rows={3} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ── Insurance ── */}
                  <AccordionItem value="insurance" className={cn("rounded-xl border bg-card card-shadow px-4", referral.insurance_expired ? "border-orange-300" : "border-border")}>
                    <AccordionTrigger className="text-sm font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Insurance</span>
                        <div className="flex items-center gap-2">
                          {referral.insurance_expired && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-[10px]">EXPIRED</Badge>
                          )}
                          <SectionSaveButton section="insurance" />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pb-2">
                        <div className="flex items-center gap-2 pb-2 border-b border-border">
                          <Checkbox
                            checked={referral.insurance_expired || false}
                            onCheckedChange={async (checked) => {
                              try {
                                await adminApi.markInsuranceExpired(id!, !!checked);
                                setReferral((prev: any) => ({ ...prev, insurance_expired: !!checked }));
                                toast({
                                  title: checked ? "Insurance marked as expired" : "Insurance expiration cleared",
                                  description: checked ? "The clinic has been notified." : "Expiration flag removed.",
                                });
                              } catch (err: any) {
                                toast({ title: "Error", description: err.message, variant: "destructive" });
                              }
                            }}
                          />
                          <Label className="text-xs font-normal text-orange-700">Insurance Expired</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox checked={editedData?.insurance?.has_insurance_card || editedData?.insurance?.has_insurance || false} onCheckedChange={(checked) => updateField("insurance", "has_insurance_card", checked)} />
                          <Label className="text-xs font-normal">Has Insurance Card</Label>
                        </div>
                        <Label className="text-xs font-semibold text-muted-foreground block">Primary Insurance</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldEdit label="Plan Name" value={editedData?.insurance?.primary_plan_name || editedData?.insurance?.primary_insurance_name || ""} className="col-span-2" onChange={(v) => updateField("insurance", "primary_plan_name", v)} />
                          <FieldEdit label="Member ID" value={editedData?.insurance?.primary_member_id || ""} onChange={(v) => updateField("insurance", "primary_member_id", v)} />
                          <FieldEdit label="Group Number" value={editedData?.insurance?.primary_group_number || ""} onChange={(v) => updateField("insurance", "primary_group_number", v)} />
                          <FieldEdit label="Policy ID" value={editedData?.insurance?.primary_policy_id || ""} onChange={(v) => updateField("insurance", "primary_policy_id", v)} />
                          <FieldEdit label="Carrier Phone" value={editedData?.insurance?.primary_carrier_phone || ""} onChange={(v) => updateField("insurance", "primary_carrier_phone", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FieldEdit label="RxBIN" value={editedData?.insurance?.primary_rxbin || ""} onChange={(v) => updateField("insurance", "primary_rxbin", v)} />
                          <FieldEdit label="RxPCN" value={editedData?.insurance?.primary_rxpcn || ""} onChange={(v) => updateField("insurance", "primary_rxpcn", v)} />
                        </div>

                        {(editedData?.insurance?.secondary_plan_name || editedData?.insurance?.secondary_insurance_name || editedData?.insurance?.secondary_member_id) && (
                          <div className="border-t border-border pt-3">
                            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Secondary Insurance</Label>
                            <div className="grid grid-cols-2 gap-3">
                              <FieldEdit label="Plan Name" value={editedData?.insurance?.secondary_plan_name || editedData?.insurance?.secondary_insurance_name || ""} className="col-span-2" onChange={(v) => updateField("insurance", "secondary_plan_name", v)} />
                              <FieldEdit label="Member ID" value={editedData?.insurance?.secondary_member_id || ""} onChange={(v) => updateField("insurance", "secondary_member_id", v)} />
                              <FieldEdit label="Group Number" value={editedData?.insurance?.secondary_group_number || ""} onChange={(v) => updateField("insurance", "secondary_group_number", v)} />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <FieldEdit label="Policyholder Name" value={editedData?.insurance?.policyholder_name || ""} onChange={(v) => updateField("insurance", "policyholder_name", v)} />
                          <FieldEdit label="Policyholder Relationship" value={editedData?.insurance?.policyholder_relationship || ""} onChange={(v) => updateField("insurance", "policyholder_relationship", v)} />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Benefit Type</Label>
                          <Select value={editedData?.insurance?.pharmacy_benefit_or_medical_benefit || ""} onValueChange={(v) => updateField("insurance", "pharmacy_benefit_or_medical_benefit", v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pharmacy">Pharmacy Benefit</SelectItem>
                              <SelectItem value="medical">Medical Benefit</SelectItem>
                              <SelectItem value="unknown">Unknown</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
                          <Textarea value={editedData?.insurance?.notes || ""} onChange={(e) => updateField("insurance", "notes", e.target.value)} className="text-sm" rows={2} />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ── Prior Authorization ── */}
                  <AccordionItem value="prior_auth" className="rounded-xl border border-border bg-card card-shadow px-4">
                    <AccordionTrigger className="text-sm font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Prior Authorization (referral metadata)</span>
                        <SectionSaveButton section="prior_auth" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 pb-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Checkbox checked={editedData?.prior_auth?.required || false} onCheckedChange={(checked) => updateField("prior_auth", "required", checked)} />
                            <Label className="text-xs font-normal">PA Required</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox checked={editedData?.prior_auth?.handled_by_clinic ?? editedData?.prior_auth?.handled_by_us ?? false} onCheckedChange={(checked) => updateField("prior_auth", "handled_by_clinic", checked)} />
                            <Label className="text-xs font-normal">Handled by Clinic</Label>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* ── Dermatology (conditional) ── */}
                  {editedData?.dermatology && (
                    <AccordionItem value="dermatology" className="rounded-xl border border-border bg-card card-shadow px-4">
                      <AccordionTrigger className="text-sm font-semibold">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span>Dermatology Assessment <span className="text-xs font-normal text-muted-foreground">(for PA documentation)</span></span>
                          <SectionSaveButton section="dermatology" />
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-4 gap-3 pb-2">
                          <FieldEdit label="BSA %" value={editedData?.dermatology?.bsa_percentage || ""} onChange={(v) => updateField("dermatology", "bsa_percentage", v)} />
                          <FieldEdit label="IGA Score" value={editedData?.dermatology?.iga_score || ""} onChange={(v) => updateField("dermatology", "iga_score", v)} />
                          <FieldEdit label="EASI Score" value={editedData?.dermatology?.easi_score || ""} onChange={(v) => updateField("dermatology", "easi_score", v)} />
                          <FieldEdit label="PASI Score" value={editedData?.dermatology?.pasi_score || ""} onChange={(v) => updateField("dermatology", "pasi_score", v)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pb-2">
                          <FieldEdit label="POEM Score" value={editedData?.dermatology?.poem_score || ""} onChange={(v) => updateField("dermatology", "poem_score", v)} />
                          <FieldEdit label="Itch NRS Score" value={editedData?.dermatology?.itch_nrs_score || ""} onChange={(v) => updateField("dermatology", "itch_nrs_score", v)} />
                          <FieldEdit label="Condition Severity" value={editedData?.dermatology?.condition_severity || ""} className="col-span-2" onChange={(v) => updateField("dermatology", "condition_severity", v)} />
                        </div>
                        <div className="space-y-3 pb-3">
                          <TagListEditor label="Affected Body Areas" items={editedData?.dermatology?.affected_body_areas || []} onChange={(items) => updateArrayField("dermatology", "affected_body_areas", items)} placeholder="Add area..." />
                          <TagListEditor label="Prior Topicals Tried" items={editedData?.dermatology?.prior_topicals_tried || []} onChange={(items) => updateArrayField("dermatology", "prior_topicals_tried", items)} placeholder="Add topical..." />
                          <TagListEditor label="Prior Systemics Tried" items={editedData?.dermatology?.prior_systemics_tried || []} onChange={(items) => updateArrayField("dermatology", "prior_systemics_tried", items)} placeholder="Add systemic..." />
                        </div>
                        <div className="flex items-center gap-2 pb-2">
                          <Checkbox checked={editedData?.dermatology?.phototherapy_tried || false} onCheckedChange={(checked) => updateField("dermatology", "phototherapy_tried", checked)} />
                          <Label className="text-xs font-normal">Phototherapy Tried</Label>
                        </div>
                        <FieldEdit label="Date of Diagnosis" value={editedData?.dermatology?.date_of_diagnosis || ""} onChange={(v) => updateField("dermatology", "date_of_diagnosis", v)} />
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* ── Pharmacy ── */}
                  <AccordionItem value="pharmacy" className="rounded-xl border border-border bg-card card-shadow px-4">
                    <AccordionTrigger className="text-sm font-semibold">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span>Pharmacy</span>
                        <SectionSaveButton section="pharmacy" />
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <FieldEdit label="Preferred Pharmacy Name" value={editedData?.pharmacy?.preferred_pharmacy_name || ""} className="col-span-2" onChange={(v) => updateField("pharmacy", "preferred_pharmacy_name", v)} />
                        <FieldEdit label="Phone" value={editedData?.pharmacy?.preferred_pharmacy_phone || ""} onChange={(v) => updateField("pharmacy", "preferred_pharmacy_phone", v)} />
                        <FieldEdit label="Fax" value={editedData?.pharmacy?.preferred_pharmacy_fax || ""} onChange={(v) => updateField("pharmacy", "preferred_pharmacy_fax", v)} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </TabsContent>

              {/* ── Tab 3: Notes ── */}
              <TabsContent value="notes">
                {notes.length > 0 && (
                  <div className="arr-notes">
                    {notes.map((note) => {
                      const isAdmin = note.author_type === 'admin';
                      const authorName = getDisplayAuthor(note, 'admin');
                      const initials = getAuthorInitials(note, 'admin');
                      return (
                        <div key={note.id} className={cn("arr-note", isAdmin ? "admin" : "clinic")}>
                          <span className="arr-note-ava">{initials}</span>
                          <div className="arr-note-body">
                            <div className="arr-note-card">
                              <div className="arr-note-head">
                                <span className="arr-note-author">{authorName}</span>
                                <span className="arr-note-when">{new Date(note.created_at).toLocaleString()}</span>
                              </div>
                              <p className="arr-note-text">{note.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={notesEndRef} />
                  </div>
                )}
                <div className="flex gap-3 items-end">
                  <Button
                    size="icon"
                    variant="outline"
                    title="Attach a document — shared with the clinic under 'From your Dirxctional team', noted in the timeline"
                    disabled={attachingNote}
                    onClick={() => noteFileRef.current?.click()}
                  >
                    {attachingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </Button>
                  <input ref={noteFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) attachViaNote(f); }} />
                  <Textarea
                    placeholder="Add a note about this referral... (or attach a document with the clip)"
                    value={newNote}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewNote(e.target.value)}
                    rows={2}
                    className="flex-1 min-h-[60px]"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) attachViaNote(f); }}
                  />
                  <Button
                    size="icon"
                    disabled={!newNote.trim() || sendingNote}
                    onClick={async () => {
                      if (!newNote.trim() || !id) return;
                      setSendingNote(true);
                      try {
                        const result = await adminApi.addReferralNote(id, newNote.trim());
                        const fallbackName = adminProfile && (adminProfile.first_name || adminProfile.last_name)
                          ? `${adminProfile.first_name || ''} ${adminProfile.last_name || ''}`.trim()
                          : 'Admin';
                        setNotes((prev) => [...prev, { id: result.id, author_type: 'admin', author_name: fallbackName, content: newNote.trim(), created_at: new Date().toISOString(), ...result }]);
                        setNewNote("");
                        toast({ title: "Note added" });
                        localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
                        setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
                      } catch (err: any) {
                        toast({ title: "Error", description: err.message || "Failed to add note", variant: "destructive" });
                      } finally {
                        setSendingNote(false);
                      }
                    }}
                  >
                    {sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No extracted data yet. Use "Re-extract" to process this referral.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      {referral.status !== 'processing' && !isReExtracting && (
        <div className="arr-actionbar" style={{ position: "fixed", bottom: 0, left: 240, right: 0, zIndex: 10 }}>
          <div className="arr-action-status">
            {(referral.status === 'ready_for_review' || referral.status === 'uploaded') && (
              <span>Preview the PDF before approving</span>
            )}
          </div>
          <div className="arr-action-spacer" />
          <div className="arr-action-group">
            <button className="rw-btn outline" onClick={handlePreviewPDF}>
              <FileText size={16} />Preview PDF
            </button>
            {(referral.status === 'ready_for_review' || referral.status === 'uploaded') && (() => {
              // Mirror of the server approve gate: the PA story must be closed
              // (approved / not required / bridge) before a referral can be approved.
              const paOpen = !referral.is_bridge_program && referral.pa_required && referral.pa_status !== 'approved';
              const paMsg = referral.pa_status === 'denied'
                ? "PA denied — start an appeal or reject the referral."
                : referral.pa_status === 'appeal'
                  ? "Appeal in progress — record its outcome first."
                  : referral.pa_status === 'submitted'
                    ? "PA is with the payer — record its decision first."
                    : "This drug requires a PA — submit it and record the decision first.";
              return (
                <>
                  <button className="rw-btn arr-btn-reject" onClick={() => setRejectOpen(true)}>Reject</button>
                  <div className="arr-tt-wrap">
                    <button className="rw-btn success" onClick={() => setApproveOpen(true)} disabled={paOpen}>Approve</button>
                    {paOpen && <div className="arr-tt">{paMsg}</div>}
                  </div>
                </>
              );
            })()}
            {referral.status === 'approved_to_send' && (
              (() => {
                // Approval evidence = uploaded letter OR a recorded approval with
                // the PA number (CMM sometimes issues a number, no letter).
                const hasRecordedNumber = referral.pa_status === 'approved' && !!(referral.pa_data?.pa_number);
                const blocked = !referral.is_bridge_program && paLetterInfo?.drug_requires_pa && !paLetterInfo?.has_letter && !hasRecordedNumber;
                return (
                  <>
                    <button className="rw-btn outline" onClick={() => setReturnOpen(true)}
                      title="Caught something in the double-check? Pull it back to Needs Review to fix and re-approve.">
                      <ArrowLeft size={15} />Return to review
                    </button>
                    <div className="arr-tt-wrap">
                      <button className="rw-btn success" onClick={() => setDeliverOpen(true)} disabled={blocked}>
                        Send to Pharmacy
                      </button>
                      {blocked && (
                        <div className="arr-tt">
                          PA approval required before sending: upload the approval letter or record the approval with its PA number in PA Management.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Return-to-review modal — reverse an approval before it's sent */}
      <ConfirmModal
        open={returnOpen}
        onOpenChange={setReturnOpen}
        title="Return to review?"
        description="This pulls the referral back to Needs Review so you can fix something before sending. The clinic just sees it in review again — no notification. Re-approving regenerates the PDF."
        confirmLabel="Return to review"
        onConfirm={async () => {
          try {
            await adminApi.unapproveReferral(id!);
            const data = await adminApi.getReferral(id!);
            setReferral({ ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked });
            toast({ title: "Returned to review", description: "Fix what you caught, then approve again." });
          } catch (e: any) {
            toast({ title: "Couldn't return to review", description: e.message, variant: "destructive" });
          }
        }}
      />

      {/* Approve modal */}
      <ConfirmModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve Referral"
        description={`Are you sure you want to approve ${referral.patient_name}'s referral for ${referral.drug}?`}
        confirmLabel="Approve"
        variant="success"
        onConfirm={handleApprove}
      />

      {/* Deliver modal */}
      <DeliveryConfirmModal
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        referralId={id!}
        referral={referral}
        documents={documents}
        paLetterInfo={paLetterInfo}
        patientName={referral?.patient_name}
        drugName={referral?.drug || referral?.drug_requested}
        onDelivered={async () => {
          const data = await adminApi.getReferral(id!);
          const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
          setReferral(mapped);
          setEditedData(mapped.extracted_data || {});
        }}
      />

      {/* Reject modal — structured (reason + missing-docs checklist + flagged fields) */}
      <AdminRejectModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        submitting={rejecting}
        onConfirm={handleReject}
        defaultFlagged={FLAGGABLE_FIELDS.filter((f) => {
          const [sec, key] = f.path.split(".");
          const v = (editedData?.[sec] || {})[key];
          const empty = v == null || String(v).trim() === "";
          const c = conf[f.path];
          return empty || (typeof c === "number" && c < 0.85);
        }).map((f) => f.path)}
      />

      {/* Preview PDF modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>PDF Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-20 bg-secondary/30 rounded-lg">
            <div className="text-center">
              <FileText className="h-12 w-12 text-primary mx-auto mb-3" />
              <p className="font-medium text-foreground">Generated PDF Preview</p>
              <p className="text-sm text-muted-foreground mt-1">PDF generation will be integrated later</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FieldEdit({ label, value, confidence, className, onChange }: { label: string; value: string; confidence?: number; className?: string; onChange?: (newValue: string) => void }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {confidence !== undefined && <ConfidenceIndicator confidence={confidence} />}
      </div>
      <Input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}
