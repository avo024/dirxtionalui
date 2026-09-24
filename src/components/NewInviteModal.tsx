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
import { Combobox } from "@/components/ui/combobox";
import { adminApi, type AdminClinic } from "@/lib/api";
import { CLINIC_ROLES, DEFAULT_CLINIC_ROLE, type ClinicRoleValue } from "@/lib/roles";
import { useClinicHasOfficeManager } from "@/hooks/useClinicHasOfficeManager";
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
  const [role, setRole] = useState<ClinicRoleValue>(DEFAULT_CLINIC_ROLE);
  const [roleTouched, setRoleTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: clinicsData, isLoading: loadingClinics } = useQuery({
    queryKey: ["admin", "clinics"],
    queryFn: () => adminApi.getClinics(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const clinics: AdminClinic[] = clinicsData?.items ?? [];

  const { hasOfficeManager, hasPendingOfficeManagerInvite, loading: omLoading } =
    useClinicHasOfficeManager(clinicId || undefined);
  const needsOfficeManager = !!clinicId && !omLoading && !hasOfficeManager && !hasPendingOfficeManagerInvite;

  useEffect(() => {
    if (!open) {
      setClinicId("");
      setEmail("");
      setRole(DEFAULT_CLINIC_ROLE);
      setRoleTouched(false);
      setError(null);
    }
  }, [open]);

  // Clinic selection changed — clear the manual-override flag so the
  // office-manager default can re-apply for the newly selected clinic.
  useEffect(() => {
    setRoleTouched(false);
  }, [clinicId]);

  // Soft default: first invite for a clinic should be the office manager.
  // Only auto-applies while the admin hasn't manually picked a role.
  useEffect(() => {
    if (!clinicId || omLoading || roleTouched) return;
    setRole(needsOfficeManager ? "office_manager" : DEFAULT_CLINIC_ROLE);
  }, [clinicId, omLoading, needsOfficeManager, roleTouched]);

  const showOfficeManagerNote = needsOfficeManager && role === "office_manager";
  const showSendAnywayWarning = needsOfficeManager && role !== "office_manager";

  const createMutation = useMutation({
    mutationFn: () => adminApi.createInvite({ clinic_id: clinicId, email: email.trim(), role }),
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
            <Combobox
              id="clinic"
              placeholder={loadingClinics ? "Loading clinics..." : "Select a clinic"}
              value={clinicId}
              onValueChange={setClinicId}
              disabled={loadingClinics}
              options={clinics.map((c) => ({ value: c.id, label: c.name }))}
            />
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

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-destructive">*</span>
            </Label>
            <Combobox
              id="role"
              placeholder="Select a role"
              value={role}
              onValueChange={(v) => {
                setRole(v as ClinicRoleValue);
                setRoleTouched(true);
              }}
              options={CLINIC_ROLES.map((r) => ({ value: r.value, label: r.label, hint: r.description }))}
              searchable={false}
            />
            {showOfficeManagerNote && (
              <p className="rounded-md bg-teal-50 px-2.5 py-2 text-xs text-teal-700">
                This clinic has no office manager yet — invite them first. They'll own clinic settings and get every
                referral that needs action.
              </p>
            )}
            {showSendAnywayWarning && (
              <p className="rounded-md border border-amber-300/60 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                No office manager yet — send this anyway?
              </p>
            )}
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
              {showSendAnywayWarning ? "Send anyway" : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
