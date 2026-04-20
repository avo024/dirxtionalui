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
import { cn } from "@/lib/utils";
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

type FormErrors = Partial<Record<keyof typeof initialForm, string>>;

const REQUIRED_FIELDS: (keyof typeof initialForm)[] = [
  "firstName",
  "lastName",
  "dob",
  "gender",
  "phone",
  "address",
  "city",
  "state",
  "zip",
];

function validate(form: typeof initialForm): FormErrors {
  const errors: FormErrors = {};
  if (!form.firstName.trim()) errors.firstName = "First name is required";
  if (!form.lastName.trim()) errors.lastName = "Last name is required";
  if (!form.dob) errors.dob = "Date of birth is required";
  if (!form.gender) errors.gender = "Gender is required";
  if (!form.phone.trim()) {
    errors.phone = "Phone is required";
  } else if (form.phone.replace(/\D/g, "").length < 10) {
    errors.phone = "Phone must include at least 10 digits";
  }
  if (!form.address.trim()) errors.address = "Street address is required";
  if (!form.city.trim()) errors.city = "City is required";
  if (!form.state.trim()) errors.state = "State is required";
  if (!form.zip.trim()) errors.zip = "Zip is required";
  return errors;
}

export function NewPatientModal({ open, onOpenChange, onCreated }: NewPatientModalProps) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setForm(initialForm);
    setErrors({});
  };

  const isValid = REQUIRED_FIELDS.every((f) => {
    const v = form[f];
    if (typeof v !== "string") return true;
    if (!v.trim()) return false;
    if (f === "phone" && v.replace(/\D/g, "").length < 10) return false;
    return true;
  });

  const focusFirstError = (errs: FormErrors) => {
    const firstKey = REQUIRED_FIELDS.find((k) => errs[k]);
    if (firstKey) {
      const el = document.getElementById(`new-patient-${firstKey}`);
      if (el && typeof (el as HTMLElement).focus === "function") {
        (el as HTMLElement).focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirstError(errs);
      return;
    }
    setErrors({});
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

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const errorClass = (key: keyof typeof form) =>
    errors[key] ? "border-destructive focus-visible:ring-destructive" : "";

  const Req = () => <span className="text-destructive">*</span>;

  const ErrorText = ({ name }: { name: keyof typeof form }) =>
    errors[name] ? (
      <p className="text-xs text-destructive mt-1">{errors[name]}</p>
    ) : null;

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

        <form onSubmit={handleSubmit} className="space-y-4 pt-2" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-firstName" className="text-xs">First Name <Req /></Label>
              <Input
                id="new-patient-firstName"
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
                placeholder="John"
                className={errorClass("firstName")}
                aria-invalid={!!errors.firstName}
              />
              <ErrorText name="firstName" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-lastName" className="text-xs">Last Name <Req /></Label>
              <Input
                id="new-patient-lastName"
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
                placeholder="Doe"
                className={errorClass("lastName")}
                aria-invalid={!!errors.lastName}
              />
              <ErrorText name="lastName" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-dob" className="text-xs">Date of Birth <Req /></Label>
              <Input
                id="new-patient-dob"
                type="date"
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
                className={errorClass("dob")}
                aria-invalid={!!errors.dob}
              />
              <ErrorText name="dob" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-gender" className="text-xs">Gender <Req /></Label>
              <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger id="new-patient-gender" className={errorClass("gender")} aria-invalid={!!errors.gender}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <ErrorText name="gender" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-phone" className="text-xs">Phone <Req /></Label>
              <Input
                id="new-patient-phone"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="(555) 123-4567"
                className={errorClass("phone")}
                aria-invalid={!!errors.phone}
              />
              <ErrorText name="phone" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-email" className="text-xs">Email</Label>
              <Input
                id="new-patient-email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="patient@email.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-patient-address" className="text-xs">Address <Req /></Label>
            <Input
              id="new-patient-address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
              placeholder="123 Main St"
              className={errorClass("address")}
              aria-invalid={!!errors.address}
            />
            <ErrorText name="address" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="new-patient-city" className="text-xs">City <Req /></Label>
              <Input
                id="new-patient-city"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                placeholder="Springfield"
                className={errorClass("city")}
                aria-invalid={!!errors.city}
              />
              <ErrorText name="city" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-state" className="text-xs">State <Req /></Label>
              <Input
                id="new-patient-state"
                value={form.state}
                onChange={(e) => update("state", e.target.value.toUpperCase())}
                placeholder="IL"
                maxLength={2}
                className={errorClass("state")}
                aria-invalid={!!errors.state}
              />
              <ErrorText name="state" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-patient-zip" className="text-xs">Zip <Req /></Label>
              <Input
                id="new-patient-zip"
                value={form.zip}
                onChange={(e) => update("zip", e.target.value)}
                placeholder="62701"
                className={errorClass("zip")}
                aria-invalid={!!errors.zip}
              />
              <ErrorText name="zip" />
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

          {Object.keys(errors).length > 0 && (
            <div className={cn("rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive")}>
              Please complete all required fields highlighted above.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} title={!isValid ? "Complete required fields" : undefined}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
