import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { clinicApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

export interface CreatedPatient {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone_primary?: string;
  phone?: string;
}

interface NewPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the patient is created and ready to be auto-selected. */
  onCreated: (patient: CreatedPatient) => void;
}

const initialForm = {
  firstName: "",
  lastName: "",
  mi: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  height: "",
  weight: "",
  allergies: "",
  authorizedRepresentative: "",
  authorizedRepresentativePhone: "",
};

export function NewPatientModal({ open, onOpenChange, onCreated }: NewPatientModalProps) {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => setForm(initialForm);

  const isValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.dob &&
    form.phone.trim() &&
    form.gender &&
    form.address.trim() &&
    form.city.trim() &&
    form.state.trim() &&
    form.zip.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    try {
      const created = await clinicApi.createPatient({
        full_name: `${form.firstName} ${form.lastName}`.trim(),
        first_name: form.firstName,
        last_name: form.lastName,
        mi: form.mi,
        dob: form.dob,
        gender: form.gender,
        phone_primary: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        height: form.height,
        weight: form.weight,
        allergies: form.allergies,
        authorized_representative: form.authorizedRepresentative,
        authorized_representative_phone: form.authorizedRepresentativePhone,
      });
      toast({ title: "Patient created", description: `${form.firstName} ${form.lastName} added` });
      onCreated({
        id: created.id,
        full_name: created.full_name || `${form.firstName} ${form.lastName}`.trim(),
        first_name: form.firstName,
        last_name: form.lastName,
        dob: form.dob,
        phone_primary: form.phone,
      });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to create patient",
        description: err.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Patient</DialogTitle>
          <DialogDescription>
            Enter the patient's details. Required fields are marked with an asterisk.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
              <Input value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
              <Input value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Doe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Date of Birth <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.dob} onChange={(e) => update("dob", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Gender <span className="text-destructive">*</span></Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone <span className="text-destructive">*</span></Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="patient@email.com" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Address <span className="text-destructive">*</span></Label>
            <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="123 Main St" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label className="text-xs">City <span className="text-destructive">*</span></Label>
              <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Springfield" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State <span className="text-destructive">*</span></Label>
              <Input
                value={form.state}
                onChange={(e) => update("state", e.target.value.toUpperCase())}
                placeholder="IL"
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zip <span className="text-destructive">*</span></Label>
              <Input value={form.zip} onChange={(e) => update("zip", e.target.value)} placeholder="62701" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Middle Initial</Label>
              <Input maxLength={1} value={form.mi} onChange={(e) => update("mi", e.target.value)} placeholder="M" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Height</Label>
              <Input value={form.height} onChange={(e) => update("height", e.target.value)} placeholder={`5'6"`} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Weight</Label>
              <Input value={form.weight} onChange={(e) => update("weight", e.target.value)} placeholder="145 lbs" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Allergies</Label>
            <Input value={form.allergies} onChange={(e) => update("allergies", e.target.value)} placeholder="e.g. Penicillin, Sulfa" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Authorized Representative</Label>
              <Input value={form.authorizedRepresentative} onChange={(e) => update("authorizedRepresentative", e.target.value)} placeholder="Name (if applicable)" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Representative Phone</Label>
              <Input value={form.authorizedRepresentativePhone} onChange={(e) => update("authorizedRepresentativePhone", e.target.value)} placeholder="Phone (if applicable)" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
