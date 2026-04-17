import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, FileText, Clock, AlertCircle, User,
  Pill, Stethoscope, Shield, Copy, Phone, Mail, CheckCircle,
  Send, Upload, Loader2, XCircle, MessageSquare, Plus,
  AlertTriangle, Image, RefreshCw, Sparkles, Circle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clinicApi } from "@/lib/api";
import { mapReferralFromBackend } from "@/lib/dataMapper";
import { formatDateTime, formatDateShort } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ReferralStatus = "uploaded" | "processing" | "approved_to_send" | "rejected" | "sent_to_pharmacy";

const statusDescriptions: Record<ReferralStatus, string> = {
  uploaded: "Your referral has been received and is awaiting review.",
  processing: "Your referral is currently being reviewed by our team.",
  approved_to_send: "Your referral has been approved and is being sent to the pharmacy.",
  sent_to_pharmacy: "Your referral has been sent to the assigned pharmacy.",
  rejected: "This referral needs your attention. Please see the details below.",
};

// Document category config
const DOC_CATEGORIES = [
  { key: "referral_form", label: "Referral Form / Prescription", types: ["referral_form"] },
  { key: "insurance", label: "Insurance Documents", types: ["insurance_front", "insurance_back"] },
  { key: "chart_notes", label: "Chart Notes", types: ["chart_notes"] },
  { key: "other", label: "Other Documents", types: [] as string[] },
];

// History event config
const EVENT_LABELS: Record<string, string> = {
  referral_created: "Referral submitted",
  referral_finalized: "Documents submitted for processing",
  document_uploaded: "Document uploaded",
  ai_extraction_completed: "AI extraction completed",
  ai_extraction_completed_auto: "AI extraction completed",
  validation_updated: "Document validation updated",
  referral_approved: "Referral approved by admin",
  referral_rejected: "Referral rejected",
  referral_rejectd: "Referral rejected",
  referral_resubmitted: "Referral resubmitted by clinic",
  pharmacy_reassigned: "Pharmacy reassigned",
  delivery_completed: "Sent to pharmacy",
  sent_to_pharmacy: "Sent to pharmacy",
  delivery_failed: "Pharmacy delivery failed",
  pa_submitted: "Prior authorization submitted",
  pa_approved: "Prior authorization approved",
  pa_denied: "Prior authorization denied",
  pa_processing: "Prior authorization in processing",
  admin_edit: "Admin updated referral details",
  final_pdf_generated: "Referral PDF generated",
};

const HIDDEN_EVENTS = new Set(["validation_updated", "admin_edit", "final_pdf_generated"]);

function getEventLabel(eventType: string): string {
  if (EVENT_LABELS[eventType]) return EVENT_LABELS[eventType];
  // Fallback: title-case with underscores replaced
  return eventType.replace(/_/g, ' ').replace(/\b\w/, c => c.toUpperCase());
}

function getEventIcon(eventType: string) {
  if (["referral_created", "referral_finalized", "referral_resubmitted"].includes(eventType)) return Send;
  if (eventType === "document_uploaded") return FileText;
  if (eventType === "ai_extraction_completed" || eventType === "ai_extraction_completed_auto") return Sparkles;
  if (["referral_approved", "delivery_completed", "sent_to_pharmacy", "pa_approved"].includes(eventType)) return CheckCircle;
  if (["referral_rejected", "referral_rejectd", "delivery_failed", "pa_denied"].includes(eventType)) return XCircle;
  if (["pa_submitted", "pa_processing"].includes(eventType)) return Clock;
  return Circle;
}

const EVENT_COLORS: Record<string, string> = {
  referral_approved: "bg-green-500",
  ai_extraction_completed: "bg-blue-500",
  ai_extraction_completed_auto: "bg-blue-500",
  delivery_completed: "bg-green-500",
  sent_to_pharmacy: "bg-green-500",
  pa_approved: "bg-green-500",
  referral_rejected: "bg-destructive",
  referral_rejectd: "bg-destructive",
  pa_denied: "bg-destructive",
  delivery_failed: "bg-destructive",
  pa_submitted: "bg-warning",
  pa_processing: "bg-warning",
};

const DEFAULT_EVENT_COLOR = "bg-primary";

function getDocIcon(filename: string) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'tiff' || ext === 'tif') return Image;
  return FileText;
}

