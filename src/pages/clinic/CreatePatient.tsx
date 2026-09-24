import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, UserPlus, User, MapPin, Stethoscope, Users, Search, X,
  Check, CircleAlert, Plus, ArrowRight, FilePlus2,
} from "lucide-react";
import { clinicApi } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/patterns/PageContainer";

const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"],
  ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"], ["DC", "District of Columbia"],
].map(([value, label]) => ({ value, label }));

type Field = {
  key: string; label: string; required?: boolean; placeholder?: string;
  kind?: "text" | "email" | "tel" | "date" | "select" | "state" | "textarea"; maxLength?: number; col?: "full"; options?: string[];
};
const SECTIONS: { key: string; title: string; icon: any; optional?: boolean; fields: Field[] }[] = [
  { key: "required", title: "Required", icon: UserPlus, fields: [
    { key: "full_name", label: "Full Name", required: true, placeholder: "First Last", col: "full" },
  ]},
  { key: "demographics", title: "Patient Demographics", icon: User, fields: [
    { key: "dob", label: "Date of Birth", kind: "date" },
    { key: "gender", label: "Gender", kind: "select", placeholder: "Select gender", options: ["Male", "Female", "Other", "Prefer not to say"] },
    { key: "phone_primary", label: "Phone", kind: "tel", placeholder: "(555) 123-4567" },
    { key: "phone_alternate", label: "Alternate Phone", kind: "tel", placeholder: "(555) 987-6543" },
    { key: "email", label: "Email", kind: "email", placeholder: "patient@email.com", col: "full" },
  ]},
  { key: "address", title: "Address", icon: MapPin, fields: [
    { key: "address", label: "Street Address", placeholder: "123 Main St", col: "full" },
    { key: "city", label: "City", placeholder: "City" },
    { key: "state", label: "State", kind: "state" },
    { key: "zip", label: "Zip", placeholder: "12345", maxLength: 5 },
  ]},
  { key: "medical", title: "Medical", icon: Stethoscope, fields: [
    { key: "height", label: "Height", placeholder: `e.g., 5'6" or 66 inches` },
    { key: "weight", label: "Weight", placeholder: "e.g., 140 lbs" },
    { key: "allergies", label: "Allergies", kind: "textarea", placeholder: "e.g., Penicillin, sulfa drugs", col: "full" },
  ]},
  { key: "guardian", title: "Guardian", icon: Users, optional: true, fields: [
    { key: "authorized_representative", label: "Authorized Representative", placeholder: "Guardian name" },
    { key: "authorized_representative_phone", label: "Representative Phone", placeholder: "(555) 123-4567" },
  ]},
];

