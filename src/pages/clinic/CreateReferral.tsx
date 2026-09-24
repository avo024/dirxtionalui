import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Upload, UserPlus, Users, FileText, Pill,
  Stethoscope, Shield, CheckCircle, Loader2, AlertTriangle, Search, X, Sparkles,
  Pencil, ClipboardList, FileCheck,
} from "lucide-react";
import { clinicApi, pharmacyApi, getMyClinic } from "@/lib/api";
import { mapManualFormToBackend } from "@/lib/dataMapper";
import { formatDateShort } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { DrugCombobox } from "@/components/DrugCombobox";
import { NewPatientModal } from "@/components/NewPatientModal";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/patterns/PageContainer";

type Patient = {
  id: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone_primary?: string;
  phone?: string;
  pa_status?: string;
  pa_expiration_date?: string;
  last_drug?: string;
  last_dosage?: string;
};

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  zone: "required" | "insurance" | "additional";
  tag: string;
  file?: File;
}

const STEPS = [
  { key: "patient", label: "Select Patient" },
  { key: "method", label: "Referral Method" },
  { key: "pharmacy", label: "Choose Pharmacy" },
  { key: "review", label: "Review & Submit" },
];

// Optional per-file type tags for the smart dropzone — default "Supporting document".
const FILE_TYPE_TAGS = ["Supporting document", "Referral / Prescription", "Insurance card", "Chart notes / labs", "Other"];
const TAG_TO_ZONE: Record<string, "required" | "insurance" | "additional"> = {
  "Supporting document": "additional",
  "Referral / Prescription": "required",
  "Insurance card": "insurance",
  "Chart notes / labs": "additional",
  "Other": "additional",
};

// Manual-entry field config (drives the single-scroll sections). Keys match manualData.
type FieldCfg = {
  key: string; label: string; required?: boolean; helper?: string; placeholder?: string;
  kind?: "text" | "select" | "date" | "switch" | "drug"; type?: string; maxLength?: number;
  options?: { value: string; label: string }[]; when?: (d: any) => boolean;
};

const CLINICAL_FIELDS: FieldCfg[] = [
  { key: "drugRequested", label: "Drug Requested", required: true, helper: "Search formulary or type custom", placeholder: "Search drug...", kind: "drug" },
  { key: "diagnosisCode", label: "Diagnosis ICD-10", required: true, helper: "Enter ICD-10 code and description", placeholder: "e.g., L20.9 Atopic Dermatitis" },
  { key: "therapyType", label: "Therapy Type", kind: "select", placeholder: "Select type",
    options: [{ value: "new", label: "New Therapy" }, { value: "renewal", label: "Renewal" }, { value: "step_therapy", label: "Step Therapy Exception Request" }] },
  { key: "dateTherapyInitiated", label: "Date Therapy Initiated", kind: "date", when: (d) => d.therapyType === "renewal" },
  { key: "durationOfTherapy", label: "Duration of Therapy", placeholder: "e.g., 12 months" },
  { key: "dosing", label: "Dose/Strength", placeholder: "e.g., 300mg" },
  { key: "frequency", label: "Frequency", placeholder: "e.g., Every 2 weeks" },
  { key: "quantity", label: "Quantity", placeholder: "2 syringes" },
  { key: "lengthOfTherapy", label: "Length of Therapy / #Refills", placeholder: "e.g., 26 doses" },
  { key: "administration", label: "Administration", kind: "select", placeholder: "Select method",
    options: [{ value: "oral", label: "Oral/SL" }, { value: "topical", label: "Topical" }, { value: "injection", label: "Injection" }, { value: "iv", label: "IV" }, { value: "other", label: "Other" }] },
  { key: "administrationLocation", label: "Administration Location", kind: "select", placeholder: "Select location",
    options: [{ value: "home", label: "Patient's Home" }, { value: "physician", label: "Physician's Office" }, { value: "infusion", label: "Ambulatory Infusion Center" }, { value: "ltc", label: "Long Term Care" }, { value: "home_care", label: "Home Care Agency" }, { value: "hospital", label: "Outpatient Hospital Care" }, { value: "other", label: "Other" }] },
  { key: "isRefill", label: "Refill?", kind: "switch" },
];

const PROVIDER_FIELDS: FieldCfg[] = [
  { key: "providerFirstName", label: "First Name", placeholder: "Emily" },
  { key: "providerLastName", label: "Last Name", placeholder: "Martinez" },
  { key: "specialty", label: "Specialty", placeholder: "e.g., Dermatology" },
  { key: "npi", label: "NPI", helper: "10 digits", placeholder: "1234567890", maxLength: 10 },
  { key: "deaNumber", label: "DEA Number", placeholder: "Optional" },
  { key: "providerAddress", label: "Address", placeholder: "5500 Greenville Ave" },
  { key: "providerCity", label: "City", placeholder: "Dallas" },
  { key: "providerState", label: "State", placeholder: "TX", maxLength: 2 },
  { key: "providerZip", label: "Zip Code", placeholder: "75206", maxLength: 10 },
  { key: "providerPhone", label: "Phone", placeholder: "(214) 555-0200" },
  { key: "providerFax", label: "Fax", placeholder: "(214) 555-0201" },
  { key: "providerEmail", label: "Email", placeholder: "doctor@clinic.com", type: "email" },
  { key: "officeContact", label: "Office Contact Person", placeholder: "Office contact name" },
  { key: "requestor", label: "Requestor (if different)", placeholder: "If different than prescriber" },
  { key: "signatureDate", label: "Signature Date", kind: "date" },
];

