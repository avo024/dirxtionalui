import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  ClipboardList,
  CheckCircle,
  Upload,
  FileText,
  Eye,
  Download,
  Trash2,
  Shield,
  XCircle,
  Loader2,
  Send,
  Pencil,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Native date inputs replaced the ChronoSelect popover — the year is typeable
// and every change commits instantly (the popover dropped year edits on close).
const toDateInputValue = (d?: Date) => {
  if (!d || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fromDateInputValue = (v: string): Date | undefined => {
  if (!v) return undefined;
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, m - 1, d); // local time — avoids the UTC off-by-one
};
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import { todayLocalISO } from "@/lib/dateUtils";
import { ChronoSelect } from "@/components/ui/chrono-select";
import type { Referral, ReferralPAInfo } from "@/data/mockData";

export type PADecisionStatus = "not_started" | "processing" | "approved" | "denied";

export interface PALetterInfo {
  has_letter: boolean;
  drug_requires_pa: boolean;
  is_fallback: boolean;
  letter: { id: string; filename: string; uploaded_at: string; from_referral_id: string } | null;
}

interface PAManagementCardProps {
  referral: Referral;
  paInfo: ReferralPAInfo;
  referralId: string;
  onPALetterChange?: (info: PALetterInfo) => void;
}

interface UploadedFile {
  name: string;
  uploadedAt: Date;
}

export function PAManagementCard({ referral, paInfo, referralId, onPALetterChange }: PAManagementCardProps) {
  const isNoPA = paInfo.status === "not_required";

  if (isNoPA) {
    return <PANotRequiredCard paInfo={paInfo} />;
  }

  return <PAWorkflowCard referral={referral} paInfo={paInfo} referralId={referralId} onPALetterChange={onPALetterChange} />;
}

function PANotRequiredCard({ paInfo }: { paInfo: ReferralPAInfo }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Prior Authorization</h3>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-success" />
        <span className="text-sm font-medium text-foreground">No PA Required</span>
      </div>
      <p className="text-xs text-muted-foreground pl-7">
        Reason: {paInfo.reason}
      </p>
    </div>
  );
}