function validateField(f: Field, v: string): string | null {
  const val = (v || "").trim();
  if (f.required && !val) return `${f.label} is required`;
  if (f.kind === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email";
  return null;
}
const firstName = (name: string) => (name || "").trim().split(" ")[0] || "the patient";

export default function CreatePatient() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""]))));
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const set = (k: string, v: string) => setForm((d) => ({ ...d, [k]: v }));
  const touch = (k: string) => setTouched((s) => new Set(s).add(k));
  const errorFor = (f: Field) => (touched.has(f.key) || submitted ? validateField(f, form[f.key]) : null);
  const okFor = (f: Field) => {
    if (!(touched.has(f.key) || submitted)) return false;
    const v = (form[f.key] || "").trim();
    return !!v && !validateField(f, form[f.key]) && (!!f.required || f.kind === "email");
  };

  const nameInvalid = !!validateField(SECTIONS[0].fields[0], form.full_name);

  const submit = async () => {
    setSubmitted(true);
    if (nameInvalid) {
      document.getElementById("full_name")?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const result = await clinicApi.createPatient(form);
      setCreated({ id: result.id, name: form.full_name });
    } catch (err: any) {
      toast.error(err.message || "Failed to create patient");
    } finally {
      setSubmitting(false);
    }
  };
  const reset = () => {
    setForm(Object.fromEntries(SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, ""]))));
    setTouched(new Set());
    setSubmitted(false);
    setCreated(null);
  };

  if (created) {
    return (
      <PageContainer className="max-w-xl mx-auto">
        <div className="flex flex-col items-center gap-3 text-center py-10">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"><Check width={32} height={32} strokeWidth={1.75} /></span>
          <h1 className="text-2xl font-semibold font-editorial text-foreground">Patient added</h1>
          <p className="text-sm text-muted-foreground"><b className="text-foreground font-semibold">{created.name.trim() || "The patient"}</b> has been added to the system.</p>

          <div className="flex items-center gap-3 w-full rounded-lg border border-border bg-card p-4 text-left mt-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FilePlus2 width={20} height={20} strokeWidth={1.75} /></span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">Create a referral for {firstName(created.name)}?</div>
              <div className="text-xs text-muted-foreground">Start a new referral while the details are fresh.</div>
            </div>
            <Button onClick={() => navigate(`/clinic/referrals/new?patientId=${created.id}`)}><ArrowRight width={15} height={15} strokeWidth={1.75} />Create referral</Button>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" onClick={() => navigate("/clinic/patients")}><Users width={15} height={15} strokeWidth={1.75} />Back to Patients</Button>
            <Button variant="ghost" onClick={reset}><Plus width={15} height={15} strokeWidth={1.75} />Add another patient</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" className="-ml-2 mb-3 text-muted-foreground" onClick={() => navigate("/clinic/patients")}>
        <ArrowLeft width={16} height={16} strokeWidth={1.75} />Back to Patients
      </Button>

      <div className="mb-5">
        <h1 className="text-2xl font-semibold font-editorial text-foreground">Add New Patient</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter patient demographics to add them to the system</p>
      </div>

      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {SECTIONS.map((s) => (
          <div className="p-5" key={s.key} id={`cp-sec-${s.key}`}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><s.icon width={16} height={16} strokeWidth={1.75} /></span>
              <h3 className="text-sm font-semibold text-foreground">
                {s.title}
                {s.optional && <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {s.fields.map((f) => (
                <CpField key={f.key} f={f} value={form[f.key] || ""} onChange={(v) => set(f.key, v)} onBlur={() => touch(f.key)} error={errorFor(f)} ok={okFor(f)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 mt-4">
        <span className={cn("mr-auto text-xs", submitted && nameInvalid ? "text-destructive font-medium inline-flex items-center gap-1" : "text-muted-foreground")}>
          {submitted && nameInvalid ? <><CircleAlert width={13} height={13} strokeWidth={1.75} />Full Name is required to create the patient</> : <>Full Name is required</>}
        </span>
        <Button variant="outline" onClick={() => navigate("/clinic/patients")}>Cancel</Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 width={15} height={15} strokeWidth={1.75} className="animate-spin" />Creating…</> : <><UserPlus width={15} height={15} strokeWidth={1.75} />Create Patient</>}
        </Button>
      </div>
    </PageContainer>
  );
}

function CpField({ f, value, onChange, onBlur, error, ok }: { f: Field; value: string; onChange: (v: string) => void; onBlur: () => void; error: string | null; ok: boolean }) {
  const stateCls = error ? "border-destructive focus-visible:ring-destructive" : ok ? "border-success" : "";
  let control: React.ReactNode;
  if (f.kind === "textarea") {
    control = <Textarea value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={cn("resize-none", stateCls)} />;
  } else if (f.kind === "select") {
    control = (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className={stateCls}>
          <SelectValue placeholder={f.placeholder} />
        </SelectTrigger>
        <SelectContent>
          {f.options!.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  } else if (f.kind === "state") {
    control = <StateTypeahead value={value} onChange={onChange} error={!!error} />;
  } else if (f.kind === "date") {
    control = <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} className={stateCls} />;
  } else {
    const adorn = error ? "err" : ok ? "ok" : null;
    control = (
      <div className="relative">
        <Input
          id={f.key === "full_name" ? "full_name" : undefined}
          type={f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : "text"}
          value={value}
          placeholder={f.placeholder}
          maxLength={f.maxLength}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn(adorn && "pr-9", stateCls)}
        />
        {adorn && (
          <span className={cn("absolute right-2.5 top-1/2 -translate-y-1/2", adorn === "ok" ? "text-success" : "text-destructive")}>
            {adorn === "ok" ? <Check width={16} height={16} strokeWidth={1.75} /> : <CircleAlert width={16} height={16} strokeWidth={1.75} />}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-1.5", f.col === "full" && "sm:col-span-2")}>
      <Label className="text-xs font-medium text-muted-foreground">
        {f.label}
        {f.required && <span className="text-destructive ml-0.5">*</span>}
        {!f.required && <span className="ml-1.5 font-normal text-muted-foreground/70">Optional</span>}
      </Label>
      {control}
      {error ? (
        <span className="inline-flex items-center gap-1 text-xs text-destructive"><CircleAlert width={13} height={13} strokeWidth={1.75} />{error}</span>
      ) : f.maxLength ? (
        <span className="text-xs text-muted-foreground">{(value || "").length}/{f.maxLength}</span>
      ) : null}
    </div>
  );
}

function StateTypeahead({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = US_STATES.find((s) => s.value === value);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return US_STATES;
    return US_STATES.filter((o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase() === s);
  }, [q]);

  const pick = (o: { value: string; label: string }) => { onChange(o.value); setOpen(false); setQ(""); };
  const display = open ? q : selected ? selected.label : "";
  const hl = (label: string) => {
    const s = q.trim();
    if (!s) return label;
    const i = label.toLowerCase().indexOf(s.toLowerCase());
    if (i < 0) return label;
    return <>{label.slice(0, i)}<mark className="bg-warning/30 text-foreground rounded-sm">{label.slice(i, i + s.length)}</mark>{label.slice(i + s.length)}</>;
  };

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search width={15} height={15} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={display}
          placeholder="Search state…"
          className={cn("pl-8", value && !open && "pr-8", error && "border-destructive")}
          onFocus={() => { setOpen(true); setActive(0); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); if (matches[active]) pick(matches[active]); }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        {value && !open && (
          <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => onChange("")} aria-label="Clear state">
            <X width={14} height={14} strokeWidth={1.75} />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-popover shadow-md p-1">
          {matches.length === 0 ? (
            <div className="px-2.5 py-3 text-sm text-muted-foreground">No states match "{q}"</div>
          ) : (
            matches.map((o, i) => (
              <button
                key={o.value}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm text-left",
                  i === active ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(o)}
              >
                <span className="font-mono text-xs text-muted-foreground w-6 shrink-0">{o.value}</span><span>{hl(o.label)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
