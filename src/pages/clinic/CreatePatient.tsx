import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { clinicApi } from "@/lib/api";
import { toast } from "sonner";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC"
];

export default function CreatePatient() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    dob: "",
    gender: "",
    phone_primary: "",
    phone_alternate: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    height: "",
    weight: "",
    allergies: "",
    authorized_representative: "",
    authorized_representative_phone: "",
  });

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      toast.error("Full name is required");
      return;
    }
    setSubmitting(true);
    try {
      await clinicApi.createPatient(form);
      toast.success("Patient created successfully");
      navigate("/clinic/patients");
    } catch (err: any) {
      toast.error(err.message || "Failed to create patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate("/clinic/patients")} className="gap-1.5">
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Add New Patient</h1>
        <p className="text-muted-foreground mt-1">Enter patient demographics to add them to the system</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required */}
        <div className="rounded-xl border border-border bg-card p-5 card-shadow space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Required</h3>
          <div>
            <Label htmlFor="full_name">Full Name *</Label>
            <Input id="full_name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="First Last" />
          </div>
        </div>

        {/* Demographics */}
        <div className="rounded-xl border border-border bg-card p-5 card-shadow space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Patient Demographics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
            </div>
            <div>
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone_primary">Phone</Label>
              <Input id="phone_primary" value={form.phone_primary} onChange={(e) => set("phone_primary", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div>
              <Label htmlFor="phone_alternate">Alternate Phone</Label>
              <Input id="phone_alternate" value={form.phone_alternate} onChange={(e) => set("phone_alternate", e.target.value)} placeholder="(555) 987-6543" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="patient@email.com" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="rounded-xl border border-border bg-card p-5 card-shadow space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Address</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" />
              </div>
              <div>
                <Label>State</Label>
                <Select value={form.state} onValueChange={(v) => set("state", v)}>
                  <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="zip">Zip</Label>
                <Input id="zip" value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="12345" maxLength={5} />
              </div>
            </div>
          </div>
        </div>

        {/* Medical */}
        <div className="rounded-xl border border-border bg-card p-5 card-shadow space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Medical</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="height">Height</Label>
              <Input id="height" value={form.height} onChange={(e) => set("height", e.target.value)} placeholder={`e.g., 5'6" or 66 inches`} />
            </div>
            <div>
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" value={form.weight} onChange={(e) => set("weight", e.target.value)} placeholder="e.g., 140 lbs" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea id="allergies" value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g., Penicillin, sulfa drugs" rows={3} />
            </div>
          </div>
        </div>

        {/* Guardian */}
        <div className="rounded-xl border border-border bg-card p-5 card-shadow space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Guardian (optional)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="authorized_representative">Authorized Representative</Label>
              <Input id="authorized_representative" value={form.authorized_representative} onChange={(e) => set("authorized_representative", e.target.value)} placeholder="Guardian name" />
            </div>
            <div>
              <Label htmlFor="authorized_representative_phone">Representative Phone</Label>
              <Input id="authorized_representative_phone" value={form.authorized_representative_phone} onChange={(e) => set("authorized_representative_phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Patient
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/clinic/patients")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
