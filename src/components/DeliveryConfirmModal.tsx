import { useState, useEffect } from "react";
import { Check, FileText, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface DeliveryConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralId: string;
  referral: any;
  documents: any[];
  onDelivered: () => void;
}

export function DeliveryConfirmModal({
  open,
  onOpenChange,
  referralId,
  referral,
  documents,
  onDelivered,
}: DeliveryConfirmModalProps) {
  const [changeOpen, setChangeOpen] = useState(false);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string>("");
  const [reassigning, setReassigning] = useState(false);
  const [reassigned, setReassigned] = useState(false);
  const [delivering, setDelivering] = useState(false);

  // Current pharmacy info (may update after reassignment)
  const [currentPharmacy, setCurrentPharmacy] = useState({
    name: referral?.pharmacy_name || "",
    email: referral?.pharmacy_email || "",
    phone: referral?.pharmacy_phone || "",
    address: referral?.pharmacy_address || "",
  });

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setChangeOpen(false);
      setPharmacies([]);
      setSelectedPharmacyId("");
      setReassigned(false);
      setCurrentPharmacy({
        name: referral?.pharmacy_name || "",
        email: referral?.pharmacy_email || "",
        phone: referral?.pharmacy_phone || "",
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
      // Refresh referral to get updated pharmacy info
      const updated = await adminApi.getReferral(referralId);
      setCurrentPharmacy({
        name: updated.pharmacy_name || "",
        email: updated.pharmacy_email || "",
        phone: updated.pharmacy_phone || "",
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

  const handleDeliver = async () => {
    setDelivering(true);
    try {
      await adminApi.deliverReferral(referralId);
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
  const docCount = documents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Referral to Pharmacy</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Section 1: Assigned Pharmacy */}
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
              {currentPharmacy.email && <p className="text-sm text-muted-foreground">{currentPharmacy.email}</p>}
              {currentPharmacy.phone && <p className="text-sm text-muted-foreground">{currentPharmacy.phone}</p>}
              {currentPharmacy.address && <p className="text-sm text-muted-foreground">{currentPharmacy.address}</p>}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md bg-warning/10 border border-warning/30 px-3 py-3">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <span className="text-sm text-warning">No pharmacy assigned — select one below</span>
            </div>
          )}

          {/* Section 2: Change Pharmacy */}
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
                    {pharmacies.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Section 3: What's being sent */}
          <div className="rounded-lg border border-border/50 p-4 space-y-2">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase mb-2">What's being sent</h4>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              <span>Referral PDF</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-success shrink-0" />
              <span>{docCount} uploaded document{docCount !== 1 ? "s" : ""}</span>
            </div>
            <div className="text-xs text-muted-foreground pt-1">
              {referral?.patient_name} · {referral?.drug || referral?.drug_requested}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleDeliver} disabled={delivering}>
            {delivering ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Sending...</> : "Confirm & Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
