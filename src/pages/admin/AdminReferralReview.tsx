import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
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
import { mockReferrals, getReferralPAInfo } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminReferralReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const referral = mockReferrals.find((r) => r.id === id);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  if (!referral) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Referral not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/referrals")}>Back</Button>
      </div>
    );
  }

  const { extracted_data: data } = referral;
  const conf = data.confidence;
  const paInfo = getReferralPAInfo(referral);

  const handleApprove = () => {
    toast({ title: "Referral Approved", description: `${referral.patient_name}'s referral has been approved.` });
    setApproveOpen(false);
    navigate("/admin/referrals");
  };

  const handleReject = () => {
    toast({ title: "Referral Rejected", description: `${referral.patient_name}'s referral has been rejected.` });
    setRejectOpen(false);
    navigate("/admin/referrals");
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
        <p className="text-xs text-muted-foreground font-medium px-2 py-1 bg-accent/10 rounded-md">
          AI Extracted Data
        </p>
      </div>

      {/* Split screen */}
      <div className="flex flex-col lg:flex-row" style={{ height: "calc(100vh - 140px)" }}>
        {/* Left: Document viewer */}
        <div className="lg:w-1/2 border-r border-border flex flex-col min-h-[400px]">
          <DocumentViewer documents={referral.documents} className="flex-1" />
        </div>

        {/* Right: Extracted data */}
        <div className="lg:w-1/2 overflow-y-auto p-6">
          <Accordion type="multiple" defaultValue={["patient", "provider", "clinical", "insurance", "prior_auth"]} className="space-y-3">
            <AccordionItem value="patient" className="rounded-xl border border-border bg-card card-shadow px-4">
              <AccordionTrigger className="text-sm font-semibold">Patient Information</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <FieldEdit label="First Name" value={data.patient.first_name} confidence={conf.first_name} />
                  <FieldEdit label="Last Name" value={data.patient.last_name} confidence={conf.last_name} />
                  <FieldEdit label="Date of Birth" value={data.patient.dob} confidence={conf.dob} />
                  <FieldEdit label="Gender" value={data.patient.gender} />
                  <FieldEdit label="Phone" value={data.patient.phone} confidence={conf.phone} />
                  <FieldEdit label="Email" value={data.patient.email} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="provider" className="rounded-xl border border-border bg-card card-shadow px-4">
              <AccordionTrigger className="text-sm font-semibold">Provider Information</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <FieldEdit label="Name" value={data.provider.name} />
                  <FieldEdit label="NPI" value={data.provider.npi} confidence={conf.npi} />
                  <FieldEdit label="Address" value={data.provider.address} className="col-span-2" />
                  <FieldEdit label="Phone" value={data.provider.phone} />
                  <FieldEdit label="Signature Date" value={data.provider.signature_date} />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="clinical" className="rounded-xl border border-border bg-card card-shadow px-4">
              <AccordionTrigger className="text-sm font-semibold">Clinical Information</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-3 pb-2">
                  <FieldEdit label="Diagnosis (ICD-10)" value={data.clinical.diagnosis_icd10} confidence={conf.diagnosis_icd10} />
                  <FieldEdit label="Drug Requested" value={data.clinical.drug_requested} confidence={conf.drug_requested} />
                  <FieldEdit label="Dosing" value={data.clinical.dosing} confidence={conf.dosing} />
                  <FieldEdit label="Quantity" value={data.clinical.quantity} />
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked={data.clinical.is_refill} />
                    <Label className="text-xs font-normal">Is Refill</Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="insurance" className="rounded-xl border border-border bg-card card-shadow px-4">
              <AccordionTrigger className="text-sm font-semibold">Insurance Information</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox defaultChecked={data.insurance.has_insurance_card} />
                    <Label className="text-xs font-normal">Has Insurance Card</Label>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea defaultValue={data.insurance.notes} className="text-sm" rows={2} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>

          {/* PA Management Card - outside accordion */}
          <PAManagementCard referral={referral} paInfo={paInfo} />
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-card px-6 py-3 flex items-center justify-end gap-3 z-10">
        <Button variant="outline-primary" onClick={() => setPreviewOpen(true)}>
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

function FieldEdit({ label, value, confidence, className }: { label: string; value: string; confidence?: number; className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {confidence !== undefined && <ConfidenceIndicator confidence={confidence} />}
      </div>
      <Input defaultValue={value} className="h-8 text-sm" />
    </div>
  );
}