// ── PA Letter Section ──
function PALetterSection({ referralId, onPALetterChange }: { referralId: string; onPALetterChange?: (info: PALetterInfo) => void }) {
  const [paLetterInfo, setPaLetterInfo] = useState<PALetterInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchLetterInfo = async () => {
    try {
      const info = await adminApi.getPALetterInfo(referralId);
      setPaLetterInfo(info);
      onPALetterChange?.(info);
    } catch {
      // Endpoint may not exist yet
      setPaLetterInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLetterInfo();
  }, [referralId]);

  const handleUpload = async (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF, JPG, PNG, or TIFF file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await adminApi.uploadPALetter(referralId, file);
      toast({ title: "PA letter uploaded", description: `${file.name} has been uploaded.` });
      await fetchLetterInfo();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Failed to upload PA letter", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  if (loading) return null;
  if (!paLetterInfo || !paLetterInfo.drug_requires_pa) return null; // Case D

  const { has_letter, is_fallback, letter } = paLetterInfo;

  // Case A: No letter, needs upload
  if (!has_letter) {
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="text-sm font-medium text-foreground">No PA letter on file</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Pharmacies require a PA approval letter before processing this referral. Upload one to enable delivery.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          Upload PA Letter
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  // Case C: Continuation/fallback
  if (is_fallback && letter) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-foreground">Using PA letter from previous approved referral (continuation)</span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">{letter.filename}</p>
            <p className="text-xs text-muted-foreground">
              From referral{" "}
              <a href={`/admin/referrals/${letter.from_referral_id}`} className="text-primary hover:underline inline-flex items-center gap-0.5">
                {letter.from_referral_id.slice(0, 8)}…
                <ExternalLink className="h-3 w-3" />
              </a>
              {" · "}No new upload needed.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          Upload New Letter
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  // Case B: Own letter
  if (letter) {
    const handleDelete = async () => {
      if (!window.confirm("Remove this PA letter from the referral? (Use this for wrong uploads — the referral can still send with a recorded PA number.)")) return;
      setUploading(true);
      try {
        await adminApi.deletePALetter(referralId);
        toast({ title: "PA letter removed" });
        await fetchLetterInfo();
      } catch (err: any) {
        toast({ title: "Couldn't remove letter", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    return (
      <div className="rounded-lg border border-success/40 bg-success/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-sm font-medium text-foreground">PA letter on file</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            {/* Long filenames wrap inside the box instead of overflowing */}
            <p className="text-sm font-medium text-foreground break-all">{letter.filename}</p>
            <p className="text-xs text-muted-foreground">
              Uploaded {format(new Date(letter.uploaded_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={uploading}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Remove
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return null;
}

function PAWorkflowCard({ referral, paInfo, referralId, onPALetterChange }: { referral: Referral; paInfo: ReferralPAInfo; referralId: string; onPALetterChange?: (info: PALetterInfo) => void }) {
  const { extracted_data: data } = referral;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paDecisionStatus, setPaDecisionStatus] = useState<PADecisionStatus>("processing");
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [paNumber, setPaNumber] = useState("");
  const [refNumber, setRefNumber] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [paNotes, setPaNotes] = useState("");
  const [denialReason, setDenialReason] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [sendingToClinic, setSendingToClinic] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (referral.pa_status === 'approved' || referral.pa_status === 'denied') {
      setPaDecisionStatus(referral.pa_status as PADecisionStatus);
      setIsEditMode(false);
    } else if (referral.pa_status === 'pending' || (referral.pa_status as string) === 'submitted') {
      setPaDecisionStatus('processing');
      setIsEditMode(true);
    } else if (!referral.pa_status || referral.pa_status === null) {
      setPaDecisionStatus('not_started');
      setIsEditMode(false);
    } else {
      setPaDecisionStatus('processing');
      setIsEditMode(!referral.pa_expiration_date);
    }
    const paData = (referral as any).pa_data || {};
    if (paData.pa_number) setPaNumber(paData.pa_number);
    if (paData.reference_number || paData.ref_number) setRefNumber(paData.reference_number || paData.ref_number);
    if (paData.denial_reason) setDenialReason(paData.denial_reason);
    if (paData.notes) setPaNotes(paData.notes);
    if (paData.submitted_date || paData.decision_date) {
      // Parse yyyy-mm-dd as LOCAL time — new Date("2030-08-30") is UTC and
      // renders a day early in US timezones.
      setStartDate(fromDateInputValue(String(paData.submitted_date || paData.decision_date).slice(0, 10)));
    }
    if (paData.expiration_date || referral.pa_expiration_date) {
      setExpirationDate(fromDateInputValue(String(paData.expiration_date || referral.pa_expiration_date).slice(0, 10)));
    }
    if (paData.file_name) {
      setUploadedFile({
        name: paData.file_name,
        uploadedAt: paData.uploaded_at ? new Date(paData.uploaded_at) : new Date(),
      });
    }
  }, [referral.id, referral.pa_status, referral.pa_expiration_date]);

  const canMarkComplete = paDecisionStatus === "approved" && paNumber.trim() !== "" && expirationDate !== undefined;

  const handleFileSelect = (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF, JPG, PNG, or TIFF file.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB", variant: "destructive" });
      return;
    }
    setUploadedFile({ name: file.name, uploadedAt: new Date() });
    toast({ title: "File Uploaded", description: `${file.name} has been uploaded.` });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSave = async () => {
    if (paDecisionStatus === "not_started") {
      toast({ title: "Select a PA Status", description: "Please select Processing, Approved, or Denied before saving.", variant: "destructive" });
      return;
    }
    try {
      if (paDecisionStatus === "approved") {
        if (!paNumber.trim() || !expirationDate) {
          toast({ title: "Missing Information", description: "PA number and expiration date are required.", variant: "destructive" });
          return;
        }
        await adminApi.recordPADecision(referral.id, {
          decision: 'approved',
          decision_date: todayLocalISO(),
          expiration_date: toDateInputValue(expirationDate),
          pa_number: paNumber,
          ref_number: refNumber,
          approval_duration: "",
        });
        toast({ title: "PA Approved", description: `PA for ${referral.patient_name} has been marked as approved.` });
        setIsEditMode(false);
        setTimeout(() => window.location.reload(), 1000);
      } else if (paDecisionStatus === "denied") {
        if (!denialReason.trim()) {
          toast({ title: "Reason Required", description: "Please provide a denial reason.", variant: "destructive" });
          return;
        }
        await adminApi.recordPADecision(referral.id, {
          decision: 'denied',
          decision_date: todayLocalISO(),
          denial_reason: denialReason,
        });
        toast({ title: "PA Denied", description: "PA denial has been recorded." });
        setIsEditMode(false);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        const submissionDate = startDate
          ? toDateInputValue(startDate)
          : todayLocalISO();
        await adminApi.submitPA(referral.id, submissionDate);
        if (!startDate) setStartDate(new Date());
        toast({ title: "PA Submitted", description: "Prior authorization submission date saved." });
        setIsEditMode(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save PA", variant: "destructive" });
    }
  };

  const handleMarkComplete = async () => {
    try {
      if (!paNumber.trim() || !expirationDate) {
        toast({ title: "Missing Information", description: "PA number and expiration date are required", variant: "destructive" });
        return;
      }
      await adminApi.recordPADecision(referral.id, {
        decision: 'approved',
        decision_date: todayLocalISO(),
        expiration_date: toDateInputValue(expirationDate),
        pa_number: paNumber,
        ref_number: refNumber,
        approval_duration: "",
      });
      toast({ title: "PA Approved", description: `PA for ${referral.patient_name} has been marked as approved.` });
      setIsEditMode(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record PA approval", variant: "destructive" });
    }
  };

  const handleDeleteFile = () => {
    setUploadedFile(null);
    toast({ title: "File Removed", description: "PA approval letter has been removed." });
  };

  const handleStatusChange = (value: PADecisionStatus) => {
    setPaDecisionStatus(value);
    // Smart defaults — PAs almost always run a year from the decision, so
    // picking "approved" pre-fills Start = today, Expiration = +1 year
    // (both editable; never overwrites values already entered).
    if (value === "approved") {
      const start = startDate ?? new Date();
      if (!startDate) setStartDate(start);
      if (!expirationDate) {
        const exp = new Date(start);
        exp.setFullYear(exp.getFullYear() + 1);
        setExpirationDate(exp);
      }
    }
    toast({ title: "PA Status Updated", description: `PA status set to ${value}.` });
  };


  const handleSendDenialToClinic = async () => {
    if (!denialReason.trim()) {
      toast({ title: "Reason Required", description: "Please provide a denial reason before recording.", variant: "destructive" });
      return;
    }
    setSendingToClinic(true);
    try {
      await adminApi.recordPADecision(referral.id, {
        decision: 'denied',
        decision_date: todayLocalISO(),
        denial_reason: denialReason,
      });
      toast({ title: "PA Denied", description: `PA denial has been recorded with reason: ${denialReason}` });
      setIsEditMode(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to record PA denial", variant: "destructive" });
    } finally {
      setSendingToClinic(false);
    }
  };

  const paStatusBadge = () => {
    switch (paDecisionStatus) {
      case "not_started":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
            <Shield className="h-3 w-3" />
            Not Started
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning/10 text-warning">
            <Shield className="h-3 w-3" />
            Processing
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case "denied":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
            <XCircle className="h-3 w-3" />
            Denied
          </span>
        );
      default:
        return null;
    }
  };

  const ViewModeDisplay = () => (
    <div className="space-y-4">
      {paDecisionStatus === "not_started" && (
        <div className="flex items-center gap-2 py-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">PA not yet started. Click Edit PA Details to begin.</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">PA Status:</span>
        {paStatusBadge()}
        <span className="text-xs text-muted-foreground">— {paInfo.reason}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2">
        <div>
          <Label className="text-xs text-muted-foreground">PA Number</Label>
          <p className="text-sm font-medium mt-1">{paNumber || "—"}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">CMM Access Key / Ref #</Label>
          <p className="text-sm font-medium mt-1">{refNumber || "—"}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Start Date</Label>
          <p className="text-sm font-medium mt-1">
            {startDate ? format(startDate, "MMM d, yyyy") : "—"}
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Expiration Date</Label>
          <p className="text-sm font-medium mt-1">
            {expirationDate ? format(expirationDate, "MMM d, yyyy") : "—"}
          </p>
        </div>
      </div>

      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
          <FileText className="h-4 w-4 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              Uploaded on {format(uploadedFile.uploadedAt, "MMM d, yyyy")}
            </p>
          </div>
        </div>
      )}

      {paNotes && (
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <p className="text-sm mt-1 text-foreground">{paNotes}</p>
        </div>
      )}

      {paDecisionStatus === "denied" && denialReason && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-medium text-destructive">Denial Reason</p>
          </div>
          <p className="text-sm text-foreground">{denialReason}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Button
          onClick={() => setIsEditMode(true)}
          variant="outline"
          size="sm"
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Edit PA Details
        </Button>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4 mt-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Prior Authorization Management</h3>
      </div>

      {/* PA Letter Section — rendered first */}
      <PALetterSection referralId={referralId} onPALetterChange={onPALetterChange} />

      {/* Insurance info for PA */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Insurance Information for PA Submission</p>
        <p className="text-sm text-foreground">
          Provider: {data.insurance.primary_insurance_name || data.insurance.notes || "Not available"}
        </p>
        {data.insurance.primary_member_id && (
          <p className="text-sm text-foreground">
            Member ID: {data.insurance.primary_member_id}
          </p>
        )}
        {data.insurance.has_insurance_card && (
          <p className="text-xs text-muted-foreground">Insurance card on file</p>
        )}
      </div>

      <Separator />

      {!isEditMode ? (
        <ViewModeDisplay />
      ) : (
        /* ───── EDIT MODE ───── */
        <div className="space-y-4">
          {/* Status selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">PA Status:</span>
            <Select value={paDecisionStatus} onValueChange={(v) => handleStatusChange(v as PADecisionStatus)}>
              <SelectTrigger className="w-[180px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
            {paStatusBadge()}
            <span className="text-xs text-muted-foreground">— {paInfo.reason}</span>
          </div>

          {/* APPROVED state */}
          {paDecisionStatus === "approved" && (
            <>
              {/* PA Approval Details */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">PA Approval Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PA Number</Label>
                    <Input value={paNumber} onChange={(e) => setPaNumber(e.target.value)} placeholder="Enter PA number" maxLength={50} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CMM Access Key / Ref #</Label>
                    <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="CoverMyMeds key (clinic can look the PA up with it)" maxLength={50} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PA Start Date</Label>
                    <ChronoSelect
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select date"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PA Expiration Date</Label>
                    <ChronoSelect
                      value={expirationDate}
                      onChange={setExpirationDate}
                      placeholder="Select date"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* PA Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PA Notes</Label>
                <Textarea value={paNotes} onChange={(e) => setPaNotes(e.target.value)} placeholder="Notes about PA process, insurance contact, etc..." rows={4} className="text-sm" />
              </div>
            </>
          )}

          {/* DENIED state */}
          {paDecisionStatus === "denied" && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Denial Information</p>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">PA Denied by Insurance</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Denial Reason <span className="text-destructive">*</span></Label>
                    <Textarea value={denialReason} onChange={(e) => setDenialReason(e.target.value)} placeholder="Enter the reason for denial from the insurance company..." rows={4} className="text-sm" />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                <Textarea value={paNotes} onChange={(e) => setPaNotes(e.target.value)} placeholder="Any additional context or next steps..." rows={3} className="text-sm" />
              </div>
            </>
          )}

          {/* PROCESSING state */}
          {paDecisionStatus === "processing" && (
            <>
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-4 text-center space-y-2">
                <Shield className="h-6 w-6 text-warning mx-auto" />
                <p className="text-sm font-medium text-foreground">PA is being processed</p>
                <p className="text-xs text-muted-foreground">
                  Update the status above once the insurance company responds with an approval or denial.
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">PA Notes</Label>
                <Textarea value={paNotes} onChange={(e) => setPaNotes(e.target.value)} placeholder="Notes about PA process, insurance contact, etc..." rows={3} className="text-sm" />
              </div>
            </>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <Button variant="secondary" size="sm" onClick={handleSave}>
              Save PA Details
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditMode(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
