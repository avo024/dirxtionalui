import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, type AdminClinic } from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NewInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewInviteModal({ open, onOpenChange }: NewInviteModalProps) {
  const queryClient = useQueryClient();
  const [clinicId, setClinicId] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: clinicsData, isLoading: loadingClinics } = useQuery({
    queryKey: ["admin", "clinics"],
    queryFn: () => adminApi.getClinics(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const clinics: AdminClinic[] = clinicsData?.items ?? [];

  useEffect(() => {
    if (!open) {
      setClinicId("");
      setEmail("");
      setError(null);
    }
  }, [open]);

  const createMutation = useMutation({
    mutationFn: () => adminApi.createInvite({ clinic_id: clinicId, email: email.trim() }),
    onSuccess: () => {
      toast.success(`Invite sent to ${email.trim()}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "invites"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      setError(err.message || "Failed to send invite");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!clinicId) {
      setError("Please select a clinic");
      return;
    }
    if (!email.trim()) {
      setError("Please enter an email address");
      return;
    }
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Clinic Invite</DialogTitle>
          <DialogDescription>
            Invite link will be emailed automatically. Link expires in 7 days.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clinic">
              Clinic <span className="text-destructive">*</span>
            </Label>
            <Select value={clinicId} onValueChange={setClinicId} disabled={loadingClinics}>
              <SelectTrigger id="clinic">
                <SelectValue placeholder={loadingClinics ? "Loading clinics..." : "Select a clinic"} />
              </SelectTrigger>
              <SelectContent>
                {clinics.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Invitee email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@clinic.com"
              maxLength={255}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
