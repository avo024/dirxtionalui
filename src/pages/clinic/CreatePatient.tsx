import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, UserPlus, User, MapPin, Stethoscope, Users, Search, X,
  Check, CircleAlert, Plus, ArrowRight, FilePlus2,
} from "lucide-react";
import { clinicApi } from "@/lib/api";
import { toast } from "sonner";
import "./wizard.css";
import "./create-patient.css";

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
      <div className="rw-page cp-page rw-fade">
        <div className="cp-success">
          <div className="sc"><Check size={32} /></div>
          <h1>Patient added</h1>
          <p><b style={{ color: "var(--text-primary)", fontWeight: 600 }}>{created.name.trim() || "The patient"}</b> has been added to the system.</p>
          <div className="cp-offer">
            <div className="cp-offer-ic"><FilePlus2 size={20} /></div>
            <div className="cp-offer-tx">
              <div className="t">Create a referral for {firstName(created.name)}?</div>
              <div className="s">Start a new referral while the details are fresh.</div>
            </div>
            <button className="rw-btn primary" onClick={() => navigate(`/clinic/referrals/new?patientId=${created.id}`)}><ArrowRight size={15} />Create referral</button>
          </div>
          <div className="cp-success-actions">
            <button className="rw-btn outline" onClick={() => navigate("/clinic/patients")}><Users size={15} />Back to Patients</button>
            <button className="rw-btn ghost" onClick={reset}><Plus size={15} />Add another patient</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rw-page cp-page rw-fade">
      <button className="cp-back" onClick={() => navigate("/clinic/patients")}><span className="ci"><ArrowLeft size={16} /></span>Back to Patients</button>

      <div className="cp-head">
        <h1 className="cp-title">Add New Patient</h1>
        <p className="cp-sub">Enter patient demographics to add them to the system</p>
      </div>

      <div className="cp-card cp-onecard">
        {SECTIONS.map((s) => (
          <div className="cp-sec" key={s.key} id={`cp-sec-${s.key}`}>
            <div className="cp-sec-head">
              <span className="cp-sec-ic"><s.icon size={18} /></span>
              <div>
                <h3 className="cp-sec-title">{s.title}{s.optional && <span className="cp-opt-tag">Optional</span>}</h3>
              </div>
            </div>
            <div className="cp-grid">
              {s.fields.map((f) => (
                <CpField key={f.key} f={f} value={form[f.key] || ""} onChange={(v) => set(f.key, v)} onBlur={() => touch(f.key)} error={errorFor(f)} ok={okFor(f)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="cp-actions">
        <span className={`cp-act-note${submitted && nameInvalid ? " err" : ""}`}>
          {submitted && nameInvalid ? <><CircleAlert size={13} />Full Name is required to create the patient</> : <>Full Name is required</>}
        </span>
        <button className="rw-btn outline" onClick={() => navigate("/clinic/patients")}>Cancel</button>
        <button className="rw-btn primary" onClick={submit} disabled={submitting}>
          {submitting ? <><span className="rw-spin"><Loader2 size={15} /></span>Creating…</> : <><UserPlus size={15} />Create Patient</>}
        </button>
      </div>
    </div>
  );
}

function CpField({ f, value, onChange, onBlur, error, ok }: { f: Field; value: string; onChange: (v: string) => void; onBlur: () => void; error: string | null; ok: boolean }) {
  const errCls = error ? " err" : ok ? " ok" : "";
  let control: React.ReactNode;
  if (f.kind === "textarea") {
    control = <textarea className={`cp-textarea${errCls}`} value={value} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
  } else if (f.kind === "select") {
    control = (
      <select className={`cp-select${errCls}`} value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={{ color: value ? "var(--text-body)" : "var(--color-stone-400)" }}>
        <option value="" disabled>{f.placeholder}</option>
        {f.options!.map((o) => <option key={o} value={o} style={{ color: "var(--text-body)" }}>{o}</option>)}
      </select>
    );
  } else if (f.kind === "state") {
    control = <StateTypeahead value={value} onChange={onChange} error={!!error} />;
  } else if (f.kind === "date") {
    control = <input className={`cp-input${errCls}`} type="date" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />;
  } else {
    const adorn = error ? "err" : ok ? "ok" : null;
    control = (
      <div className={`cp-control${adorn ? " has-adorn" : ""}`}>
        <input className={`cp-input${errCls}`} type={f.kind === "email" ? "email" : f.kind === "tel" ? "tel" : "text"} value={value} placeholder={f.placeholder} maxLength={f.maxLength} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
        {adorn && <span className={`cp-adorn ${adorn}`}>{adorn === "ok" ? <Check size={16} /> : <CircleAlert size={16} />}</span>}
      </div>
    );
  }
  return (
    <div className={`cp-field${f.col === "full" ? " full" : ""}`}>
      <label className="cp-label">{f.label}{f.required && <span className="cp-req">*</span>}{!f.required && <span className="cp-opt">Optional</span>}</label>
      {control}
      {error ? <span className="cp-errmsg"><CircleAlert size={13} />{error}</span> : f.maxLength ? <span className="cp-hint">{(value || "").length}/{f.maxLength}</span> : null}
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
    return <>{label.slice(0, i)}<mark>{label.slice(i, i + s.length)}</mark>{label.slice(i + s.length)}</>;
  };

  return (
    <div className="cp-ta" ref={wrapRef}>
      <div className="cp-control">
        <span className="cp-ta-ic"><Search size={15} /></span>
        <input className={`cp-input${error ? " err" : ""}`} value={display} placeholder="Search state…"
          onFocus={() => { setOpen(true); setActive(0); }}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(matches.length - 1, i + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); if (matches[active]) pick(matches[active]); }
            else if (e.key === "Escape") setOpen(false);
          }} />
        {value && !open && <button className="cp-ta-clear" onClick={() => onChange("")} aria-label="Clear state"><X size={14} /></button>}
      </div>
      {open && (
        <div className="cp-ta-menu">
          {matches.length === 0 ? <div className="cp-ta-empty">No states match “{q}”</div> :
            matches.map((o, i) => (
              <button key={o.value} className={`cp-ta-opt${i === active ? " active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => pick(o)}>
                <span className="code">{o.value}</span><span>{hl(o.label)}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
