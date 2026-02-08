import { useState } from "react";
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
import { mockReferrals, type ReferralStatus } from "@/data/mockData";
import { formatDateTime, formatDateShort } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const statusDescriptions: Record<ReferralStatus, string> = {
  uploaded: "Your referral has been submitted and is awaiting processing.",
  processing: "Your referral is being processed by our team.",
  approved: "Your referral has been approved and is ready to send to pharmacy.",
  sent_to_pharmacy: "Your referral has been sent to the assigned pharmacy.",
  rejected: "This referral was rejected. Please see the reason below.",
};

const statusTimelineIcons: Record<ReferralStatus, React.ElementType> = {
  uploaded: Upload,
  processing: Loader2,
  approved: CheckCircle,
  sent_to_pharmacy: Send,
  rejected: XCircle,
};

const statusTimelineColors: Record<ReferralStatus, string> = {
  uploaded: "bg-status-uploaded-fg",
  processing: "bg-status-processing-fg",
  approved: "bg-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-fg",
  rejected: "bg-status-rejected-fg",
};

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const referral = mockReferrals.find((r) => r.id === id);
  const [notes, setNotes] = useState<{ text: string; date: string; author: string }[]>([
    { text: "Patient called to check on referral status.", date: "2026-02-06T14:30:00Z", author: "Sarah Johnson" },
  ]);
  const [newNote, setNewNote] = useState("");

  if (!referral) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Referral not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/clinic/referrals")}>
          Back to Referrals
        </Button>
      </div>
    );
  }

  const { extracted_data: data } = referral;

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
        <Button variant="ghost" size="sm" onClick={() => navigate("/clinic/referrals")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Referrals
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{referral.patient_name}</h1>
            <StatusBadge status={referral.status} size="md" showIcon />
          </div>
          <p className="text-muted-foreground text-sm">
            <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-xs mr-2">{referral.id.toUpperCase()}</span>
            {referral.drug} · Created {formatDateShort(referral.created_at)}
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
      {(referral.status === "approved" || referral.status === "sent_to_pharmacy") && referral.pharmacy_name && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-success" />
            <h3 className="font-semibold text-foreground">
              {referral.status === "sent_to_pharmacy" ? "Referral Sent" : "Referral Approved"}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Pharmacy:</span>{" "}
              <span className="font-medium text-foreground">{referral.pharmacy_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>{" "}
              <span className="font-medium text-foreground">{referral.pharmacy_location}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contact:</span>{" "}
              <span className="font-medium text-foreground">{referral.pharmacy_contact}</span>
            </div>
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
                  <Field label="Name" value={`${data.patient.first_name} ${data.patient.last_name}`} />
                  <Field label="Date of Birth" value={formatDateShort(data.patient.dob)} />
                  <Field label="Gender" value={data.patient.gender} />
                  <CopyableField
                    label="Phone"
                    value={data.patient.phone}
                    icon={Phone}
                    onCopy={() => copyToClipboard(data.patient.phone, "Phone")}
                  />
                  <CopyableField
                    label="Email"
                    value={data.patient.email}
                    icon={Mail}
                    onCopy={() => copyToClipboard(data.patient.email, "Email")}
                  />
                </div>
              </InfoCard>

              {/* Clinical Info */}
              <InfoCard icon={Pill} title="Clinical Information">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Diagnosis (ICD-10)" value={data.clinical.diagnosis_icd10} />
                  <Field label="Drug Requested" value={data.clinical.drug_requested} />
                  <Field label="Dosing" value={data.clinical.dosing} />
                  <Field label="Quantity" value={data.clinical.quantity} />
                  <Field label="Refill" value={data.clinical.is_refill ? "Yes" : "No"} />
                </div>
              </InfoCard>

              {/* Provider Info */}
              <InfoCard icon={Stethoscope} title="Provider Information">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Name" value={data.provider.name} />
                  <Field label="NPI" value={data.provider.npi} />
                  <Field label="Address" value={data.provider.address} />
                  <Field label="Phone" value={data.provider.phone} />
                  <Field label="Signature Date" value={formatDateShort(data.provider.signature_date)} />
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
                  {statusDescriptions[referral.status]}
                </p>
                {/* Mini progress - 3 steps: Uploaded, Processing, Sent to Pharmacy */}
                <div className="mt-4 space-y-2">
                  {(["uploaded", "processing", "sent_to_pharmacy"] as ReferralStatus[]).map((step, i) => {
                    const stepOrder = ["uploaded", "processing", "sent_to_pharmacy"];
                    const currentIdx = stepOrder.indexOf(referral.status);
                    const isRejected = referral.status === "rejected";
                    // For "approved" status, treat it as between processing and sent_to_pharmacy
                    const effectiveIdx = referral.status === "approved" ? 1.5 : currentIdx;
                    const isComplete = !isRejected && i <= effectiveIdx;
                    const isCurrent = !isRejected && (
                      (referral.status === "approved" && step === "processing") ||
                      (step === referral.status)
                    );

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
                          {step.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Insurance & PA Card */}
              <InfoCard icon={Shield} title="Insurance & PA">
                <div className="space-y-3">
                  <Field label="Has Insurance" value={data.insurance.has_insurance_card ? "Yes" : "No"} />
                  {data.insurance.notes && <Field label="Insurance Notes" value={data.insurance.notes} />}
                  <Field label="PA Required" value={data.prior_auth.required ? "Yes" : "No"} />
                  <Field label="PA Handled By" value={data.prior_auth.handled_by_us ? "Pharmacy/Admin" : "Clinic"} />
                </div>
              </InfoCard>
            </div>
          </div>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {referral.documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-border bg-card p-5 card-shadow group hover:card-shadow-md transition-all duration-200"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-0.5">{doc.name}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Uploaded {formatDateShort(doc.uploaded_at)}
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
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="space-y-0">
              {[...referral.history].reverse().map((entry, i) => {
                const Icon = statusTimelineIcons[entry.status];
                const colorClass = statusTimelineColors[entry.status];

                return (
                  <div key={entry.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center mt-0.5 shrink-0",
                          colorClass
                        )}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      {i < referral.history.length - 1 && (
                        <div className="w-px flex-1 bg-border my-1" />
                      )}
                    </div>
                    <div className="pb-6">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={entry.status} size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-1">{entry.note}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">By: {entry.user}</p>
                    </div>
                  </div>
                );
              })}
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
