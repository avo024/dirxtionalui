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
  CalendarIcon,
  Shield,
  XCircle,
  Loader2,
  Send,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { adminApi } from "@/lib/api";
import type { Referral, ReferralPAInfo } from "@/data/mockData";

export type PADecisionStatus = "processing" | "approved" | "denied";

interface PAManagementCardProps {
  referral: Referral;
  paInfo: ReferralPAInfo;
}

interface UploadedFile {
  name: string;
  uploadedAt: Date;
}

export function PAManagementCard({ referral, paInfo }: PAManagementCardProps) {
  const isNoPA = paInfo.status === "no_pa";

  if (isNoPA) {
    return <PANotRequiredCard paInfo={paInfo} />;
  }

  return <PAWorkflowCard referral={referral} paInfo={paInfo} />;
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

function PAWorkflowCard({ referral, paInfo }: { referral: Referral; paInfo: ReferralPAInfo }) {
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

  // Determine default mode based on existing PA data
  useEffect(() => {
    const hasExistingPA = referral.pa_status === "approved" || referral.pa_status === "denied" || referral.pa_expiration_date;
    setIsEditMode(!hasExistingPA);
  }, [paInfo]);

  const canMarkComplete = paDecisionStatus === "approved" && paNumber.trim() !== "" && expirationDate !== undefined && uploadedFile !== null;

  const handleFileSelect = (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF, JPG, or PNG file.", variant: "destructive" });
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
    try {
      if (startDate) {
        await adminApi.submitPA(
          referral.id,
          startDate.toISOString().split('T')[0]
        );
        toast({ title: "PA Submitted", description: "Prior authorization has been submitted to insurance." });
        setIsEditMode(false);
      } else {
        toast({ title: "Date Required", description: "Please select a submission date before saving.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit PA", variant: "destructive" });
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
        decision_date: new Date().toISOString().split('T')[0],
        expiration_date: expirationDate.toISOString().split('T')[0],
        approval_duration: paNumber,
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
        decision_date: new Date().toISOString().split('T')[0],
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
      {/* Status display */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">PA Status:</span>
        {paStatusBadge()}
        <span className="text-xs text-muted-foreground">— {paInfo.reason}</span>
      </div>

      {/* Read-only fields */}
      <div className="grid grid-cols-2 gap-3 pb-2">
        <div>
          <Label className="text-xs text-muted-foreground">PA Number</Label>
          <p className="text-sm font-medium mt-1">{paNumber || "—"}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Reference Number</Label>
          <p className="text-sm font-medium mt-1">{refNumber || "—"}</p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Submission Date</Label>
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

      {/* Uploaded file display */}
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

      {/* PA Notes display */}
      {paNotes && (
        <div>
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <p className="text-sm mt-1 text-foreground">{paNotes}</p>
        </div>
      )}

      {/* Denial reason display */}
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
              {/* File upload */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">PA Approval Documentation</p>
                {!uploadedFile ? (
                  <>
                    <p className="text-xs text-muted-foreground">Upload PA Approval Letter:</p>
                    <div
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                        isDragging
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleDrop}
                    >
                      <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-foreground font-medium">Choose File or Drag & Drop</p>
                      <p className="text-xs text-muted-foreground mt-1">Accepted: PDF, JPG, PNG</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded on {format(uploadedFile.uploadedAt, "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Download className="h-3 w-3 mr-1" /> Download
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={handleDeleteFile}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* PA Approval Details */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">PA Approval Details</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PA Number</Label>
                    <Input value={paNumber} onChange={(e) => setPaNumber(e.target.value)} placeholder="Enter PA number" maxLength={50} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Reference Number</Label>
                    <Input value={refNumber} onChange={(e) => setRefNumber(e.target.value)} placeholder="Enter ref number" maxLength={50} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PA Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-8 justify-start text-left text-sm font-normal", !startDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {startDate ? format(startDate, "MMM d, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">PA Expiration Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full h-8 justify-start text-left text-sm font-normal", !expirationDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                          {expirationDate ? format(expirationDate, "MMM d, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={expirationDate} onSelect={setExpirationDate} initialFocus className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
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
            {paDecisionStatus === "denied" && (
              <Button variant="destructive" size="sm" disabled={!denialReason.trim() || sendingToClinic} onClick={handleSendDenialToClinic}>
                {sendingToClinic ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                Record PA as Denied
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
