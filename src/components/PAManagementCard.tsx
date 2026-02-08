import { useState, useRef } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { Referral, ReferralPAInfo } from "@/data/mockData";

interface PAManagementCardProps {
  referral: Referral;
  paInfo: ReferralPAInfo;
}

interface UploadedFile {
  name: string;
  uploadedAt: Date;
}

export function PAManagementCard({ referral, paInfo }: PAManagementCardProps) {
  const { extracted_data: data } = referral;
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

  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [paNumber, setPaNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | undefined>();
  const [paNotes, setPaNotes] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const canMarkComplete = paNumber.trim() !== "" && expirationDate !== undefined && uploadedFile !== null;

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

  const handleSave = () => {
    toast({ title: "PA Details Saved", description: "Prior authorization details have been saved." });
  };

  const handleMarkComplete = () => {
    toast({ title: "PA Marked as Complete", description: `PA for ${referral.patient_name} has been marked as complete.` });
  };

  const handleDeleteFile = () => {
    setUploadedFile(null);
    toast({ title: "File Removed", description: "PA approval letter has been removed." });
  };

  const paStatusBadge = () => {
    switch (paInfo.status) {
      case "pa_required":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-warning/10 text-warning">
            <Shield className="h-3 w-3" />
            PA Required
          </span>
        );
      case "pa_approved":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/10 text-success">
            <CheckCircle className="h-3 w-3" />
            PA Approved
          </span>
        );
      case "pa_expired":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
            <Shield className="h-3 w-3" />
            PA Expired
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Prior Authorization Management</h3>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Status:</span>
        {paStatusBadge()}
        <span className="text-xs text-muted-foreground">— {paInfo.reason}</span>
      </div>

      {/* Insurance info for PA */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Insurance Information for PA Submission</p>
        <p className="text-sm text-foreground">
          Provider: {data.insurance.notes || "Not available"}
        </p>
        {data.insurance.has_insurance_card && (
          <p className="text-xs text-muted-foreground">Insurance card on file</p>
        )}
      </div>

      <Separator />

      {/* PA Approval Documentation */}
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
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={handleDeleteFile}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <Separator />

      {/* PA Details */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">PA Details</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">PA Number</Label>
            <Input
              value={paNumber}
              onChange={(e) => setPaNumber(e.target.value)}
              placeholder="Enter PA number"
              maxLength={50}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">PA Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-8 justify-start text-left text-sm font-normal",
                    !expirationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {expirationDate ? format(expirationDate, "MMM d, yyyy") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expirationDate}
                  onSelect={setExpirationDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* PA Notes */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">PA Notes</Label>
        <Textarea
          value={paNotes}
          onChange={(e) => setPaNotes(e.target.value)}
          placeholder="Notes about PA process, insurance contact, etc..."
          rows={4}
          className="text-sm"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <Button variant="secondary" size="sm" onClick={handleSave}>
          Save PA Details
        </Button>
        <Button
          variant="success"
          size="sm"
          disabled={!canMarkComplete}
          onClick={handleMarkComplete}
        >
          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
          Mark PA as Complete
        </Button>
      </div>
    </div>
  );
}
