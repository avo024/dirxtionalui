import { useEffect, useState } from "react";
import { FormErrorSummary } from "@/components/ui/FormErrorSummary";
import { focusFirstError } from "@/lib/formErrors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { getMyClinic, updateMyProfile, type EmailPrefs } from "@/lib/api";
import { useProfile, PROFILE_QUERY_KEY } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
  npi: string;
}

type FormErrors = {
  first_name?: string;
  last_name?: string;
  phone?: string;
};

const CLINIC_QUERY_KEY = ["clinic", "me"] as const;

const NO_PREFS: EmailPrefs = {
  referral_updates: false,
  requests: false,
  appeals: false,
  notes_on_sent: false,
  support: false,
};

const PREF_ROWS: { key: keyof EmailPrefs; label: string }[] = [
  { key: "referral_updates", label: "Referral approved, needs attention, or delivered" },
  { key: "requests", label: "Requests and signatures from Dirxctional" },
  { key: "appeals", label: "Appeal decisions" },
  { key: "notes_on_sent", label: "Notes on sent referrals" },
  { key: "support", label: "Support request resolved" },
];

const ERROR_LABELS: Record<string, string> = { first_name: "First name", last_name: "Last name", phone: "Phone" };

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const { data: clinic, isLoading: clinicLoading } = useQuery({
    queryKey: CLINIC_QUERY_KEY,
    queryFn: getMyClinic,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const [form, setForm] = useState<FormState>({
    first_name: "",
    last_name: "",
    phone: "",
    npi: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [prefs, setPrefs] = useState<EmailPrefs>(NO_PREFS);

  // Hydrate the form from the latest profile each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setForm({
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      phone: profile?.phone ?? "",
      npi: profile?.npi ?? "",
    });
    setPrefs({ ...NO_PREFS, ...(profile?.email_prefs ?? {}) });
    setErrors({});
  }, [open, profile]);

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({
        title: "Couldn't save profile",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.first_name.trim()) next.first_name = "First name is required";
    if (!form.last_name.trim()) next.last_name = "Last name is required";
    if (!form.phone.trim()) next.phone = "Phone is required";
    setErrors(next);
    if (Object.keys(next).length > 0) focusFirstError(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim(),
      npi: form.npi.trim() || undefined,
      email_prefs: prefs,
    });
  };

  const update = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  // Clinic info field with graceful fallback to "—"
  const clinicAny = clinic as any;
  const clinicAddress = clinicAny
    ? [clinicAny.address, clinicAny.city, clinicAny.state, clinicAny.zip]
        .filter(Boolean)
        .join(", ") || null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your personal information. Clinic-level details are managed by the Dirxctional team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* My Information */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">My Information</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit_first_name">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_first_name" data-field="first_name"
                  value={form.first_name}
                  onChange={update("first_name")}
                  aria-invalid={!!errors.first_name}
                />
                {errors.first_name && (
                  <p className="text-xs text-destructive">{errors.first_name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit_last_name">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit_last_name" data-field="last_name"
                  value={form.last_name}
                  onChange={update("last_name")}
                  aria-invalid={!!errors.last_name}
                />
                {errors.last_name && (
                  <p className="text-xs text-destructive">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit_phone" data-field="phone"
                type="tel"
                placeholder="e.g. 555-123-4567"
                value={form.phone}
                onChange={update("phone")}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit_npi">NPI Number</Label>
              <Input
                id="edit_npi"
                value={form.npi}
                onChange={update("npi")}
                placeholder="Leave blank if not a prescriber"
              />
            </div>
          </section>

          <Separator />

          {/* Email notifications (per user, default off) */}
          <section className="space-y-3" data-testid="email-prefs">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Email notifications</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose which emails you get. Invites and sign-in emails are always sent.
              </p>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {PREF_ROWS.map(({ key, label }) => (
                <li key={key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <Label htmlFor={`pref_${key}`} className="text-sm font-normal text-foreground cursor-pointer">
                    {label}
                  </Label>
                  <Switch
                    id={`pref_${key}`}
                    checked={prefs[key]}
                    onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))}
                  />
                </li>
              ))}
            </ul>
          </section>

          <Separator />

          {/* Clinic Information (read-only) */}
          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Clinic Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Managed by the Dirxctional team. Contact{" "}
                <a
                  href="mailto:support@dirxctional.com"
                  className="text-primary hover:underline"
                >
                  support@dirxctional.com
                </a>{" "}
                to change these details.
              </p>
            </div>

            {clinicLoading ? (
              <div className="flex items-center justify-center py-4">
                <Icon name="spinner" className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <ReadOnlyField label="Clinic Name" value={clinicAny?.name} />
                <ReadOnlyField label="Specialty" value={clinicAny?.specialty} />
                <ReadOnlyField label="Contact Email" value={clinicAny?.email} />
                <ReadOnlyField label="Phone" value={clinicAny?.phone} />
                <ReadOnlyField label="Address" value={clinicAddress} className="sm:col-span-2" />
              </dl>
            )}
          </section>

          <FormErrorSummary errors={errors} labels={ERROR_LABELS} />

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Icon name="spinner" className="mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReadOnlyField({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </dt>
      <dd className="text-sm text-foreground mt-0.5">{value || "—"}</dd>
    </div>
  );
}
