import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { TagListEditor } from "@/components/TagListEditor";
import { pharmacyApi, type Pharmacy } from "@/lib/api";
import { toast } from "sonner";

interface PharmacyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pharmacy?: Pharmacy | null;
  onSuccess?: (pharmacy: Pharmacy) => void;
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  fax: string;
  alt_phone_fax: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  contact_email: string;
  contact_phone: string;
  notes: string;
  accepts_no_insurance: boolean;
  blocked_medications: string[];
  is_active: boolean;
};

const empty: FormState = {
  name: "",
  email: "",
  phone: "",
  fax: "",
  alt_phone_fax: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  contact_email: "",
  contact_phone: "",
  notes: "",
  accepts_no_insurance: false,
  blocked_medications: [],
  is_active: true,
};

export function PharmacyFormModal({ open, onOpenChange, pharmacy, onSuccess }: PharmacyFormModalProps) {
  const isEdit = !!pharmacy;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setErrors({});
      if (pharmacy) {
        setForm({
          name: pharmacy.name ?? "",
          email: pharmacy.email ?? "",
          phone: pharmacy.phone ?? "",
          fax: pharmacy.fax ?? "",
          alt_phone_fax: pharmacy.alt_phone_fax ?? "",
          address: pharmacy.address ?? "",
          city: pharmacy.city ?? "",
          state: pharmacy.state ?? "",
          zip: pharmacy.zip ?? "",
          contact_email: pharmacy.contact_email ?? "",
          contact_phone: pharmacy.contact_phone ?? "",
          notes: pharmacy.notes ?? "",
          accepts_no_insurance: !!pharmacy.accepts_no_insurance,
          blocked_medications: pharmacy.blocked_medications ?? [],
          is_active: pharmacy.is_active ?? true,
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, pharmacy]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (form.state && form.state.trim().length !== 2) e.state = "Use 2-letter state code";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<Pharmacy> = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        fax: form.fax.trim() || null,
        alt_phone_fax: form.alt_phone_fax.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim().toUpperCase() || null,
        zip: form.zip.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        notes: form.notes.trim() || null,
        accepts_no_insurance: form.accepts_no_insurance,
        blocked_medications: form.blocked_medications,
        is_active: form.is_active,
      };
      return isEdit
        ? pharmacyApi.updatePharmacy(pharmacy!.id, payload)
        : pharmacyApi.createPharmacy(payload);
    },
    onSuccess: (saved) => {
      toast.success(isEdit ? "Pharmacy updated" : "Pharmacy created");
      queryClient.invalidateQueries({ queryKey: ["pharmacies"] });
      if (isEdit && pharmacy) queryClient.invalidateQueries({ queryKey: ["pharmacy", pharmacy.id] });
      onSuccess?.(saved);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save pharmacy");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${pharmacy?.name}` : "Add Pharmacy"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Identity */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input id="fax" value={form.fax} onChange={(e) => update("fax", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alt_phone_fax">Alt Phone/Fax</Label>
              <Input id="alt_phone_fax" value={form.alt_phone_fax} onChange={(e) => update("alt_phone_fax", e.target.value)} />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} maxLength={2} onChange={(e) => update("state", e.target.value.toUpperCase())} />
              {errors.state && <p className="text-xs text-destructive">{errors.state}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">Zip</Label>
              <Input id="zip" value={form.zip} onChange={(e) => update("zip", e.target.value)} />
            </div>
          </div>

          {/* Secondary contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input id="contact_email" type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input id="contact_phone" value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          </div>

          {/* Flags */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="accepts_no_insurance"
              checked={form.accepts_no_insurance}
              onCheckedChange={(v) => update("accepts_no_insurance", !!v)}
            />
            <Label htmlFor="accepts_no_insurance" className="cursor-pointer text-sm font-normal">
              Accepts patients without insurance (bridge program eligible)
            </Label>
          </div>

          {/* Blocked meds */}
          <TagListEditor
            label="Blocked Medications"
            items={form.blocked_medications}
            onChange={(items) => update("blocked_medications", items as string[])}
            placeholder="Drug name (e.g., Humira)"
          />

          {/* Active */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive pharmacies are hidden from new referrals.</p>
            </div>
            <Switch id="is_active" checked={form.is_active} onCheckedChange={(v) => update("is_active", v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Pharmacy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