const INSURANCE_FIELDS: FieldCfg[] = [
  { key: "primaryInsuranceName", label: "Insurance company / payer", placeholder: "e.g., Blue Cross Blue Shield" },
  { key: "primaryMemberId", label: "Member ID", placeholder: "Member / Patient ID" },
  { key: "insuranceNotes", label: "Group ID", placeholder: "If issued" },
  { key: "secondaryInsuranceName", label: "Secondary Insurance Name", placeholder: "Optional" },
  { key: "secondaryMemberId", label: "Secondary Patient ID Number", placeholder: "Optional" },
  { key: "insuranceType", label: "Insurance Type", kind: "select", placeholder: "Select type",
    options: [{ value: "commercial", label: "Commercial" }, { value: "medicare", label: "Medicare" }, { value: "medicaid", label: "Medicaid" }, { value: "other", label: "Other" }] },
];

/* ── small presentational helpers (module scope so inputs keep focus) ── */
function RwField({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}{required && <span className="text-destructive ml-0.5">*</span>}</Label>
      {children}
      {helper && <span className="text-xs text-muted-foreground">{helper}</span>}
    </div>
  );
}
function NoticeStrip({ icon: Icon, tone, children }: { icon: any; tone?: "teal" | "warn"; children: React.ReactNode }) {
  return (
    <div className={cn(
      "flex items-start gap-2.5 rounded-lg border px-3.5 py-3",
      tone === "teal" ? "border-teal-600/25 bg-teal-600/5" : tone === "warn" ? "border-warning/30 bg-warning/8" : "border-border bg-muted/40",
    )}>
      <span className={cn("shrink-0 mt-0.5", tone === "teal" ? "text-teal-700" : tone === "warn" ? "text-warning" : "text-muted-foreground")}>
        <Icon width={18} height={18} strokeWidth={1.75} />
      </span>
      <p className="text-sm text-foreground m-0">{children}</p>
    </div>
  );
}
function ManualField({ field, data, setField }: { field: FieldCfg; data: any; setField: (k: string, v: any) => void }) {
  if (field.when && !field.when(data)) return null;
  const v = data[field.key];
  if (field.kind === "switch") {
    return (
      <RwField label={field.label}>
        <div className="flex items-center gap-2.5 h-10">
          <Switch checked={!!v} onCheckedChange={(val) => setField(field.key, val)} />
          <span className="text-sm text-muted-foreground">{v ? "Yes" : "No"}</span>
        </div>
      </RwField>
    );
  }
  if (field.kind === "drug") {
    return (
      <RwField label={field.label} required={field.required} helper={field.helper}>
        <DrugCombobox value={v || ""} onChange={(val) => setField(field.key, val)} fetchDrugs={clinicApi.getFormularyDrugs} placeholder={field.placeholder} />
      </RwField>
    );
  }
  if (field.kind === "select") {
    return (
      <RwField label={field.label} required={field.required} helper={field.helper}>
        <Select value={v || undefined} onValueChange={(val) => setField(field.key, val)}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || "Select"} /></SelectTrigger>
          <SelectContent>
            {field.options!.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </RwField>
    );
  }
  if (field.kind === "date") {
    return (
      <RwField label={field.label} required={field.required} helper={field.helper}>
        <Input type="date" value={v || ""} onChange={(e) => setField(field.key, e.target.value)} />
      </RwField>
    );
  }
  return (
    <RwField label={field.label} required={field.required} helper={field.helper}>
      <Input type={field.type || "text"} value={v || ""} maxLength={field.maxLength}
        placeholder={field.placeholder} onChange={(e) => setField(field.key, e.target.value)} />
    </RwField>
  );
}

