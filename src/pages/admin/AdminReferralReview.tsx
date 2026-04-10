import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Loader2 } from "lucide-react";
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
import { PAManagementCard } from "@/components/PAManagementCard";
import { TagListEditor } from "@/components/TagListEditor";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getReferralPAInfo } from "@/data/mockData";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminReferralReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [referral, setReferral] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deliverOpen, setDeliverOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editedData, setEditedData] = useState<any>(null);
  const [changedSections, setChangedSections] = useState<Set<string>>(new Set());

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

      // Fetch documents
      try {
        const docsRes = await adminApi.getReferralDocuments(id);
        setDocuments(docsRes.items || docsRes || []);
      } catch {
        // Documents may not exist yet, that's ok
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

  // Poll every 5s while status is 'processing'
  useEffect(() => {
    if (referral?.status !== 'processing') return;
    const timer = setInterval(() => fetchReferralData(true), 5000);
    return () => clearInterval(timer);
  }, [referral?.status, id]);

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

  const SectionSaveButton = ({ section }: { section: string }) =>
    changedSections.has(section) ? (
      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges(section); }} variant="outline" size="sm" className="ml-auto">Save</Button>
    ) : null;

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
              {documents.length > 0 && (
                <Badge variant="secondary" className="text-xs">{documents.length} doc{documents.length !== 1 ? 's' : ''}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{referral.drug} · {referral.clinic_name} · {referral.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(referral.status === 'uploaded' || referral.status === 'ready_for_review') && (
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
          <DocumentViewer documents={documents} className="flex-1" />
        </div>

        {/* Right: Extracted data */}
        <div className="lg:w-1/2 overflow-y-auto p-6">
          {referral.status === 'processing' ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-lg font-semibold text-foreground">AI is extracting referral details...</p>
              <p className="text-sm text-muted-foreground mt-2">This takes about 30 seconds. You can safely leave this page and come back.</p>
            </div>
          ) : data ? (
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
                  {/* Guardian subsection */}
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
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-60 right-0 border-t border-border bg-card px-6 py-3 flex items-center justify-between z-10">
        <div className="text-sm text-muted-foreground">
          {(referral.status === 'ready_for_review' || referral.status === 'uploaded') && (
            <span>Preview the PDF before approving</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline-primary" onClick={handlePreviewPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Preview PDF
          </Button>
          {(referral.status === 'ready_for_review' || referral.status === 'uploaded') && (
            <>
              <Button variant="destructive" onClick={() => setRejectOpen(true)}>Reject</Button>
              <Button variant="success" onClick={() => setApproveOpen(true)}>Approve</Button>
            </>
          )}
          {referral.status === 'approved_to_send' && (
            <Button variant="success" onClick={() => setDeliverOpen(true)}>Send to Pharmacy</Button>
          )}
        </div>
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

      {/* Deliver modal */}
      <ConfirmModal
        open={deliverOpen}
        onOpenChange={setDeliverOpen}
        title="Send to Pharmacy"
        description={`Send ${referral.patient_name}'s referral to the pharmacy?`}
        confirmLabel="Send"
        variant="success"
        onConfirm={async () => {
          try {
            await adminApi.deliverReferral(id!);
            toast({ title: "Sent to Pharmacy", description: "Referral has been sent to the pharmacy." });
            setDeliverOpen(false);
            const data = await adminApi.getReferral(id!);
            const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
            setReferral(mapped);
            setEditedData(mapped.extracted_data || {});
          } catch (err: any) {
            toast({ title: "Error", description: err.message || "Failed to send", variant: "destructive" });
          }
        }}
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
