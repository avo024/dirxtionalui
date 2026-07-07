import { useState, useEffect } from "react";
import { Check, FileText, AlertTriangle, ChevronDown, Loader2, Image } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { PALetterInfo } from "@/components/PAManagementCard";

interface DeliveryConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralId: string;
  referral: any;
  documents: any[];
  onDelivered: () => void;
  paLetterInfo?: PALetterInfo | null;
  patientName?: string;
  drugName?: string;
}

const GENERATED_DOC_TYPES = ["generated_referral_pdf", "generated_referral_pdf_sent"];

function isImageFile(filename: string) {
  return /\.(jpg|jpeg|png|gif|tiff|bmp|webp)$/i.test(filename);
}

export function DeliveryConfirmModal({
  open,
  onOpenChange,
  referralId,
  referral,
  documents,
  onDelivered,
  paLetterInfo,
  patientName,
  drugName,
}: DeliveryConfirmModalProps) {
  const [changeOpen, setChangeOpen] = useState(false);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);
  const [reassigned, setReassigned] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [includedDocIds, setIncludedDocIds] = useState<Set<string>>(new Set());
  const [addlDocsOpen, setAddlDocsOpen] = useState(false);

  const [currentPharmacy, setCurrentPharmacy] = useState({
    name: referral?.pharmacy_name || "",
    email: referral?.pharmacy_email || "",
    phone: referral?.pharmacy_phone || "",
    fax: referral?.pharmacy_fax || "",
    address: referral?.pharmacy_address || "",
  });
  const [patientHasInsurance, setPatientHasInsurance] = useState<boolean | null>(null);

  const uploadedDocs = documents.filter(
    (d) => !GENERATED_DOC_TYPES.includes(d.doc_type)
  );

  useEffect(() => {
    if (open) {
      setChangeOpen(false);
      setPharmacies([]);
      setSelectedPharmacyId("");
      setReassigned(false);
      setIncludedDocIds(new Set());
      setAddlDocsOpen(false);
      setCurrentPharmacy({
        name: referral?.pharmacy_name || "",
        email: referral?.pharmacy_email || "",
        phone: referral?.pharmacy_phone || "",
        fax: referral?.pharmacy_fax || "",
        address: referral?.pharmacy_address || "",
      });
    }
  }, [open, referral]);

  const fetchPharmacies = async () => {
    if (pharmacies.length > 0) return;
    setLoadingPharmacies(true);
    try {
      const res = await adminApi.getAlternativePharmacies(referralId);
      setPharmacies(res.items || []);
      setPatientHasInsurance(res.patient_has_insurance ?? null);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load pharmacies", variant: "destructive" });
    } finally {
      setLoadingPharmacies(false);
    }
  };

  const handleReassign = async (pharmacyId: string) => {
    setReassigning(true);
    try {
      await adminApi.reassignPharmacy(referralId, pharmacyId);
      const updated = await adminApi.getReferral(referralId);
      setCurrentPharmacy({
        name: updated.pharmacy_name || "",
        email: updated.pharmacy_email || "",
        phone: updated.pharmacy_phone || "",
        fax: updated.pharmacy_fax || "",
        address: updated.pharmacy_address || "",
      });
      setReassigned(true);
      setTimeout(() => setReassigned(false), 3000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reassign pharmacy", variant: "destructive" });
    } finally {
      setReassigning(false);
    }
  };

  const toggleDoc = (docId: string) => {
    setIncludedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleDeliver = async () => {
    setDelivering(true);
    try {
      const includeArr = Array.from(includedDocIds);
      await adminApi.deliverReferral(referralId, includeArr.length > 0 ? includeArr : undefined);
      toast({
        title: "Sent to Pharmacy",
        description: `Referral sent to ${currentPharmacy.name}${currentPharmacy.email ? ` at ${currentPharmacy.email}` : ""}`,
      });
      onOpenChange(false);
      onDelivered();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to send referral", variant: "destructive" });
    } finally {
      setDelivering(false);
    }
  };

  const hasPharmacy = !!currentPharmacy.name;
  const isBridgeProgram = !!referral?.is_bridge_program;
  const hasPALetter = !isBridgeProgram && (paLetterInfo?.has_letter ?? false);
  const paRequired = !isBridgeProgram && (paLetterInfo?.drug_requires_pa ?? false);
  const paMissing = paRequired && !hasPALetter;
  const alwaysIncludedCount = 1 + (hasPALetter ? 1 : 0);
  const totalAttachments = alwaysIncludedCount + includedDocIds.size;

  const displayPatient = patientName || referral?.patient_name;
  const displayDrug = drugName || referral?.drug || referral?.drug_requested;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Referral to Pharmacy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Assigned Pharmacy */}
          {hasPharmacy ? (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{currentPharmacy.name}</p>
                {reassigned && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <Check className="h-3 w-3" /> Pharmacy updated
                  </span>
                )}
              </div>
              {/* Fax first — delivery is fax-primary (pharmacies only take fax) */}
              {currentPharmacy.fax ? (
                <p className="text-sm text-foreground font-medium">Fax: {currentPharmacy.fax}</p>
              ) : (
                <p className="text-sm text-warning font-medium">⚠ No fax on file — delivery will fail for fax-only pharmacies</p>
              )}
              {currentPharmacy.phone && <p className="text-sm text-muted-foreground">Phone: {currentPharmacy.phone}</p>}
              {currentPharmacy.email && <p className="text-sm text-muted-foreground">{currentPharmacy.email}</p>}
              {currentPharmacy.address && <p className="text-sm text-muted-foreground">{currentPharmacy.address}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span className="text-sm text-warning">No pharmacy assigned — select one below</span>
            </div>
          )}

          {/* Patient + Drug info */}
          {(displayPatient || displayDrug) && (
            <div className="text-sm text-muted-foreground">
              {displayPatient && <span>Patient: <span className="text-foreground font-medium">{displayPatient}</span></span>}
              {displayPatient && displayDrug && <span> · </span>}
              {displayDrug && <span>Drug: <span className="text-foreground font-medium">{displayDrug}</span></span>}
            </div>
          )}

          {/* Change Pharmacy */}
          <Collapsible open={changeOpen} onOpenChange={(isOpen) => {
            setChangeOpen(isOpen);
            if (isOpen) fetchPharmacies();
          }}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-primary px-0 h-auto font-normal">
                <ChevronDown className={cn("h-4 w-4 mr-1 transition-transform", changeOpen && "rotate-180")} />
                Change pharmacy
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              {loadingPharmacies ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading pharmacies...
                </div>
              ) : (
                <Select
                  value={selectedPharmacyId}
                  onValueChange={(val) => {
                    setSelectedPharmacyId(val);
                    handleReassign(val);
                  }}
                  disabled={reassigning}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={reassigning ? "Reassigning..." : "Select a pharmacy"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pharmacies.map((p) => {
                      const warnUninsured = patientHasInsurance === false && !p.accepts_no_insurance;
                      return (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.fax ? (
                              <span className="text-xs text-muted-foreground">· fax {p.fax}</span>
                            ) : (
                              <span className="text-xs text-warning">· no fax</span>
                            )}
                            {warnUninsured && (
                              <span className="text-xs text-warning">⚠ doesn't accept uninsured</span>
                            )}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Documents to send */}
          <div className="rounded-lg border border-border/50 p-4 space-y-2">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">
              Documents to send ({totalAttachments} attachment{totalAttachments !== 1 ? "s" : ""})
            </h4>

            {/* Always included — Referral PDF */}
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>Referral PDF</span>
            </div>

            {/* Always included — PA Letter (if exists) */}
            {hasPALetter && (
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-success shrink-0" />
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>PA Approval Letter</span>
              </div>
            )}

            {/* PA letter missing warning */}
            {paMissing && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-xs text-destructive">PA letter missing — upload one in the PA Management section before sending.</span>
              </div>
            )}

            {/* Additional documents — collapsible, unchecked by default */}
            {uploadedDocs.length > 0 && (
              <Collapsible open={addlDocsOpen} onOpenChange={setAddlDocsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground px-0 h-auto font-normal text-xs mt-1">
                    <ChevronDown className={cn("h-3.5 w-3.5 mr-1 transition-transform", addlDocsOpen && "rotate-180")} />
                    Add additional documents (optional)
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-1 space-y-1">
                  {uploadedDocs.map((doc) => {
                    const isIncluded = includedDocIds.has(doc.id);
                    const isImg = isImageFile(doc.original_filename || "");
                    return (
                      <label
                        key={doc.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/40 rounded px-1 py-0.5 -mx-1"
                      >
                        <Checkbox
                          checked={isIncluded}
                          onCheckedChange={() => toggleDoc(doc.id)}
                          className="h-3.5 w-3.5"
                        />
                        {isImg ? (
                          <Image className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className={cn("truncate", !isIncluded && "text-muted-foreground")}>
                          {doc.original_filename || doc.s3_key}
                        </span>
                      </label>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDeliver} disabled={delivering || paMissing}>
            {delivering ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</> : "Confirm & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