export default function CreateReferral() {
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");

  const [currentStep, setCurrentStep] = useState(preselectedPatientId ? 1 : 0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientMode, setPatientMode] = useState<"existing" | "new" | null>(preselectedPatientId ? "existing" : "existing");
  const [patientSearch, setPatientSearch] = useState("");
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatient] = useState({
    firstName: "", lastName: "", dob: "", phone: "",
    email: "", gender: "", address: "", city: "", state: "", zip: "",
    mi: "", height: "", weight: "", allergies: "",
    authorizedRepresentative: "", authorizedRepresentativePhone: "",
  });

  useEffect(() => {
    if (!preselectedPatientId) return;
    clinicApi.getPatient(preselectedPatientId)
      .then((data) => { setSelectedPatient(data); setPatientMode("existing"); })
      .catch(() => toast({ title: "Error", description: "Failed to load patient", variant: "destructive" }));
  }, [preselectedPatientId]);

  const [referralMethod, setReferralMethod] = useState<"upload" | "manual" | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isPacket, setIsPacket] = useState(false);

  const [manualData, setManualData] = useState({
    diagnosisCode: "", drugRequested: "", dosing: "", quantity: "",
    isRefill: false, therapyType: "new", dateTherapyInitiated: "", durationOfTherapy: "",
    frequency: "", lengthOfTherapy: "", administration: "", administrationLocation: "",
    providerFirstName: "", providerLastName: "", providerName: "", npi: "", deaNumber: "",
    specialty: "", providerPhone: "", providerFax: "", providerEmail: "",
    providerAddress: "", providerCity: "", providerState: "", providerZip: "",
    officeContact: "", requestor: "",
    signatureDate: new Date().toISOString().split("T")[0],
    hasInsurance: true, insuranceType: "", insuranceNotes: "",
    primaryInsuranceName: "", primaryMemberId: "",
    secondaryInsuranceName: "", secondaryMemberId: "",
  });

  const [insuranceChoice, setInsuranceChoice] = useState<"has" | "bridge" | null>(null);
  const isBridgeProgram = insuranceChoice === "bridge";
  const [showSubmitErrors, setShowSubmitErrors] = useState(false);

  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);
  const [defaultPharmacyId, setDefaultPharmacyId] = useState<string | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingPharmacies(true);
    Promise.all([
      pharmacyApi.getPharmacies().catch(() => ({ items: [] as any[] })),
      getMyClinic().catch(() => null),
    ])
      .then(([phRes, clinic]) => {
        const items = (phRes as any)?.items || (phRes as any) || [];
        setPharmacies(items);
        if (clinic?.default_pharmacy_id) {
          setDefaultPharmacyId(clinic.default_pharmacy_id);
          setSelectedPharmacyId((prev) => prev ?? clinic.default_pharmacy_id ?? null);
        }
      })
      .finally(() => setLoadingPharmacies(false));
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  const navigate = useNavigate();

  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!patientSearch.trim()) { setFilteredPatients([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      clinicApi.getPatients(patientSearch)
        .then((data) => setFilteredPatients((data.items || []).slice(0, 5)))
        .catch(() => setFilteredPatients([]));
    }, 300);
  }, [patientSearch]);

  const setField = useCallback((key: string, value: any) => setManualData((d) => ({ ...d, [key]: value })), []);

  const handleRealFileUpload = (file: File) => {
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/tiff"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PDF, JPG, PNG, or TIFF", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10 MB", variant: "destructive" });
      return;
    }
    const newFile: UploadedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      zone: "additional",
      tag: "Supporting document",
      file,
    };
    setUploadedFiles((prev) => [...prev, newFile]);
  };
  const removeFile = (id: string) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  const setFileTag = (id: string, tag: string) =>
    setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, tag, zone: TAG_TO_ZONE[tag] || "additional" } : f)));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let patientId = selectedPatient?.id;
      if (patientMode === "new") {
        const created = await clinicApi.createPatient({
          full_name: `${newPatient.firstName} ${newPatient.lastName}`.trim(),
          dob: newPatient.dob, phone_primary: newPatient.phone, email: newPatient.email,
          gender: newPatient.gender, address: newPatient.address, city: newPatient.city,
          state: newPatient.state, zip: newPatient.zip, mi: newPatient.mi,
          height: newPatient.height, weight: newPatient.weight, allergies: newPatient.allergies,
          authorized_representative: newPatient.authorizedRepresentative,
          authorized_representative_phone: newPatient.authorizedRepresentativePhone,
        });
        patientId = created.id;
      }

      const referralPayload: any = {
        patient_id: patientId,
        referral_method: referralMethod,
        urgency: "routine",
        is_bridge_program: isBridgeProgram,
        insurance_not_provided: insuranceChoice === "bridge",
        ...(selectedPharmacyId ? { target_pharmacy_id: selectedPharmacyId } : {}),
      };

      const patientSection = patientMode === "new" ? {
        first_name: newPatient.firstName, last_name: newPatient.lastName, mi: newPatient.mi || "",
        dob: newPatient.dob, gender: newPatient.gender, phone: newPatient.phone, email: newPatient.email || "",
        address: newPatient.address, city: newPatient.city, state: newPatient.state, zip: newPatient.zip,
        height: newPatient.height || "", weight: newPatient.weight || "", allergies: newPatient.allergies || "",
        authorized_representative: newPatient.authorizedRepresentative || "",
        authorized_representative_phone: newPatient.authorizedRepresentativePhone || "",
      } : {
        first_name: selectedPatient?.full_name?.split(" ")[0] || "",
        last_name: selectedPatient?.full_name?.split(" ").slice(1).join(" ") || "",
        dob: selectedPatient?.dob || "",
        phone: selectedPatient?.phone_primary || selectedPatient?.phone || "",
      };

      if (referralMethod === "manual") {
        const mapped = mapManualFormToBackend(manualData);
        referralPayload.extracted_data = { ...mapped, patient: { ...((mapped as any).patient || {}), ...patientSection } };
        referralPayload.drug_requested = manualData.drugRequested;
      } else {
        referralPayload.extracted_data = { patient: patientSection };
        referralPayload.drug_requested = "";
      }

      const referral = await clinicApi.createReferral(referralPayload);

      // A failed upload must never be silent — the referral would sit in the
      // admin queue missing documents with no signal to anyone.
      const failedUploads: string[] = [];
      let succeededUploads = 0;
      if (uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          if (f.file) {
            const docType = isPacket ? "packet" : (f.zone || "additional");
            try {
              await clinicApi.uploadDocument(referral.id, f.file, docType);
              succeededUploads++;
            } catch (err) {
              console.error("File upload failed:", err);
              failedUploads.push(f.file.name);
            }
          }
        }
      }
      if (failedUploads.length > 0) {
        toast({
          title: `${failedUploads.length} document${failedUploads.length === 1 ? "" : "s"} failed to upload`,
          description: `${failedUploads.join(", ")} — open this referral from your dashboard to attach ${failedUploads.length === 1 ? "it" : "them"}.`,
          variant: "destructive",
          duration: 12000,
        });
      }

      // Only kick off AI extraction if at least one document made it up (or
      // none were expected). With zero documents there is nothing to extract.
      if (succeededUploads > 0 || failedUploads.length === 0) {
        try {
          await clinicApi.finalizeReferral(referral.id);
        } catch (err) {
          console.warn("Finalize call failed (admin can retry manually):", err);
          toast({ title: "Referral submitted, but processing didn't start", description: "Our team will pick it up — no action needed unless they reach out.", duration: 9000 });
        }
      }

      setSubmitting(false);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitting(false);
      toast({ title: "Submission Failed", description: err.message || "Failed to create referral. Please try again.", variant: "destructive" });
    }
  };

  const getPatientName = (p: Patient) => p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim();
  const getPatientPhone = (p: Patient) => p.phone_primary || p.phone || "—";

  const canProceedStep1 = !!selectedPatient;
  const insuranceSectionValid = insuranceChoice !== null;
  const canProceedStep2 = (() => {
    if (!insuranceSectionValid) return false;
    if (referralMethod === "upload") return uploadedFiles.length > 0;
    return !!manualData.diagnosisCode && !!manualData.drugRequested;
  })();
  const canProceedStep3 = !!selectedPharmacyId;
  const selectedPharmacy = useMemo(() => pharmacies.find((p: any) => p.id === selectedPharmacyId) || null, [pharmacies, selectedPharmacyId]);

  const progress = Math.round(((currentStep + 1) / STEPS.length) * 100);

  const goBack = () => {
    if (currentStep === 0) { navigate("/clinic/referrals"); return; }
    if (currentStep === 1 && referralMethod) { setReferralMethod(null); return; }
    setCurrentStep(currentStep - 1);
  };
  const goNext = () => {
    if (currentStep === 1 && referralMethod) {
      if (!canProceedStep2) { setShowSubmitErrors(true); return; }
      setCurrentStep(2); return;
    }
    if (currentStep === 0 && canProceedStep1) { setCurrentStep(1); return; }
    if (currentStep === 2 && canProceedStep3) { setCurrentStep(3); return; }
  };

  // ── SUCCESS ──
  if (submitted) {
    return (
      <PageContainer fade={false}>
        <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 flex flex-col items-center gap-3 text-center py-10 max-w-lg mx-auto">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"><CheckCircle width={34} height={34} strokeWidth={1.75} /></span>
          <h1 className="text-2xl font-semibold text-foreground">We'll Take It From Here!</h1>
          <p className="text-sm text-muted-foreground">Referral submitted successfully! Our AI is extracting the details now and our team will review within the hour.</p>
          <div className="font-mono text-sm font-semibold rounded-md bg-muted px-3 py-1.5 text-foreground">REF-{String(Math.floor(Math.random() * 900000) + 100000)}</div>
          <div className="flex items-center gap-2 mt-2">
            <Button onClick={() => navigate("/clinic/dashboard")}>Back to Dashboard</Button>
            <Button variant="outline" onClick={() => navigate("/clinic/referrals")}>View Referrals</Button>
            <Button variant="outline" onClick={() => {
              setSelectedPatient(null); setReferralMethod(null); setUploadedFiles([]); setIsPacket(false);
              setInsuranceChoice(null); setConfirmAccuracy(false);
              setSelectedPharmacyId(defaultPharmacyId); setCurrentStep(0); setSubmitted(false);
            }}>Create Another</Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ── Summary rail rows ──
  const insuranceSummary = insuranceChoice === "bridge" ? "Bridge program"
    : insuranceChoice === "has" ? (manualData.primaryInsuranceName || "Standard insurance") : null;
  const summaryRows = [
    { icon: Users, k: "Patient", v: selectedPatient ? getPatientName(selectedPatient) : null },
    { icon: Upload, k: "Method", v: referralMethod === "upload" ? "Upload documents" : referralMethod === "manual" ? "Manual entry" : null },
    { icon: FileText, k: "Documents", v: uploadedFiles.length ? `${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}` : (referralMethod === "manual" ? "Manual entry" : null) },
    { icon: Shield, k: "Insurance", v: insuranceSummary },
    { icon: Pill, k: "Pharmacy", v: selectedPharmacy?.name || null },
  ];

  return (
    <PageContainer fade={false}>
      {/* Bar A — header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">New Referral</h1>
        <p className="text-sm text-muted-foreground mt-1">Quick 4-step process to submit a referral</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 mt-5">
        <div>
          {/* Bar B — progress + segmented stepper */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-foreground">Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}</span>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          <div className="flex items-stretch gap-1 mt-4" data-tour="wizard-steps">
            {STEPS.map((s, i) => {
              const done = i < currentStep, current = i === currentStep;
              return (
                <button
                  key={s.key}
                  type="button"
                  className={cn(
                    "flex-1 flex flex-col gap-1.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    current ? "bg-primary/8" : "hover:bg-muted",
                    !done && !current && "cursor-not-allowed opacity-60",
                  )}
                  onClick={() => done && setCurrentStep(i)}
                  disabled={!done && !current}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      done ? "bg-success text-success-foreground" : current ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}>
                      {done ? <Check width={12} height={12} strokeWidth={2} /> : `0${i + 1}`}
                    </span>
                    <span className={cn("text-xs font-semibold", current || done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                  </span>
                  <span className="h-1 rounded-full bg-muted overflow-hidden">
                    {(done || current) && <span className="block h-full bg-primary" style={{ width: current ? "40%" : "100%" }} />}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bar C — sticky patient banner */}
          {selectedPatient && currentStep > 0 && (
            <div className="sticky top-0 z-10 flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5 mt-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users width={17} height={17} strokeWidth={1.75} /></span>
              <div>
                <div className="text-sm font-semibold text-foreground">{getPatientName(selectedPatient)}</div>
                <div className="text-xs text-muted-foreground">DOB: {formatDateShort(selectedPatient.dob || "")} · {getPatientPhone(selectedPatient)}</div>
              </div>
            </div>
          )}

          {/* Card content */}
          <div className="bg-card border border-border rounded-lg p-5 mt-4" data-tour="wizard-body">
            {currentStep === 0 && (
              <Step1Patient
                search={patientSearch} setSearch={setPatientSearch} results={filteredPatients}
                selected={selectedPatient} onSelect={(p: Patient) => { setSelectedPatient(p); setPatientMode("existing"); setPatientSearch(""); if (p.last_drug) setManualData((d) => ({ ...d, drugRequested: p.last_drug || "" })); }}
                onClear={() => setSelectedPatient(null)} onAddNew={() => setShowNewPatientModal(true)}
                getName={getPatientName} getPhone={getPatientPhone}
              />
            )}

            {currentStep === 1 && !referralMethod && <MethodFork onPick={setReferralMethod} />}

            {currentStep === 1 && referralMethod === "upload" && (
              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 flex flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2 of 4</p>
                  <h2 className="text-lg font-semibold text-foreground mt-1">Upload Documents</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Upload all relevant documents for this referral</p>
                </div>
                <SmartDropzone files={uploadedFiles} onFiles={(fl: File[]) => fl.forEach(handleRealFileUpload)} removeFile={removeFile} setTag={setFileTag} isPacket={isPacket} setPacket={setIsPacket} />
                <BridgeBlock choice={insuranceChoice} onChange={setInsuranceChoice} showErrors={showSubmitErrors} />
                <NoticeStrip icon={Sparkles} tone="teal">Our AI will automatically extract patient info, provider details, drug information, and more from your documents.</NoticeStrip>
                <NoticeStrip icon={CheckCircle}>Our team will handle the PA and process</NoticeStrip>
              </div>
            )}

            {currentStep === 1 && referralMethod === "manual" && (
              <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 flex flex-col gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2 of 4</p>
                  <h2 className="text-lg font-semibold text-foreground mt-1">Enter Referral Information</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below</p>
                </div>
                <ManualScroll
                  data={manualData} setField={setField}
                  choice={insuranceChoice} setChoice={(c: "has" | "bridge") => { setInsuranceChoice(c); setManualData((d) => ({ ...d, hasInsurance: c === "has" })); }}
                  showErrors={showSubmitErrors}
                />
                <NoticeStrip icon={CheckCircle}>Our team will handle the PA and process</NoticeStrip>
              </div>
            )}

            {currentStep === 2 && (
              <Step3Pharmacy
                loading={loadingPharmacies} pharmacies={pharmacies}
                selectedId={selectedPharmacyId} defaultId={defaultPharmacyId}
                onSelect={setSelectedPharmacyId} selected={selectedPharmacy}
              />
            )}

            {currentStep === 3 && (
              <Step4Review
                patient={selectedPatient} getName={getPatientName} pharmacy={selectedPharmacy}
                isDefault={!!defaultPharmacyId && selectedPharmacyId === defaultPharmacyId}
                method={referralMethod} choice={insuranceChoice} files={uploadedFiles} manualData={manualData}
                confirm={confirmAccuracy} setConfirm={setConfirmAccuracy}
              />
            )}
          </div>

          {/* Bar D — footer */}
          <div className="flex items-center justify-between mt-4" data-tour="wizard-next">
            <Button variant="outline" onClick={goBack}><ArrowLeft width={15} height={15} strokeWidth={1.75} />{currentStep === 0 ? "Cancel" : "Back"}</Button>
            {currentStep === 0 && <Button onClick={goNext} disabled={!canProceedStep1}>Next: Referral Method<ArrowRight width={15} height={15} strokeWidth={1.75} /></Button>}
            {currentStep === 1 && referralMethod && <Button onClick={goNext} disabled={!canProceedStep2}>Next: Choose Pharmacy<ArrowRight width={15} height={15} strokeWidth={1.75} /></Button>}
            {currentStep === 2 && <Button onClick={goNext} disabled={!canProceedStep3}>Continue to Review<ArrowRight width={15} height={15} strokeWidth={1.75} /></Button>}
            {currentStep === 3 && (
              <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={handleSubmit} disabled={!confirmAccuracy || submitting}>
                {submitting ? <><Loader2 width={15} height={15} strokeWidth={1.75} className="animate-spin" />Submitting…</> : <><Check width={15} height={15} strokeWidth={1.75} />Submit Referral</>}
              </Button>
            )}
          </div>
        </div>

        {/* Live summary rail */}
        <aside>
          <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Referral summary</h3>
              <ClipboardList width={16} height={16} strokeWidth={1.75} className="text-muted-foreground" />
            </div>
            <div className="p-2">
              {summaryRows.map((r) => (
                <div className="flex items-start gap-2.5 px-2 py-2" key={r.k}>
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    r.v ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}>
                    {r.v ? <Check width={14} height={14} strokeWidth={1.75} /> : <r.icon width={14} height={14} strokeWidth={1.75} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{r.k}</div>
                    <div className={cn("text-sm font-medium truncate", r.v ? "text-foreground" : "text-muted-foreground")}>{r.v || "Not yet"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <NewPatientModal
        open={showNewPatientModal}
        onOpenChange={setShowNewPatientModal}
        onCreated={(patient: any) => { setSelectedPatient(patient); setPatientMode("existing"); setPatientSearch(""); }}
      />
    </PageContainer>
  );
}

/* ── Step 1 ── */
function Step1Patient({ search, setSearch, results, selected, onSelect, onClear, onAddNew, getName, getPhone }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 1 of 4</p>
        <h2 className="text-lg font-semibold text-foreground mt-1">Select Patient</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Search for an existing patient or add a new one</p>
      </div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="relative flex-1">
          <Search width={16} height={16} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, DOB, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" onClick={onAddNew}><UserPlus width={15} height={15} strokeWidth={1.75} />Add New Patient</Button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {results.map((p: Patient) => (
            <button key={p.id} type="button" className="text-left rounded-md border border-border px-3.5 py-2.5 hover:bg-muted/50 transition-colors" onClick={() => onSelect(p)}>
              <div className="text-sm font-semibold text-foreground">{getName(p)}</div>
              <div className="text-xs text-muted-foreground">DOB: {formatDateShort(p.dob || "")} · Last: <b className="font-semibold">{p.last_drug || "—"}</b></div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Users width={17} height={17} strokeWidth={1.75} /></span>
              <span className="text-sm font-semibold text-foreground">{getName(selected)}</span>
            </div>
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={onClear} aria-label="Clear selected patient"><X width={16} height={16} strokeWidth={1.75} /></button>
          </div>
          <div className="text-xs text-muted-foreground">DOB: {formatDateShort(selected.dob || "")} · Phone: {getPhone(selected)}</div>
          <div className="flex items-center gap-1.5">
            <Pill width={13} height={13} strokeWidth={1.75} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Last drug: {selected.last_drug || "—"} {selected.last_dosage || ""}</span>
          </div>
          <PAStatusBadge status={(selected.pa_status as any) || "none"} expirationDate={selected.pa_expiration_date} />
        </div>
      )}

      {!selected && !search && (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><Users width={28} height={28} strokeWidth={1.75} /></span>
          <p className="text-sm text-muted-foreground m-0">Search above or add a new patient to continue</p>
        </div>
      )}
    </div>
  );
}

/* ── Step 2 — method fork ── */
function MethodFork({ onPick }: { onPick: (m: "upload" | "manual") => void }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 2 of 4</p>
        <h2 className="text-lg font-semibold text-foreground mt-1">How would you like to create this referral?</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Choose your preferred method</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button type="button" className="flex flex-col items-start gap-2 rounded-lg border border-border p-5 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors" onClick={() => onPick("upload")}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Upload width={22} height={22} strokeWidth={1.75} /></span>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">Upload Documents</h3>
            <span className="inline-flex items-center rounded-full bg-success/15 text-success px-2 py-0.5 text-[10px] font-bold">Recommended</span>
          </div>
          <p className="text-sm text-muted-foreground">Our AI will extract all information from your documents</p>
          <ul className="flex flex-col gap-1.5 mt-1">
            {["Faster (AI does the work)", "More accurate", "Less typing"].map((c) => (
              <li key={c} className="flex items-center gap-1.5 text-sm text-foreground">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Check width={11} height={11} strokeWidth={2} /></span>{c}
              </li>
            ))}
          </ul>
        </button>
        <button type="button" className="flex flex-col items-start gap-2 rounded-lg border border-border p-5 text-left hover:border-primary/40 hover:bg-muted/40 transition-colors" onClick={() => onPick("manual")}>
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-foreground"><Pencil width={22} height={22} strokeWidth={1.75} /></span>
          <h3 className="text-base font-semibold text-foreground">Manual Entry</h3>
          <p className="text-sm text-muted-foreground">Type in the information yourself</p>
          <p className="text-sm text-muted-foreground italic">Use this if you don't have documents ready</p>
        </button>
      </div>
    </div>
  );
}

/* ── Smart dropzone ── */
function SmartDropzone({ files, onFiles, removeFile, setTag, isPacket, setPacket }: any) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ""; }} />
      <div
        className={cn(
          "flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors",
          drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30",
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files)); }}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Upload width={22} height={22} strokeWidth={1.75} /></span>
        <div className="text-sm font-semibold text-foreground">Choose files or drag &amp; drop</div>
        <div className="text-xs text-muted-foreground max-w-sm">Referral form, insurance cards, chart notes, labs — drop them all here. PDF, JPG, PNG.</div>
      </div>

      <label
        className={cn(
          "flex items-start gap-2.5 rounded-lg border px-3.5 py-3 mt-3 cursor-pointer transition-colors",
          isPacket ? "border-primary/40 bg-primary/5" : "border-border hover:bg-muted/30",
        )}
        onClick={(e) => { e.preventDefault(); setPacket(!isPacket); }}
      >
        <span className={cn(
          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border mt-0.5",
          isPacket ? "bg-primary border-primary text-primary-foreground" : "border-input",
        )}>
          {isPacket && <Check width={12} height={12} strokeWidth={2} />}
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">This is one combined packet</div>
          <div className="text-xs text-muted-foreground">Everything is in a single multi-page file — we'll treat it as one packet.</div>
        </div>
      </label>

      {files.length > 0 && (
        <div className="flex flex-col gap-2 mt-3">
          {files.map((f: UploadedFile) => (
            <div className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2" key={f.id}>
              <span className="text-success shrink-0"><FileCheck width={17} height={17} strokeWidth={1.75} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">{f.name}</div>
                <div className="text-xs text-muted-foreground">{f.size}</div>
              </div>
              {!isPacket && (
                <Select value={f.tag} onValueChange={(v) => setTag(f.id, v)}>
                  <SelectTrigger className="h-8 w-[190px] text-xs shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILE_TYPE_TAGS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <button type="button" className="text-muted-foreground hover:text-foreground shrink-0" onClick={() => removeFile(f.id)} aria-label="Remove file"><X width={16} height={16} strokeWidth={1.75} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Bridge block ── */
function BridgeBlock({ choice, onChange, showErrors }: { choice: "has" | "bridge" | null; onChange: (c: "has" | "bridge") => void; showErrors: boolean }) {
  const missing = showErrors && choice == null;
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <Shield width={16} height={16} strokeWidth={1.75} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Bridge program? <span className="text-destructive">*</span></h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">Is this referral being routed through a manufacturer-funded bridge program (e.g., Dupixent MyWay, Humira Complete)?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label
          className={cn(
            "flex items-start gap-2.5 rounded-lg border p-3.5 cursor-pointer transition-colors",
            choice === "has" ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/30",
          )}
          onClick={(e) => { e.preventDefault(); onChange("has"); }}
        >
          <span className={cn("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border mt-0.5", choice === "has" ? "border-primary" : "border-input")}>
            {choice === "has" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </span>
          <div><div className="text-sm font-semibold text-foreground">No bridge program</div><div className="text-xs text-muted-foreground">Standard insurance billing</div></div>
        </label>
        <label
          className={cn(
            "flex items-start gap-2.5 rounded-lg border p-3.5 cursor-pointer transition-colors",
            choice === "bridge" ? "border-primary/50 bg-primary/5" : "border-border hover:bg-muted/30",
          )}
          onClick={(e) => { e.preventDefault(); onChange("bridge"); }}
        >
          <span className={cn("flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border mt-0.5", choice === "bridge" ? "border-primary" : "border-input")}>
            {choice === "bridge" && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </span>
          <div><div className="text-sm font-semibold text-foreground">Yes, bridge program</div><div className="text-xs text-muted-foreground">Manufacturer-funded — insurance not used</div></div>
        </label>
      </div>
      {missing && <p className="text-xs text-destructive mt-2.5">Please choose an option to continue.</p>}
    </div>
  );
}

/* ── Manual single-scroll ── */
function ManualScroll({ data, setField, choice, setChoice, showErrors }: any) {
  const sections = [
    { key: "clinical", title: "Medication / Medical Information", icon: Pill, fields: CLINICAL_FIELDS },
    { key: "provider", title: "Prescriber Information", icon: Stethoscope, fields: PROVIDER_FIELDS },
  ];
  return (
    <div className="flex flex-col gap-6">
      {sections.map((s) => (
        <div key={s.key}>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><s.icon width={16} height={16} strokeWidth={1.75} /></span>
            <h3 className="text-sm font-semibold text-foreground">{s.title}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {s.fields.map((f) => <ManualField key={f.key} field={f} data={data} setField={setField} />)}
          </div>
        </div>
      ))}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><Shield width={16} height={16} strokeWidth={1.75} /></span>
          <h3 className="text-sm font-semibold text-foreground">Insurance Information<span className="text-destructive ml-0.5">*</span></h3>
        </div>
        <div className="flex flex-col gap-4">
          <BridgeBlock choice={choice} onChange={setChoice} showErrors={showErrors} />
          {choice === "has" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              {INSURANCE_FIELDS.map((f) => <ManualField key={f.key} field={f} data={data} setField={setField} />)}
            </div>
          )}
          {choice === "bridge" && <div className="rounded-md bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">Bridge program — manufacturer-funded. No insurance fields needed.</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Step 3 — pharmacy dropdown ── */
function Step3Pharmacy({ loading, pharmacies, selectedId, defaultId, onSelect, selected }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 3 of 4</p>
        <h2 className="text-lg font-semibold text-foreground mt-1">Select pharmacy for this referral</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Defaults to your clinic's preferred pharmacy. Change if this referral needs a different one.</p>
      </div>

      {!loading && !defaultId && (
        <NoticeStrip icon={AlertTriangle} tone="warn">Your clinic doesn't have a default pharmacy set. Pick one for this referral.</NoticeStrip>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-muted-foreground" /></div>
      ) : pharmacies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center"><p className="text-sm text-muted-foreground m-0">No pharmacies available for your clinic. Contact Dirxctional support.</p></div>
      ) : (
        <>
          <RwField label="Pharmacy">
            <Select value={selectedId || undefined} onValueChange={onSelect}>
              <SelectTrigger><SelectValue placeholder="Select a pharmacy…" /></SelectTrigger>
              <SelectContent>
                {pharmacies.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}{p.id === defaultId ? " (Default)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </RwField>
          {selected && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><Pill width={15} height={15} strokeWidth={1.75} /></span>
                <h3 className="text-sm font-semibold text-foreground">{selected.name}</h3>
                {defaultId && selectedId === defaultId && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">Default</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {[selected.address, [selected.city, selected.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                {selected.phone && <div className="font-mono text-xs mt-0.5">{selected.phone}</div>}
              </div>
            </div>
          )}
          {defaultId && selectedId === defaultId && <p className="text-xs text-muted-foreground">Default pharmacy for your clinic — change if needed.</p>}
        </>
      )}
    </div>
  );
}

/* ── Step 4 — review ── */
function ReviewCard({ icon: Icon, title, action, children }: any) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><Icon width={15} height={15} strokeWidth={1.75} /></span>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}
function ReviewField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}
function Step4Review({ patient, getName, pharmacy, isDefault, method, choice, files, manualData, confirm, setConfirm }: any) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Step 4 of 4</p>
        <h2 className="text-lg font-semibold text-foreground mt-1">Submit Referral</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Confirm and submit your referral for processing</p>
      </div>

      <ReviewCard icon={Users} title="Patient Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReviewField label="Name" value={patient ? getName(patient) : "—"} />
          <ReviewField label="DOB" value={patient?.dob ? formatDateShort(patient.dob) : "—"} />
        </div>
      </ReviewCard>

      <ReviewCard icon={Pill} title="Pharmacy" action={isDefault ? <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">Default</span> : null}>
        <div className="text-sm font-medium text-foreground">{pharmacy?.name || "—"}</div>
        {pharmacy && <div className="text-xs text-muted-foreground mt-0.5">{[pharmacy.city, pharmacy.state].filter(Boolean).join(", ")}</div>}
      </ReviewCard>

      <ReviewCard icon={Shield} title="Insurance">
        {choice === "bridge" ? (
          <div className="text-sm text-foreground">Bridge program — manufacturer-funded</div>
        ) : method === "upload" ? (
          <div className="text-sm text-muted-foreground">Insurance details will be extracted from your uploaded documents.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReviewField label="Payer" value={manualData.primaryInsuranceName} />
            <ReviewField label="Member ID" value={manualData.primaryMemberId} />
          </div>
        )}
      </ReviewCard>

      {files.length > 0 && (
        <ReviewCard icon={FileText} title="Documents Uploaded">
          <div className="flex flex-col gap-1.5">
            {files.map((f: UploadedFile) => (
              <div key={f.id} className="flex items-center gap-2 text-sm">
                <span className="text-success shrink-0"><CheckCircle width={15} height={15} strokeWidth={1.75} /></span>
                <span className="text-foreground">{f.name}</span>
                <span className="text-muted-foreground">({f.size})</span>
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      <NoticeStrip icon={Sparkles} tone="teal">Our AI will automatically extract patient info, provider details, drug information, and more from your documents.</NoticeStrip>
      <NoticeStrip icon={Shield}>Our team will handle the prior authorization process.</NoticeStrip>

      <label className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 p-3.5 cursor-pointer" onClick={(e) => { e.preventDefault(); setConfirm(!confirm); }}>
        <span className={cn(
          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border mt-0.5",
          confirm ? "bg-primary border-primary text-primary-foreground" : "border-input",
        )}>
          {confirm && <Check width={12} height={12} strokeWidth={2} />}
        </span>
        <span className="text-sm text-foreground">I confirm all information is accurate and complete.</span>
      </label>
    </div>
  );
}
