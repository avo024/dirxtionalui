import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Download, FileText, Clock, AlertCircle, User,
  Pill, Stethoscope, Shield, Copy, Phone, Mail, CheckCircle,
  Send, Upload, Loader2, XCircle, MessageSquare, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
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

const statusTimelineIcons: Record<ReferralStatus, React.ElementType> = {
  uploaded: Upload,
  processing: Loader2,
  approved_to_send: CheckCircle,
  sent_to_pharmacy: Send,
  rejected: XCircle,
};

const statusTimelineColors: Record<ReferralStatus, string> = {
  uploaded: "bg-status-uploaded-fg",
  processing: "bg-status-processing-fg",
  approved_to_send: "bg-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-fg",
  rejected: "bg-status-rejected-fg",
};

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ text: string; date: string; author: string }[]>([]);
  const [newNote, setNewNote] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      clinicApi.getReferral(id),
      clinicApi.getReferralDocuments(id).catch(() => ({ items: [] })),
    ])
      .then(([referralData, docsData]) => {
        setReferral(mapReferralFromBackend(referralData));
        setDocuments(docsData.items || []);
      })
      .catch((err) => {
        console.error("Failed to load referral:", err);
        setError("Failed to load referral details.");
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      { text: newNote.trim(), date: new Date().toISOString(), author: "Sarah Johnson" },
      ...prev,
    ]);
    setNewNote("");
    toast({ title: "Note added" });
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

      {/* Rejection alert */}
      {referral.status === "rejected" && referral.rejection_reason && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-semibold">Referral Rejected</AlertTitle>
          <AlertDescription className="mt-1">{referral.rejection_reason}</AlertDescription>
        </Alert>
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
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - 2/3 width */}
            <div className="lg:col-span-2 space-y-4">
              {/* Patient Info */}
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

              {/* Clinical Info */}
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

              {/* Provider Info */}
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

            {/* Right Column - 1/3 width */}
            <div className="space-y-4">
              {/* Status Card */}
              <div className="rounded-xl border border-border bg-card p-5 card-shadow">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Status
                </h3>
                <StatusBadge status={referral.status} size="lg" showIcon />
                <p className="text-sm text-muted-foreground mt-3">
                  {statusDescriptions[referral.status as ReferralStatus] || ''}
                </p>
                {/* Mini progress - 4 steps */}
                <div className="mt-4 space-y-2">
                   {(["uploaded", "processing", "approved_to_send"] as ReferralStatus[]).map((step, i) => {
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
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            isComplete ? "bg-primary" : "bg-border"
                          )}
                        />
                        <span
                          className={cn(
                            "text-xs",
                            isCurrent ? "font-medium text-foreground" : isComplete ? "text-muted-foreground" : "text-muted-foreground/50"
                          )}
                        >
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
                  <Field label="Has Insurance" value={insurance.has_insurance_card ? 'Yes' : 'No'} />
                  {insurance.primary_insurance_name && (
                    <Field label="Primary Insurance" value={insurance.primary_insurance_name} />
                  )}
                  {insurance.primary_member_id && (
                    <Field label="Member ID" value={insurance.primary_member_id} />
                  )}
                  {insurance.secondary_insurance_name && (
                    <Field label="Secondary Insurance" value={insurance.secondary_insurance_name} />
                  )}
                  {insurance.notes && (
                    <Field label="Insurance Notes" value={insurance.notes} />
                  )}
                  <div className="border-t border-border pt-3" />
                  <Field label="PA Required" value={referral.pa_required ? 'Yes' : 'No'} />
                  {referral.pa_required && (
                    <>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">PA Status</p>
                        {!referral.pa_status || referral.pa_status === null ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground">
                            Pending Submission
                          </span>
                        ) : referral.pa_status === 'approved' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-approved-bg text-status-approved-fg">
                            ✓ Approved
                          </span>
                        ) : referral.pa_status === 'denied' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                            ✗ Denied
                          </span>
                        ) : referral.pa_status === 'pending' ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-status-processing-bg text-status-processing-fg">
                            In Progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground">
                            {referral.pa_status}
                          </span>
                        )}
                      </div>
                      {referral.pa_status === 'approved' && (
                        <>
                          {referral.pa_number && <Field label="PA Number" value={referral.pa_number} />}
                          {referral.pa_expiration_date && (
                            <Field label="PA Expires" value={formatDateShort(referral.pa_expiration_date)} />
                          )}
                        </>
                      )}
                      {referral.pa_status === 'denied' && referral.pa_denial_reason && (
                        <Field label="Denial Reason" value={referral.pa_denial_reason} />
                      )}
                      <Field
                        label="PA Handled By"
                        value={priorAuth.handled_by_us ? 'DiRxtional' : 'Clinic'}
                      />
                    </>
                  )}
                </div>
              </InfoCard>
            </div>
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4">
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="rounded-xl border border-border bg-card p-5 card-shadow group hover:card-shadow-md transition-all duration-200"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-0.5">{doc.file_name || doc.name || 'Document'}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Uploaded {formatDateShort(doc.uploaded_at || doc.created_at)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="space-y-0">
              {/* Received */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 bg-status-uploaded-fg">
                    <Upload className="h-4 w-4 text-white" />
                  </div>
                  {referral.status !== "uploaded" && <div className="w-px flex-1 bg-border my-1" />}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-medium text-foreground">Referral Received</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(referral.created_at)}</p>
                </div>
              </div>

              {/* In Review */}
              {referral.status !== "uploaded" && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 bg-status-processing-fg">
                      <Loader2 className="h-4 w-4 text-white" />
                    </div>
                    {(referral.status === "approved_to_send" || referral.status === "sent_to_pharmacy") && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-foreground">Under Review</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(referral.updated_at)}</p>
                  </div>
                </div>
              )}

              {/* Approved */}
              {(referral.status === "approved_to_send" || referral.status === "sent_to_pharmacy") && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 bg-status-approved-fg">
                      <CheckCircle className="h-4 w-4 text-white" />
                    </div>
                    {referral.status === "sent_to_pharmacy" && (
                      <div className="w-px flex-1 bg-border my-1" />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-foreground">Approved</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(referral.updated_at)}</p>
                  </div>
                </div>
              )}

              {/* Sent to Pharmacy */}
              {referral.status === "sent_to_pharmacy" && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 bg-status-sent-fg">
                      <Send className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-foreground">Sent to Pharmacy</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(referral.updated_at)}</p>
                  </div>
                </div>
              )}

              {/* Rejected */}
              {referral.status === "rejected" && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0 bg-status-rejected-fg">
                      <XCircle className="h-4 w-4 text-white" />
                    </div>
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-foreground">Rejected</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(referral.updated_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* NOTES TAB */}
        <TabsContent value="notes" className="mt-4">
          <div className="space-y-4">
            {/* Add note */}
            <div className="rounded-xl border border-border bg-card p-5 card-shadow">
              <h3 className="text-sm font-semibold text-foreground mb-3">Add a Note</h3>
              <Textarea
                placeholder="Add a note about this referral..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                className="mb-3"
              />
              <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>

            {/* Notes list */}
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note, i) => (
                  <div key={i} className="rounded-xl border border-border bg-card p-4 card-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{note.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(note.date)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground pl-8">{note.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* Helper components */

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
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

function Field({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      {badge ? (
        <span className={cn("inline-flex text-xs font-medium px-2 py-0.5 rounded-full", badge)}>
          {value}
        </span>
      ) : (
        <p className="font-medium text-foreground text-sm">{value}</p>
      )}
    </div>
  );
}

function CopyableField({
  label,
  value,
  icon: Icon,
  onCopy,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  onCopy: () => void;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <div className="flex items-center gap-1">
        <p className="font-medium text-foreground text-sm">{value}</p>
        <button
          onClick={onCopy}
          className="p-0.5 rounded hover:bg-secondary transition-colors"
          title={`Copy ${label}`}
        >
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
