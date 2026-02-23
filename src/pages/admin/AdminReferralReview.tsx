import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PAManagementCard } from "@/components/PAManagementCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { getReferralPAInfo } from "@/data/mockData";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminReferralReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editedData, setEditedData] = useState<any>(null);
  const [changedSections, setChangedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchReferral = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await adminApi.getReferral(id);

        const mapped = {
          ...data,
          drug: data.drug_requested,
          blocked: data.preferred_pharmacy_blocked,
        };

        setReferral(mapped);
        setEditedData(mapped.extracted_data || {});
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load referral",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReferral();
  }, [id]);

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
  const conf = data?.confidence || {};
  const paInfo = getReferralPAInfo(referral);

  const updateField = (section: string, field: string, value: string) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: value,
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
      navigate("/admin/referrals");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to approve referral",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    try {
      await adminApi.makeDecision(id!, 'reject', rejectReason);
      toast({
        title: "Referral Rejected",
        description: `${referral.patient_name}'s referral has been rejected.`,
      });
      setRejectOpen(false);
      navigate("/admin/referrals");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reject referral",
        variant: "destructive",
      });
    }
  };

  const handleProcessWithAI = async () => {
    try {
      await adminApi.processReferral(id!);
      toast({
        title: "Processing Started",
        description: "AI extraction in progress...",
      });
      setTimeout(() => window.location.reload(), 30000);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to process referral",
        variant: "destructive",
      });
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

  return (
    <div className="space-y-0 -mx-6 -my-8 lg:-mx-8">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/referrals")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">{referral.patient_name}</h1>
              <StatusBadge status={referral.status} />
            </div>
            <p className="text-sm text-muted-foreground">{referral.drug} · {referral.clinic_name} · {referral.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {referral.status === 'uploaded' && (
            <Button onClick={handleProcessWithAI} variant="outline" size="sm">
              Extract with AI
            </Button>
          )}
          <p className="text-xs text-muted-foreground font-medium px-2 py-1 bg-accent/10 rounded-md">
            AI Extracted Data
          </p>
        </div>
      </div>

      {/* Split screen */}
      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 140px)" }}>
        {/* Left: Document viewer */}
        <div className="lg:w-1/2 border-r border-border flex flex-col min-h-[400px]">
          <DocumentViewer documents={referral.documents || []} className="flex-1" />
        </div>

        {/* Right: Extracted data */}
        <div className="lg:w-1/2 overflow-y-auto p-6">
          {data ? (
            <Accordion type="multiple" defaultValue={["patient", "provider", "clinical", "insurance", "prior_auth"]} className="space-y-3">
              <AccordionItem value="patient" className="rounded-xl border border-border bg-card card-shadow px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Patient Information</span>
                    {changedSections.has('patient') && (
                      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges('patient'); }} variant="outline" size="sm" className="ml-auto">Save</Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <FieldEdit label="First Name" value={editedData?.patient?.first_name || ""} confidence={conf.first_name} onChange={(v) => updateField("patient", "first_name", v)} />
                    <FieldEdit label="Last Name" value={editedData?.patient?.last_name || ""} confidence={conf.last_name} onChange={(v) => updateField("patient", "last_name", v)} />
                    <FieldEdit label="MI" value={editedData?.patient?.mi || ""} onChange={(v) => updateField("patient", "mi", v)} />
                    <FieldEdit label="Date of Birth" value={editedData?.patient?.dob || ""} confidence={conf.dob} onChange={(v) => updateField("patient", "dob", v)} />
                    <FieldEdit label="Gender" value={editedData?.patient?.gender || ""} onChange={(v) => updateField("patient", "gender", v)} />
                    <FieldEdit label="Phone" value={editedData?.patient?.phone || ""} confidence={conf.phone} onChange={(v) => updateField("patient", "phone", v)} />
                    <FieldEdit label="Email" value={editedData?.patient?.email || ""} onChange={(v) => updateField("patient", "email", v)} />
                    <FieldEdit label="Address" value={editedData?.patient?.address || ""} className="col-span-2" onChange={(v) => updateField("patient", "address", v)} />
                    <FieldEdit label="City" value={editedData?.patient?.city || ""} onChange={(v) => updateField("patient", "city", v)} />
                    <FieldEdit label="State" value={editedData?.patient?.state || ""} onChange={(v) => updateField("patient", "state", v)} />
                    <FieldEdit label="Zip Code" value={editedData?.patient?.zip || ""} onChange={(v) => updateField("patient", "zip", v)} />
                    <FieldEdit label="Height" value={editedData?.patient?.height || ""} onChange={(v) => updateField("patient", "height", v)} />
                    <FieldEdit label="Weight" value={editedData?.patient?.weight || ""} onChange={(v) => updateField("patient", "weight", v)} />
                    <FieldEdit label="Allergies" value={editedData?.patient?.allergies || ""} className="col-span-2" onChange={(v) => updateField("patient", "allergies", v)} />
                    <FieldEdit label="Authorized Representative" value={editedData?.patient?.authorized_representative || ""} onChange={(v) => updateField("patient", "authorized_representative", v)} />
                    <FieldEdit label="Representative Phone" value={editedData?.patient?.authorized_representative_phone || ""} onChange={(v) => updateField("patient", "authorized_representative_phone", v)} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="provider" className="rounded-xl border border-border bg-card card-shadow px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Prescriber Information</span>
                    {changedSections.has('provider') && (
                      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges('provider'); }} variant="outline" size="sm" className="ml-auto">Save</Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <FieldEdit label="First Name" value={editedData?.provider?.first_name || ""} onChange={(v) => updateField("provider", "first_name", v)} />
                    <FieldEdit label="Last Name" value={editedData?.provider?.last_name || ""} onChange={(v) => updateField("provider", "last_name", v)} />
                    <FieldEdit label="Specialty" value={editedData?.provider?.specialty || ""} onChange={(v) => updateField("provider", "specialty", v)} />
                    <FieldEdit label="NPI" value={editedData?.provider?.npi || ""} confidence={conf.npi} onChange={(v) => updateField("provider", "npi", v)} />
                    <FieldEdit label="DEA Number" value={editedData?.provider?.dea_number || ""} onChange={(v) => updateField("provider", "dea_number", v)} />
                    <FieldEdit label="Address" value={editedData?.provider?.address || ""} onChange={(v) => updateField("provider", "address", v)} />
                    <FieldEdit label="City" value={editedData?.provider?.city || ""} onChange={(v) => updateField("provider", "city", v)} />
                    <FieldEdit label="State" value={editedData?.provider?.state || ""} onChange={(v) => updateField("provider", "state", v)} />
                    <FieldEdit label="Zip Code" value={editedData?.provider?.zip || ""} onChange={(v) => updateField("provider", "zip", v)} />
                    <FieldEdit label="Phone" value={editedData?.provider?.phone || ""} onChange={(v) => updateField("provider", "phone", v)} />
                    <FieldEdit label="Fax" value={editedData?.provider?.fax || ""} onChange={(v) => updateField("provider", "fax", v)} />
                    <FieldEdit label="Email" value={editedData?.provider?.email || ""} onChange={(v) => updateField("provider", "email", v)} />
                    <FieldEdit label="Office Contact Person" value={editedData?.provider?.office_contact || ""} onChange={(v) => updateField("provider", "office_contact", v)} />
                    <FieldEdit label="Requestor (if different)" value={editedData?.provider?.requestor || ""} onChange={(v) => updateField("provider", "requestor", v)} />
                    <FieldEdit label="Signature Date" value={editedData?.provider?.signature_date || ""} onChange={(v) => updateField("provider", "signature_date", v)} />
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="clinical" className="rounded-xl border border-border bg-card card-shadow px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Medication / Medical Information</span>
                    {changedSections.has('clinical') && (
                      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges('clinical'); }} variant="outline" size="sm" className="ml-auto">Save</Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    <FieldEdit label="Drug Requested" value={editedData?.clinical?.drug_requested || ""} confidence={conf.drug_requested} onChange={(v) => updateField("clinical", "drug_requested", v)} />
                    <FieldEdit label="Diagnosis (ICD-10)" value={editedData?.clinical?.diagnosis_icd10 || ""} confidence={conf.diagnosis_icd10} onChange={(v) => updateField("clinical", "diagnosis_icd10", v)} />
                    <FieldEdit label="Therapy Type" value={editedData?.clinical?.therapy_type || ""} onChange={(v) => updateField("clinical", "therapy_type", v)} />
                    <FieldEdit label="Date Therapy Initiated" value={editedData?.clinical?.date_therapy_initiated || ""} onChange={(v) => updateField("clinical", "date_therapy_initiated", v)} />
                    <FieldEdit label="Duration of Therapy" value={editedData?.clinical?.duration_of_therapy || ""} onChange={(v) => updateField("clinical", "duration_of_therapy", v)} />
                    <FieldEdit label="Dose/Strength" value={editedData?.clinical?.dosing || ""} confidence={conf.dosing} onChange={(v) => updateField("clinical", "dosing", v)} />
                    <FieldEdit label="Frequency" value={editedData?.clinical?.frequency || ""} onChange={(v) => updateField("clinical", "frequency", v)} />
                    <FieldEdit label="Quantity" value={editedData?.clinical?.quantity || ""} onChange={(v) => updateField("clinical", "quantity", v)} />
                    <FieldEdit label="Length of Therapy / #Refills" value={editedData?.clinical?.length_of_therapy || ""} onChange={(v) => updateField("clinical", "length_of_therapy", v)} />
                    <FieldEdit label="Administration" value={editedData?.clinical?.administration || ""} onChange={(v) => updateField("clinical", "administration", v)} />
                    <FieldEdit label="Administration Location" value={editedData?.clinical?.administration_location || ""} onChange={(v) => updateField("clinical", "administration_location", v)} />
                    <div className="flex items-center gap-2">
                      <Checkbox checked={editedData?.clinical?.is_refill || false} onCheckedChange={(checked) => updateField("clinical", "is_refill", checked as any)} />
                      <Label className="text-xs font-normal">Is Refill / Renewal</Label>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="insurance" className="rounded-xl border border-border bg-card card-shadow px-4">
                <AccordionTrigger className="text-sm font-semibold">
                  <div className="flex items-center justify-between w-full pr-4">
                    <span>Insurance Information</span>
                    {changedSections.has('insurance') && (
                      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges('insurance'); }} variant="outline" size="sm" className="ml-auto">Save</Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pb-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={editedData?.insurance?.has_insurance_card || false} onCheckedChange={(checked) => updateField("insurance", "has_insurance_card", checked as any)} />
                      <Label className="text-xs font-normal">Has Insurance Card</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FieldEdit label="Primary Insurance Name" value={editedData?.insurance?.primary_insurance_name || ""} onChange={(v) => updateField("insurance", "primary_insurance_name", v)} />
                      <FieldEdit label="Primary Member ID" value={editedData?.insurance?.primary_member_id || ""} onChange={(v) => updateField("insurance", "primary_member_id", v)} />
                      <FieldEdit label="Secondary Insurance Name" value={editedData?.insurance?.secondary_insurance_name || ""} onChange={(v) => updateField("insurance", "secondary_insurance_name", v)} />
                      <FieldEdit label="Secondary Member ID" value={editedData?.insurance?.secondary_member_id || ""} onChange={(v) => updateField("insurance", "secondary_member_id", v)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Notes</Label>
                      <Textarea value={editedData?.insurance?.notes || ""} onChange={(e) => updateField("insurance", "notes", e.target.value)} className="text-sm" rows={2} />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : (
            <div className="flex items-center justify-center py-20 text-center">
              <div>
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No extracted data yet. Use "Extract with AI" to process this referral.</p>
              </div>
            </div>
          )}


          {/* PA Management Card */}
          <PAManagementCard referral={referral} paInfo={paInfo} />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-card px-6 py-3 flex items-center justify-end gap-3 z-10">
        <Button variant="outline-primary" onClick={handlePreviewPDF}>
          <FileText className="h-4 w-4 mr-2" />
          Preview PDF
        </Button>
        <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
        <Button variant="success" onClick={() => setApproveOpen(true)}>Approve</Button>
      </div>

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

      {/* Reject modal */}
      <ConfirmModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject Referral"
        description="Please provide a reason for rejection."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={handleReject}
      >
        <div className="py-2">
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
        </div>
      </ConfirmModal>

      {/* Preview PDF modal - kept as fallback */}
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