function groupDocuments(docs: any[]) {
  const known = new Set(DOC_CATEGORIES.flatMap(c => c.types));
  const grouped: Record<string, any[]> = {};
  DOC_CATEGORIES.forEach(c => { grouped[c.key] = []; });

  docs.forEach(doc => {
    const type = doc.doc_type || '';
    const cat = DOC_CATEGORIES.find(c => c.types.includes(type));
    if (cat) {
      grouped[cat.key].push(doc);
    } else {
      grouped["other"].push(doc);
    }
  });
  return grouped;
}

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [newUploadsCount, setNewUploadsCount] = useState(0);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const loadData = () => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      clinicApi.getReferral(id),
      clinicApi.getReferralDocuments(id).catch(() => ({ items: [] })),
      clinicApi.getReferralHistory(id).catch(() => ({ items: [] })),
      clinicApi.getReferralNotes(id).catch(() => ({ items: [] })),
    ])
      .then(([referralData, docsData, historyData, notesData]) => {
        setReferral(mapReferralFromBackend(referralData));
        setDocuments(docsData.items || []);
        setHistory(historyData.items || []);
        setNotes(notesData.items || []);
      })
      .catch((err) => {
        console.error("Failed to load referral:", err);
        setError("Failed to load referral details.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const handleUpload = async (file: File, docType: string) => {
    if (!id) return;
    setUploadingCategory(docType);
    try {
      await clinicApi.uploadDocument(id, file, docType);
      toast({ title: "Document uploaded", description: file.name });
      setNewUploadsCount(prev => prev + 1);
      // Refresh docs
      const docsData = await clinicApi.getReferralDocuments(id).catch(() => ({ items: [] }));
      setDocuments(docsData.items || []);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCategory(null);
    }
  };

  const handleResubmit = async () => {
    if (!id) return;
    setResubmitting(true);
    try {
      await clinicApi.resubmitReferral(id);
      toast({
        title: "Referral resubmitted!",
        description: "Our AI is re-extracting your documents and our team will review shortly.",
      });
      loadData();
      setNewUploadsCount(0);
    } catch (err: any) {
      toast({ title: "Resubmit failed", description: err.message, variant: "destructive" });
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !referral) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{error || "Referral not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Back to Referrals
        </Button>
      </div>
    );
  }

  const data = referral.extracted_data || {};
  const patient = data.patient || {};
  const clinical = data.clinical || {};
  const provider = data.provider || {};
  const insurance = data.insurance || {};
  const priorAuth = data.prior_auth || {};
  const patientFullName = patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—';
  const groupedDocs = groupDocuments(documents);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const addNote = async () => {
    if (!newNote.trim() || !id) return;
    setSendingNote(true);
    try {
      const result = await clinicApi.addReferralNote(id, newNote.trim());
      setNotes((prev) => [...prev, { id: result.id, author_type: 'clinic', author_name: 'You', content: newNote.trim(), created_at: new Date().toISOString(), ...result }]);
      setNewNote("");
      toast({ title: "Note added" });
      localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
      setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to add note", variant: "destructive" });
    } finally {
      setSendingNote(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Referrals
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{referral.patient_name || patientFullName}</h1>
            <StatusBadge status={referral.status} size="md" showIcon />
          </div>
          <p className="text-muted-foreground text-sm">
            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs mr-2">{referral.id.toUpperCase()}</span>
            {referral.drug || '—'} · Created {formatDateShort(referral.created_at)}
          </p>
        </div>
        {referral.status === "sent_to_pharmacy" && (
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download Final PDF
          </Button>
        )}
      </div>

      {/* Rejection banner */}
      {referral.status === "rejected" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-1">Referral Needs Attention</h3>
              <p className="text-sm text-foreground/80">
                {referral.rejection_reason || "This referral was rejected. Contact our team for details."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Go to the Documents tab to upload missing information, then resubmit.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approved/Sent success */}
      {(referral.status === "approved_to_send" || referral.status === "sent_to_pharmacy") && referral.pharmacy_name && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-foreground">
              {referral.status === "sent_to_pharmacy" ? "Referral Sent" : "Referral Approved & Sending"}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Pharmacy:</span>{" "}
              <span className="font-medium text-foreground">{referral.pharmacy_name}</span>
            </div>
            {referral.pharmacy_location && (
              <div>
                <span className="text-muted-foreground">Location:</span>{" "}
                <span className="font-medium text-foreground">{referral.pharmacy_location}</span>
              </div>
            )}
            {referral.pharmacy_contact && (
              <div>
                <span className="text-muted-foreground">Contact:</span>{" "}
                <span className="font-medium text-foreground">{referral.pharmacy_contact}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        onValueChange={(v) => {
          if (v === "notes" && id) {
            localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
          }
        }}
      >
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <InfoCard icon={User} title="Patient Information">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="First Name" value={patient.first_name || '—'} />
                  <Field label="Last Name" value={patient.last_name || '—'} />
                  <Field label="MI" value={patient.mi || '—'} />
                  <Field label="Date of Birth" value={patient.dob ? formatDateShort(patient.dob) : '—'} />
                  <Field label="Gender" value={patient.gender || '—'} />
                  <CopyableField label="Phone" value={patient.phone || '—'} icon={Phone} onCopy={() => copyToClipboard(patient.phone || '', 'Phone')} />
                  <CopyableField label="Email" value={patient.email || '—'} icon={Mail} onCopy={() => copyToClipboard(patient.email || '', 'Email')} />
                  <Field label="Address" value={patient.address || '—'} />
                  <Field label="City" value={patient.city || '—'} />
                  <Field label="State" value={patient.state || '—'} />
                  <Field label="Zip Code" value={patient.zip || '—'} />
                  <Field label="Height" value={patient.height || '—'} />
                  <Field label="Weight" value={patient.weight || '—'} />
                  <Field label="Allergies" value={patient.allergies || '—'} />
                  <Field label="Authorized Representative" value={patient.authorized_representative || '—'} />
                  <Field label="Representative Phone" value={patient.authorized_representative_phone || '—'} />
                </div>
              </InfoCard>

              <InfoCard icon={Pill} title="Clinical Information">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Diagnosis (ICD-10)" value={clinical.diagnosis_icd10 || '—'} />
                  <Field label="Drug Requested" value={clinical.drug_requested || '—'} />
                  <Field label="Therapy Type" value={clinical.therapy_type || '—'} />
                  <Field label="Date Therapy Initiated" value={clinical.date_therapy_initiated ? formatDateShort(clinical.date_therapy_initiated) : '—'} />
                  <Field label="Duration of Therapy" value={clinical.duration_of_therapy || '—'} />
                  <Field label="Dose/Strength" value={clinical.dosing || '—'} />
                  <Field label="Frequency" value={clinical.frequency || '—'} />
                  <Field label="Quantity" value={clinical.quantity || '—'} />
                  <Field label="Length of Therapy / #Refills" value={clinical.length_of_therapy || '—'} />
                  <Field label="Administration" value={clinical.administration || '—'} />
                  <Field label="Administration Location" value={clinical.administration_location || '—'} />
                  <Field label="Refill / Renewal" value={clinical.is_refill ? 'Yes' : 'No'} />
                </div>
              </InfoCard>

              <InfoCard icon={Stethoscope} title="Provider Information">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="First Name" value={provider.first_name || '—'} />
                  <Field label="Last Name" value={provider.last_name || '—'} />
                  <Field label="Specialty" value={provider.specialty || '—'} />
                  <Field label="NPI" value={provider.npi || '—'} />
                  <Field label="DEA Number" value={provider.dea_number || '—'} />
                  <Field label="Address" value={provider.address || '—'} />
                  <Field label="City" value={provider.city || '—'} />
                  <Field label="State" value={provider.state || '—'} />
                  <Field label="Zip Code" value={provider.zip || '—'} />
                  <Field label="Phone" value={provider.phone || '—'} />
                  <Field label="Fax" value={provider.fax || '—'} />
                  <Field label="Email" value={provider.email || '—'} />
                  <Field label="Office Contact Person" value={provider.office_contact || '—'} />
                  <Field label="Requestor" value={provider.requestor || '—'} />
                  <Field label="Signature Date" value={provider.signature_date ? formatDateShort(provider.signature_date) : '—'} />
                </div>
              </InfoCard>
            </div>

            <div className="space-y-4">
              {/* Status Card */}
              <div className="rounded-xl border border-border bg-card p-5 card-shadow">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Status</h3>
                <StatusBadge status={referral.status} size="lg" showIcon />
                <p className="text-sm text-muted-foreground mt-3">
                  {statusDescriptions[referral.status as ReferralStatus] || ''}
                </p>
                <div className="mt-4 space-y-2">
                  {(["uploaded", "processing", "approved_to_send"] as ReferralStatus[]).map((step) => {
                    const stepOrder = ["uploaded", "processing", "approved_to_send"];
                    const stepLabels: Record<string, string> = {
                      uploaded: "Received",
                      processing: "In Review",
                      approved_to_send: "Sent to Pharmacy",
                    };
                    const currentIdx = stepOrder.indexOf(referral.status);
                    const isRejected = referral.status === "rejected";
                    const isComplete = !isRejected && stepOrder.indexOf(step) <= currentIdx;
                    const isCurrent = !isRejected && step === referral.status;

                    return (
                      <div key={step} className="flex items-center gap-2">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", isComplete ? "bg-primary" : "bg-border")} />
                        <span className={cn("text-xs", isCurrent ? "font-medium text-foreground" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50")}>
                          {stepLabels[step] || step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insurance & PA Card */}
              <InfoCard icon={Shield} title="Insurance & PA">
                <div className="space-y-3">
                  {/* Bridge Program display */}
                  {referral.is_bridge_program ? (
                    <div className="flex items-center gap-2 rounded-md bg-purple-50 border border-purple-200 px-3 py-2">
                      <Shield className="h-4 w-4 text-purple-600 shrink-0" />
                      <span className="text-sm font-medium text-purple-700">Bridge Program</span>
                    </div>
                  ) : (
                    <>
                      {/* Expired Insurance Warning */}
                      {referral.insurance_expired && (
                        <ExpiredInsuranceBanner referralId={id!} onUpdated={loadData} />
                      )}
                      <Field label="Has Insurance" value={insurance.has_insurance_card ? 'Yes' : 'No'} />
                      {insurance.primary_insurance_name && <Field label="Primary Insurance" value={insurance.primary_insurance_name} />}
                      {insurance.primary_member_id && <Field label="Member ID" value={insurance.primary_member_id} />}
                      {insurance.secondary_insurance_name && <Field label="Secondary Insurance" value={insurance.secondary_insurance_name} />}
                      {insurance.notes && <Field label="Insurance Notes" value={insurance.notes} />}
                    </>
                  )}
                  <div className="border-t border-border pt-3" />
                  {referral.is_bridge_program ? (
                    <>
                      <Field label="PA Required" value="No" />
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">PA Status</p>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                          Bridge Program — PA not required
                        </span>
                      </div>
                    </>
                  ) : (
                  <>
                  <Field label="PA Required" value={referral.pa_required ? 'Yes' : 'No'} />
                  {referral.pa_required && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">PA Status</p>
                  {!referral.pa_status || referral.pa_status === null ? (
                          <>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground">Pending</span>
                            <p className="text-xs text-muted-foreground mt-1">PA required — DiRxtional team will handle this</p>
                          </>
                        ) : referral.pa_status === 'approved' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-approved-bg text-status-approved-fg">✓ Approved</span>
                        ) : referral.pa_status === 'denied' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">✗ Denied</span>
                        ) : referral.pa_status === 'processing' ? (
                          <>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600">PA In Progress</span>
                            <p className="text-xs text-muted-foreground mt-1">DiRxtional team is working on PA</p>
                          </>
                        ) : referral.pa_status === 'submitted' ? (
                          <>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning/10 text-warning">PA Submitted</span>
                            {referral.pa_submission_date && <p className="text-xs text-muted-foreground mt-1">Submitted on {formatDateShort(referral.pa_submission_date)}</p>}
                          </>
                        ) : referral.pa_status === 'pending' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">PA Pending</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground">{referral.pa_status}</span>
                        )}
                      </div>
                      {referral.pa_status === 'approved' && (
                        <>
                          {referral.pa_number && <Field label="PA Number" value={referral.pa_number} />}
                          {referral.pa_expiration_date && <Field label="PA Expires" value={formatDateShort(referral.pa_expiration_date)} />}
                        </>
                      )}
                      {referral.pa_status === 'denied' && referral.pa_denial_reason && (
                        <Field label="Denial Reason" value={referral.pa_denial_reason} />
                      )}
                      <Field label="PA Handled By" value={priorAuth.handled_by_us ? 'DiRxtional' : 'Clinic'} />
                    </>
                  )}
                  </>
                  )}
                </div>
              </InfoCard>
            </div>
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4 space-y-6">
          {DOC_CATEGORIES.map(cat => {
            const catDocs = groupedDocs[cat.key] || [];
            return (
              <div key={cat.key}>
                <h3 className="text-sm font-semibold text-foreground mb-3">{cat.label}</h3>
                {catDocs.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border p-6 text-center">
                    <FileText className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No {cat.label.toLowerCase()} uploaded</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {catDocs.map((doc: any) => {
                      const DocIcon = getDocIcon(doc.original_filename || doc.file_name || '');
                      return (
                        <div key={doc.id} className="rounded-lg border border-border bg-card p-4 card-shadow group hover:card-shadow-md transition-all duration-200">
                          <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <DocIcon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {doc.original_filename || doc.file_name || doc.name || 'Document'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateShort(doc.uploaded_at || doc.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Upload zones for rejected referrals */}
          {referral.status === "rejected" && (
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground">Upload Additional Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { type: "required", label: "Referral Form / Prescription" },
                  { type: "insurance", label: "Insurance Card" },
                  { type: "additional", label: "Chart Notes" },
                ].map(zone => (
                  <UploadZone
                    key={zone.type}
                    label={zone.label}
                    uploading={uploadingCategory === zone.type}
                    onUpload={(file) => handleUpload(file, zone.type)}
                  />
                ))}
              </div>
              <Button
                onClick={handleResubmit}
                disabled={resubmitting}
                className="mt-2"
              >
                {resubmitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Resubmit Referral
              </Button>
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            {history.filter(e => !HIDDEN_EVENTS.has(e.event_type)).length > 0 ? (
              <div className="space-y-0">
                {history
                  .filter((e: any) => !HIDDEN_EVENTS.has(e.event_type))
                  .map((event: any, i: number, arr: any[]) => {
                    const isLast = i === arr.length - 1;
                    const colorClass = EVENT_COLORS[event.event_type] || DEFAULT_EVENT_COLOR;
                    const EventIcon = getEventIcon(event.event_type);
                    let label = getEventLabel(event.event_type);
                    if (event.event_type === "document_uploaded" && event.metadata?.filename) {
                      label += `: ${event.metadata.filename}`;
                    }

                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0", colorClass)}>
                            <EventIcon className="h-4 w-4 text-white" />
                          </div>
                          {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                        </div>
                        <div className="pb-8">
                          <p className="text-sm font-medium text-foreground">{label}</p>
                          {event.event_type === "referral_rejected" && event.metadata?.reason && (
                            <p className="text-sm text-destructive/80 mt-0.5">{event.metadata.reason}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(event.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <StaticTimeline referral={referral} />
            )}
          </div>
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes" className="mt-4">
          <div className="flex flex-col gap-4">
            {notes.length > 0 && (
              <div className="space-y-3">
                {notes.map((note) => {
                  const isAdmin = note.author_type === 'admin';
                  const authorName = isAdmin
                    ? "DiRxtional Team"
                    : (referral.clinic_name || "Your Clinic");
                  return (
                    <div
                      key={note.id}
                      className={cn(
                        "rounded-lg border border-border/50 bg-card p-4 border-l-4",
                        isAdmin ? "border-l-purple-500" : "border-l-primary"
                      )}
                    >
                      <div className="flex items-baseline justify-between mb-2 gap-3">
                        <span className="font-semibold text-sm text-foreground">{authorName}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDateTime(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                    </div>
                  );
                })}
                <div ref={notesEndRef} />
              </div>
            )}

            <div className="rounded-xl border border-border bg-card p-4 card-shadow flex gap-3 items-end">
              <Textarea
                placeholder="Add a note about this referral..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="flex-1 min-h-[60px]"
              />
              <Button size="icon" onClick={addNote} disabled={!newNote.trim() || sendingNote}>
                {sendingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ---- Static fallback timeline (when history API returns empty) ---- */
function StaticTimeline({ referral }: { referral: any }) {
  const steps = [
    { status: "uploaded", label: "Referral Received", icon: Upload, color: "bg-status-uploaded-fg" },
    { status: "processing", label: "Under Review", icon: Loader2, color: "bg-status-processing-fg" },
    { status: "approved_to_send", label: "Approved", icon: CheckCircle, color: "bg-status-approved-fg" },
    { status: "sent_to_pharmacy", label: "Sent to Pharmacy", icon: Send, color: "bg-status-sent-fg" },
    { status: "rejected", label: "Rejected", icon: XCircle, color: "bg-status-rejected-fg" },
  ];

  const statusOrder = ["uploaded", "processing", "approved_to_send", "sent_to_pharmacy"];
  const currentIdx = statusOrder.indexOf(referral.status);
  const isRejected = referral.status === "rejected";

  const visibleSteps = isRejected
    ? [steps[0], steps[1], steps[4]]
    : steps.filter(s => s.status !== "rejected" && statusOrder.indexOf(s.status) <= currentIdx);

  return (
    <div className="space-y-0">
      {visibleSteps.map((step, i) => {
        const Icon = step.icon;
        const isLast = i === visibleSteps.length - 1;
        return (
          <div key={step.status} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn("h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0", step.color)}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border my-1" />}
            </div>
            <div className="pb-6">
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(referral.updated_at || referral.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- Upload Zone ---- */
function UploadZone({ label, uploading, onUpload }: { label: string; uploading: boolean; onUpload: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors",
        uploading && "opacity-50 pointer-events-none"
      )}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
      {uploading ? (
        <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-2 animate-spin" />
      ) : (
        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
      )}
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">Click to upload</p>
    </div>
  );
}

/* ---- Helper components ---- */
function ExpiredInsuranceBanner({ referralId, onUpdated }: { referralId: string; onUpdated: () => void }) {
  const [mode, setMode] = useState<null | "upload" | "manual">(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    primary_plan_name: "", primary_member_id: "", primary_group_number: "",
    primary_rxbin: "", primary_rxpcn: "", policyholder_name: "",
    secondary_plan_name: "", secondary_member_id: "",
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      await clinicApi.uploadDocument(referralId, file, "insurance");
      await clinicApi.finalizeReferral(referralId);
      toast({ title: "Insurance card uploaded", description: "Re-extracting data..." });
      onUpdated();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    try {
      await clinicApi.updateReferralInsurance(referralId, form);
      toast({ title: "Insurance updated" });
      onUpdated();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-orange-800">DiRxtional Team flagged this patient's insurance as expired.</p>
          <p className="text-xs text-orange-600 mt-0.5">Update the insurance below to continue.</p>
        </div>
      </div>
      {!mode && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1" />Upload New Insurance Card
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("manual")}>Enter Manually</Button>
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }} />
        </div>
      )}
      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading and re-extracting...
        </div>
      )}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Primary Plan Name</Label><Input className="h-8 text-sm mt-1" value={form.primary_plan_name} onChange={(e) => setForm(f => ({ ...f, primary_plan_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Primary Member ID</Label><Input className="h-8 text-sm mt-1" value={form.primary_member_id} onChange={(e) => setForm(f => ({ ...f, primary_member_id: e.target.value }))} /></div>
            <div><Label className="text-xs">Group Number</Label><Input className="h-8 text-sm mt-1" value={form.primary_group_number} onChange={(e) => setForm(f => ({ ...f, primary_group_number: e.target.value }))} /></div>
            <div><Label className="text-xs">RxBIN</Label><Input className="h-8 text-sm mt-1" value={form.primary_rxbin} onChange={(e) => setForm(f => ({ ...f, primary_rxbin: e.target.value }))} /></div>
            <div><Label className="text-xs">RxPCN</Label><Input className="h-8 text-sm mt-1" value={form.primary_rxpcn} onChange={(e) => setForm(f => ({ ...f, primary_rxpcn: e.target.value }))} /></div>
            <div><Label className="text-xs">Policyholder Name</Label><Input className="h-8 text-sm mt-1" value={form.policyholder_name} onChange={(e) => setForm(f => ({ ...f, policyholder_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Secondary Plan Name</Label><Input className="h-8 text-sm mt-1" value={form.secondary_plan_name} onChange={(e) => setForm(f => ({ ...f, secondary_plan_name: e.target.value }))} /></div>
            <div><Label className="text-xs">Secondary Member ID</Label><Input className="h-8 text-sm mt-1" value={form.secondary_member_id} onChange={(e) => setForm(f => ({ ...f, secondary_member_id: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleManualSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}Save Insurance
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 card-shadow">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      {badge ? (
        <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", badge)}>{value}</span>
      ) : (
        <p className="font-medium text-foreground text-sm">{value}</p>
      )}
    </div>
  );
}

function CopyableField({ label, value, icon: Icon, onCopy }: { label: string; value: string; icon: React.ElementType; onCopy: () => void }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <p className="font-medium text-foreground text-sm">{value}</p>
        <button onClick={onCopy} className="p-0.5 rounded hover:bg-secondary transition-colors" title={`Copy ${label}`}>
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
