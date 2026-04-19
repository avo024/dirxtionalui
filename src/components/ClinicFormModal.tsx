import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi, pharmacyApi, type AdminClinic } from "@/lib/api";
import { toast } from "sonner";

interface ClinicFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clinic?: AdminClinic | null;
}

type FormState = {
  name: string;
  specialty: string;
  email: string;
  phone: string;
  fax: string;
  npi: string;
  address: string;
  default_pharmacy_id: string;
};

const empty: FormState = {
  name: "",
  specialty: "",
  email: "",
  phone: "",
  fax: "",
  npi: "",
  address: "",
  default_pharmacy_id: "",
};

const NONE_VALUE = "__none__";

export function ClinicFormModal({ open, onOpenChange, clinic }: ClinicFormModalProps) {
  const isEdit = !!clinic;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: pharmaciesData } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: () => pharmacyApi.getPharmacies(),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const pharmacies = pharmaciesData?.items ?? [];

  useEffect(() => {
    if (open) {
      setErrors({});
      if (clinic) {
        setForm({
          name: clinic.name ?? "",
          specialty: clinic.specialty ?? "",
          email: clinic.email ?? "",
          phone: clinic.phone ?? "",
          fax: clinic.fax ?? "",
          npi: clinic.npi ?? "",
          address: clinic.address ?? "",
          default_pharmacy_id: clinic.default_pharmacy_id ?? "",
        });
      } else {
        setForm(empty);
      }
    }
  }, [open, clinic]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Clinic name is required";
    if (!form.specialty.trim()) e.specialty = "Specialty is required";
    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email address";
    }
    if (form.npi && !/^\d{10}$/.test(form.npi.trim())) {
      e.npi = "NPI must be 10 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Partial<AdminClinic> = {
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        fax: form.fax.trim() || null,
        npi: form.npi.trim() || null,
        address: form.address.trim() || null,
        default_pharmacy_id: form.default_pharmacy_id || null,
      };
      return isEdit
        ? adminApi.updateClinic(clinic!.id, payload)
        : adminApi.createClinic(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Clinic updated" : "Clinic created");
      queryClient.invalidateQueries({ queryKey: ["admin", "clinics"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to save clinic");
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
          <DialogTitle>{isEdit ? `Edit ${clinic?.name}` : "Add Clinic"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Clinic Name <span className="text-destructive">*</span>
            </Label>
            <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Specialty */}
          <div className="space-y-2">
            <Label htmlFor="specialty">
              Specialty <span className="text-destructive">*</span>
            </Label>
            <Input
              id="specialty"
              value={form.specialty}
              onChange={(e) => update("specialty", e.target.value)}
              placeholder="e.g., Dermatology"
            />
            {errors.specialty && <p className="text-xs text-destructive">{errors.specialty}</p>}
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Clinic Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Approval and rejection notifications are sent here.
              </p>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Main Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          </div>

          {/* Fax + NPI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fax">Fax</Label>
              <Input
                id="fax"
                type="tel"
                value={form.fax}
                onChange={(e) => update("fax", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npi">NPI</Label>
              <Input
                id="npi"
                value={form.npi}
                onChange={(e) => update("npi", e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="1234567890"
              />
              <p className="text-xs text-muted-foreground">
                10-digit National Provider Identifier
              </p>
              {errors.npi && <p className="text-xs text-destructive">{errors.npi}</p>}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>

          {/* Default Pharmacy */}
          <div className="space-y-2">
            <Label htmlFor="default_pharmacy">Default Pharmacy</Label>
            <Select
              value={form.default_pharmacy_id || NONE_VALUE}
              onValueChange={(v) => update("default_pharmacy_id", v === NONE_VALUE ? "" : v)}
            >
              <SelectTrigger id="default_pharmacy">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {pharmacies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Clinic"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
