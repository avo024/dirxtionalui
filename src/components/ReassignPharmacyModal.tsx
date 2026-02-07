import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockPharmacies } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

interface ReassignPharmacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referralId: string;
}

export function ReassignPharmacyModal({ open, onOpenChange, referralId }: ReassignPharmacyModalProps) {
  const [pharmacy, setPharmacy] = useState("");
  const [reason, setReason] = useState("");

  const activePharmacies = mockPharmacies.filter((p) => p.status === "active");

  const handleConfirm = () => {
    toast({ title: "Pharmacy Reassigned", description: `Referral ${referralId} reassigned successfully.` });
    setPharmacy("");
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign Pharmacy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Select Alternative Pharmacy</Label>
            <Select value={pharmacy} onValueChange={setPharmacy}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a pharmacy..." />
              </SelectTrigger>
              <SelectContent>
                {activePharmacies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason for Reassignment</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this referral is being reassigned..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!pharmacy || !reason}>Confirm Reassignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
