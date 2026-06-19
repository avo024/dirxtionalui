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
import "./wizard.css";

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
function Btn({ variant = "outline", sm, children, ...rest }: any) {
  return <button className={`rw-btn ${variant}${sm ? " sm" : ""}`} {...rest}>{children}</button>;
}
function RwField({ label, required, helper, children }: { label: string; required?: boolean; helper?: string; children: React.ReactNode }) {
  return (
    <div className="rw-field">
      <label className="rw-label">{label}{required && <span className="rw-req">*</span>}</label>
      {children}
      {helper && <span className="rw-hint">{helper}</span>}
    </div>
  );
}
function NoticeStrip({ icon: Icon, tone, children }: { icon: any; tone?: "teal" | "warn"; children: React.ReactNode }) {
  return (
    <div className={`rw-strip${tone ? " " + tone : ""}`}>
      <span className="si"><Icon size={18} /></span>
      <p>{children}</p>
    </div>
  );
}
function ManualField({ field, data, setField }: { field: FieldCfg; data: any; setField: (k: string, v: any) => void }) {
  if (field.when && !field.when(data)) return null;
  const v = data[field.key];
  if (field.kind === "switch") {
    return (
      <RwField label={field.label}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, height: 40 }}>
          <button type="button" className={`rw-switch${v ? " on" : ""}`} onClick={() => setField(field.key, !v)} aria-pressed={!!v}><i /></button>
          <span style={{ fontSize: ".875rem", color: "var(--text-muted)" }}>{v ? "Yes" : "No"}</span>
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
        <select className="rw-select" value={v || ""} onChange={(e) => setField(field.key, e.target.value)}>
          <option value="" disabled>{field.placeholder || "Select"}</option>
          {field.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </RwField>
    );
  }
  if (field.kind === "date") {
    return (
      <RwField label={field.label} required={field.required} helper={field.helper}>
        <input className="rw-input" type="date" value={v || ""} onChange={(e) => setField(field.key, e.target.value)} />
      </RwField>
    );
  }
  return (
    <RwField label={field.label} required={field.required} helper={field.helper}>
      <input className="rw-input" type={field.type || "text"} value={v || ""} maxLength={field.maxLength}
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
  const [noDocsConfirmed, setNoDocsConfirmed] = useState(false);

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

      if (uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          if (f.file) {
            const docType = isPacket ? "packet" : (f.zone || "additional");
            try {
              await clinicApi.uploadDocument(referral.id, f.file, docType);
            } catch (err) {
              console.error("File upload failed:", err);
            }
          }
        }
      }

      try {
        await clinicApi.finalizeReferral(referral.id);
      } catch (err) {
        console.warn("Finalize call failed (admin can retry manually):", err);
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
    if (referralMethod === "upload") return uploadedFiles.length > 0 || noDocsConfirmed;
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
      <div className="rw-page">
        <div className="rw-success rw-fade">
          <div className="sc"><CheckCircle size={34} /></div>
          <h1>We'll Take It From Here!</h1>
          <p>Referral submitted successfully! Our AI is extracting the details now and our team will review within the hour.</p>
          <div className="rw-refchip">REF-{String(Math.floor(Math.random() * 900000) + 100000)}</div>
          <div className="rw-success-actions">
            <Btn variant="primary" onClick={() => navigate("/clinic/dashboard")}>Back to Dashboard</Btn>
            <Btn variant="outline" onClick={() => navigate("/clinic/referrals")}>View Referrals</Btn>
            <Btn variant="outline" onClick={() => {
              setSelectedPatient(null); setReferralMethod(null); setUploadedFiles([]); setIsPacket(false);
              setNoDocsConfirmed(false); setInsuranceChoice(null); setConfirmAccuracy(false);
              setSelectedPharmacyId(defaultPharmacyId); setCurrentStep(0); setSubmitted(false);
            }}>Create Another</Btn>
          </div>
        </div>
      </div>
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
    <div className="rw-page">
      {/* Bar A — header */}
      <div>
        <h1 className="rw-h1">New Referral</h1>
        <p className="rw-sub">Quick 4-step process to submit a referral</p>
      </div>

      <div className="rw-wrap two-col">
        <div>
          {/* Bar B — progress + segmented stepper */}
          <div className="rw-mt">
            <div className="rw-progress-head">
              <span className="rw-progress-lbl">Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].label}</span>
              <span className="rw-progress-pct">{progress}%</span>
            </div>
            <div className="rw-track"><i style={{ width: progress + "%" }} /></div>
          </div>
          <div className="rw-seg">
            {STEPS.map((s, i) => {
              const done = i < currentStep, current = i === currentStep;
              return (
                <button key={s.key} type="button" className={`${done ? "done" : ""}${current ? " current" : ""}`}
                  onClick={() => done && setCurrentStep(i)} disabled={!done && !current}>
                  <span className="k">{done ? <Check size={12} /> : `0${i + 1}`}</span>
                  <span className="l">{s.label}</span>
                  {(done || current) && <span className="bar" style={{ width: current ? "40%" : "100%" }} />}
                </button>
              );
            })}
          </div>

          {/* Bar C — sticky patient banner */}
          {selectedPatient && currentStep > 0 && (
            <div className="rw-banner sticky">
              <span className="rw-ava-ic"><Users size={17} /></span>
              <div>
                <div className="nm">{getPatientName(selectedPatient)}</div>
                <div className="meta">DOB: {formatDateShort(selectedPatient.dob || "")} · {getPatientPhone(selectedPatient)}</div>
              </div>
            </div>
          )}

          {/* Card content */}
          <div className="rw-card">
            {currentStep === 0 && (
              <Step1Patient
                search={patientSearch} setSearch={setPatientSearch} results={filteredPatients}
                selected={selectedPatient} onSelect={(p) => { setSelectedPatient(p); setPatientMode("existing"); setPatientSearch(""); if (p.last_drug) setManualData((d) => ({ ...d, drugRequested: p.last_drug || "" })); }}
                onClear={() => setSelectedPatient(null)} onAddNew={() => setShowNewPatientModal(true)}
                getName={getPatientName} getPhone={getPatientPhone}
              />
            )}

            {currentStep === 1 && !referralMethod && <MethodFork onPick={setReferralMethod} />}

            {currentStep === 1 && referralMethod === "upload" && (
              <div className="rw-fade rw-stack" style={{ gap: 22 }}>
                <div className="rw-step-head" style={{ marginBottom: 0 }}>
                  <p className="rw-eyebrow">Step 2 of 4</p>
                  <h2 className="rw-step-title">Upload Documents</h2>
                  <p className="rw-step-desc">Upload all relevant documents for this referral</p>
                </div>
                <SmartDropzone files={uploadedFiles} onFiles={(fl) => fl.forEach(handleRealFileUpload)} removeFile={removeFile} setTag={setFileTag} isPacket={isPacket} setPacket={setIsPacket} />
                {uploadedFiles.length === 0 && (
                  <label className={`rw-choicebox${noDocsConfirmed ? " on" : ""}`} onClick={(e) => { e.preventDefault(); setNoDocsConfirmed(!noDocsConfirmed); }}>
                    <span className={`rw-check${noDocsConfirmed ? " on" : ""}`}>{noDocsConfirmed && <Check size={13} />}</span>
                    <span className="rw-choice-plain">Manual entry only — no documents available for this referral</span>
                  </label>
                )}
                <BridgeBlock choice={insuranceChoice} onChange={setInsuranceChoice} showErrors={showSubmitErrors} />
                <NoticeStrip icon={Sparkles} tone="teal">Our AI will automatically extract patient info, provider details, drug information, and more from your documents.</NoticeStrip>
                <NoticeStrip icon={CheckCircle}>Our team will handle the PA and process</NoticeStrip>
              </div>
            )}

            {currentStep === 1 && referralMethod === "manual" && (
              <div className="rw-fade rw-stack" style={{ gap: 22 }}>
                <div className="rw-step-head" style={{ marginBottom: 0 }}>
                  <p className="rw-eyebrow">Step 2 of 4</p>
                  <h2 className="rw-step-title">Enter Referral Information</h2>
                  <p className="rw-step-desc">Fill in the details below</p>
                </div>
                <ManualScroll
                  data={manualData} setField={setField}
                  choice={insuranceChoice} setChoice={(c) => { setInsuranceChoice(c); setManualData((d) => ({ ...d, hasInsurance: c === "has" })); }}
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
          <div className="rw-foot">
            <Btn variant="outline" onClick={goBack}><ArrowLeft size={15} />{currentStep === 0 ? "Cancel" : "Back"}</Btn>
            {currentStep === 0 && <Btn variant="primary" onClick={goNext} disabled={!canProceedStep1}>Next: Referral Method<ArrowRight size={15} /></Btn>}
            {currentStep === 1 && referralMethod && <Btn variant="primary" onClick={goNext} disabled={!canProceedStep2}>Next: Choose Pharmacy<ArrowRight size={15} /></Btn>}
            {currentStep === 2 && <Btn variant="primary" onClick={goNext} disabled={!canProceedStep3}>Continue to Review<ArrowRight size={15} /></Btn>}
            {currentStep === 3 && (
              <Btn variant="success" onClick={handleSubmit} disabled={!confirmAccuracy || submitting}>
                {submitting ? <><span className="rw-spin"><Loader2 size={15} /></span>Submitting…</> : <><Check size={15} />Submit Referral</>}
              </Btn>
            )}
          </div>
        </div>

        {/* Live summary rail */}
        <aside className="rw-rail">
          <div className="rw-summary">
            <div className="rw-summary-head"><h3>Referral summary</h3><ClipboardList size={16} style={{ color: "var(--text-muted)" }} /></div>
            <div className="rw-summary-body">
              {summaryRows.map((r) => (
                <div className="rw-sum-row" key={r.k}>
                  <span className={`rw-sum-ic${r.v ? " done" : ""}`}>{r.v ? <Check size={14} /> : <r.icon size={14} />}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="rw-sum-k">{r.k}</div>
                    <div className={`rw-sum-v${r.v ? "" : " muted"}`}>{r.v || "Not yet"}</div>
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
    </div>
  );
}

/* ── Step 1 ── */
function Step1Patient({ search, setSearch, results, selected, onSelect, onClear, onAddNew, getName, getPhone }: any) {
  return (
    <div className="rw-fade">
      <div className="rw-step-head">
        <p className="rw-eyebrow">Step 1 of 4</p>
        <h2 className="rw-step-title">Select Patient</h2>
        <p className="rw-step-desc">Search for an existing patient or add a new one</p>
      </div>
      <div className="rw-row-bar">
        <div className="rw-search-wrap">
          <span className="rw-search-ic"><Search size={16} /></span>
          <input className="rw-input" placeholder="Search by name, DOB, or phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Btn variant="outline" onClick={onAddNew}><UserPlus size={15} />Add New Patient</Btn>
      </div>

      {results.length > 0 && (
        <div className="rw-results">
          {results.map((p: Patient) => (
            <button key={p.id} className="rw-result" onClick={() => onSelect(p)}>
              <div className="nm">{getName(p)}</div>
              <div className="meta">DOB: {formatDateShort(p.dob || "")} · Last: <b>{p.last_drug || "—"}</b></div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="rw-selcard">
          <div className="top">
            <div className="who">
              <span className="rw-ava-ic"><Users size={17} /></span>
              <span style={{ fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>{getName(selected)}</span>
            </div>
            <button className="rw-x" onClick={onClear} aria-label="Clear selected patient"><X size={16} /></button>
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>DOB: {formatDateShort(selected.dob || "")} · Phone: {getPhone(selected)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <Pill size={13} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Last drug: {selected.last_drug || "—"} {selected.last_dosage || ""}</span>
          </div>
          <PAStatusBadge status={(selected.pa_status as any) || "none"} expirationDate={selected.pa_expiration_date} />
        </div>
      )}

      {!selected && !search && (
        <div className="rw-empty">
          <span className="rw-empty-ic"><Users size={28} /></span>
          <p style={{ margin: 0, fontSize: ".875rem" }}>Search above or add a new patient to continue</p>
        </div>
      )}
    </div>
  );
}

/* ── Step 2 — method fork ── */
function MethodFork({ onPick }: { onPick: (m: "upload" | "manual") => void }) {
  return (
    <div className="rw-fade">
      <div className="rw-step-head">
        <p className="rw-eyebrow">Step 2 of 4</p>
        <h2 className="rw-step-title">How would you like to create this referral?</h2>
        <p className="rw-step-desc">Choose your preferred method</p>
      </div>
      <div className="rw-fork">
        <button className="rw-fork-card" onClick={() => onPick("upload")}>
          <span className="rw-fork-ic navy"><Upload size={22} /></span>
          <div className="rw-fork-title"><h3>Upload Documents</h3><span className="rw-badge-rec">Recommended</span></div>
          <p>Our AI will extract all information from your documents</p>
          <ul className="rw-checklist">
            {["Faster (AI does the work)", "More accurate", "Less typing"].map((c) => (
              <li key={c}><span className="ck"><Check size={15} /></span>{c}</li>
            ))}
          </ul>
        </button>
        <button className="rw-fork-card" onClick={() => onPick("manual")}>
          <span className="rw-fork-ic stone"><Pencil size={22} /></span>
          <div className="rw-fork-title"><h3>Manual Entry</h3></div>
          <p>Type in the information yourself</p>
          <p className="italic">Use this if you don't have documents ready</p>
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
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" multiple style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) onFiles(Array.from(e.target.files)); e.target.value = ""; }} />
      <div className={`rw-dropzone${drag ? " drag" : ""}`} onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files)); }}>
        <span className="dz-ic"><Upload size={22} /></span>
        <div className="dz-t">Choose files or drag &amp; drop</div>
        <div className="dz-s">Referral form, insurance cards, chart notes, labs — drop them all here. PDF, JPG, PNG.</div>
      </div>

      <label className={`rw-packet${isPacket ? " on" : ""}`} onClick={(e) => { e.preventDefault(); setPacket(!isPacket); }}>
        <span className={`rw-check${isPacket ? " on" : ""}`}>{isPacket && <Check size={13} />}</span>
        <div>
          <div className="pt">This is one combined packet</div>
          <div className="ps">Everything is in a single multi-page file — we'll treat it as one packet.</div>
        </div>
      </label>

      {files.length > 0 && (
        <div className="rw-filelist">
          {files.map((f: UploadedFile) => (
            <div className="rw-filerow" key={f.id}>
              <span className="fic"><FileCheck size={17} /></span>
              <div className="fmeta"><div className="fn">{f.name}</div><div className="fs">{f.size}</div></div>
              {!isPacket && (
                <select className="rw-chip-tag" value={f.tag} onChange={(e) => setTag(f.id, e.target.value)}>
                  {FILE_TYPE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <button className="rm" onClick={() => removeFile(f.id)} aria-label="Remove file"><X size={16} /></button>
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
    <div className="rw-bridge">
      <div className="rw-bridge-head"><Shield size={16} style={{ color: "var(--color-navy)" }} /><h3>Bridge program? <span className="rw-req">*</span></h3></div>
      <p className="rw-bridge-help">Is this referral being routed through a manufacturer-funded bridge program (e.g., Dupixent MyWay, Humira Complete)?</p>
      <div className="rw-bridge-opts">
        <label className={`rw-choicebox${choice === "has" ? " on" : ""}`} onClick={(e) => { e.preventDefault(); onChange("has"); }}>
          <span className={`rw-radio${choice === "has" ? " on" : ""}`}>{choice === "has" && <i />}</span>
          <div><div className="rw-choice-t">No bridge program</div><div className="rw-choice-s">Standard insurance billing</div></div>
        </label>
        <label className={`rw-choicebox${choice === "bridge" ? " on" : ""}`} onClick={(e) => { e.preventDefault(); onChange("bridge"); }}>
          <span className={`rw-radio${choice === "bridge" ? " on" : ""}`}>{choice === "bridge" && <i />}</span>
          <div><div className="rw-choice-t">Yes, bridge program</div><div className="rw-choice-s">Manufacturer-funded — insurance not used</div></div>
        </label>
      </div>
      {missing && <p className="rw-errmsg" style={{ marginTop: 10 }}>Please choose an option to continue.</p>}
    </div>
  );
}

/* ── Manual single-scroll ── */
function ManualScroll({ data, setField, choice, setChoice, showErrors }: any) {
  const sections = [
    { key: "clinical", title: "Medication / Medical Information", icon: Pill, fields: CLINICAL_FIELDS, body: null as any },
    { key: "provider", title: "Prescriber Information", icon: Stethoscope, fields: PROVIDER_FIELDS, body: null as any },
  ];
  return (
    <div>
      {sections.map((s) => (
        <div className="rw-scroll-sect" key={s.key}>
          <div className="rw-sticky-head"><h3><span className="ti"><s.icon size={16} /></span>{s.title}</h3></div>
          <div className="rw-grid2">
            {s.fields.map((f) => <ManualField key={f.key} field={f} data={data} setField={setField} />)}
          </div>
        </div>
      ))}
      <div className="rw-scroll-sect">
        <div className="rw-sticky-head"><h3><span className="ti"><Shield size={16} /></span>Insurance Information<span className="rw-req">*</span></h3></div>
        <div className="rw-stack" style={{ gap: 16 }}>
          <BridgeBlock choice={choice} onChange={setChoice} showErrors={showErrors} />
          {choice === "has" && (
            <div className="rw-grid2" style={{ paddingTop: 16, borderTop: "1px solid var(--border-default)" }}>
              {INSURANCE_FIELDS.map((f) => <ManualField key={f.key} field={f} data={data} setField={setField} />)}
            </div>
          )}
          {choice === "bridge" && <div className="rw-info-note">Bridge program — manufacturer-funded. No insurance fields needed.</div>}
        </div>
      </div>
    </div>
  );
}

/* ── Step 3 — pharmacy dropdown ── */
function Step3Pharmacy({ loading, pharmacies, selectedId, defaultId, onSelect, selected }: any) {
  return (
    <div className="rw-fade rw-stack" style={{ gap: 18 }}>
      <div className="rw-step-head" style={{ marginBottom: 0 }}>
        <p className="rw-eyebrow">Step 3 of 4</p>
        <h2 className="rw-step-title">Select pharmacy for this referral</h2>
        <p className="rw-step-desc">Defaults to your clinic's preferred pharmacy. Change if this referral needs a different one.</p>
      </div>

      {!loading && !defaultId && (
        <NoticeStrip icon={AlertTriangle} tone="warn">Your clinic doesn't have a default pharmacy set. Pick one for this referral.</NoticeStrip>
      )}

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><span className="rw-spin" style={{ color: "var(--text-muted)" }}><Loader2 size={26} /></span></div>
      ) : pharmacies.length === 0 ? (
        <div className="rw-empty"><p style={{ margin: 0, fontSize: ".875rem" }}>No pharmacies available for your clinic. Contact DiRxctional support.</p></div>
      ) : (
        <>
          <RwField label="Pharmacy">
            <select className="rw-select" value={selectedId || ""} onChange={(e) => onSelect(e.target.value)}>
              <option value="" disabled>Select a pharmacy…</option>
              {pharmacies.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}{p.id === defaultId ? " (Default)" : ""}</option>
              ))}
            </select>
          </RwField>
          {selected && (
            <div className="rw-review">
              <div className="rw-review-head"><span className="rw-review-ic"><Pill size={15} /></span><h3>{selected.name}</h3>
                {defaultId && selectedId === defaultId && <span className="rw-badge-default" style={{ marginLeft: "auto" }}>Default</span>}
              </div>
              <div style={{ fontSize: ".8125rem", color: "var(--text-muted)" }}>
                {[selected.address, [selected.city, selected.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "—"}
                {selected.phone && <div style={{ fontFamily: "var(--font-mono)", marginTop: 3 }}>{selected.phone}</div>}
              </div>
            </div>
          )}
          {defaultId && selectedId === defaultId && <p className="rw-hint">Default pharmacy for your clinic — change if needed.</p>}
        </>
      )}
    </div>
  );
}

/* ── Step 4 — review ── */
function ReviewCard({ icon: Icon, title, action, children }: any) {
  return (
    <div className="rw-review">
      <div className="rw-review-head"><span className="rw-review-ic"><Icon size={15} /></span><h3>{title}</h3>{action && <span style={{ marginLeft: "auto" }}>{action}</span>}</div>
      {children}
    </div>
  );
}
function ReviewField({ label, value }: { label: string; value?: string }) {
  return <div className="rw-rev-field"><div className="rk">{label}</div><div className="rv">{value || "—"}</div></div>;
}
function Step4Review({ patient, getName, pharmacy, isDefault, method, choice, files, manualData, confirm, setConfirm }: any) {
  return (
    <div className="rw-fade rw-stack" style={{ gap: 16 }}>
      <div className="rw-step-head" style={{ marginBottom: 6 }}>
        <p className="rw-eyebrow">Step 4 of 4</p>
        <h2 className="rw-step-title">Submit Referral</h2>
        <p className="rw-step-desc">Confirm and submit your referral for processing</p>
      </div>

      <ReviewCard icon={Users} title="Patient Information">
        <div className="rw-grid2">
          <ReviewField label="Name" value={patient ? getName(patient) : "—"} />
          <ReviewField label="DOB" value={patient?.dob ? formatDateShort(patient.dob) : "—"} />
        </div>
      </ReviewCard>

      <ReviewCard icon={Pill} title="Pharmacy" action={isDefault ? <span className="rw-badge-default">Default</span> : null}>
        <div style={{ fontSize: ".875rem", fontWeight: 500, color: "var(--text-primary)" }}>{pharmacy?.name || "—"}</div>
        {pharmacy && <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>{[pharmacy.city, pharmacy.state].filter(Boolean).join(", ")}</div>}
      </ReviewCard>

      <ReviewCard icon={Shield} title="Insurance">
        {choice === "bridge" ? (
          <div style={{ fontSize: ".875rem", color: "var(--text-primary)" }}>Bridge program — manufacturer-funded</div>
        ) : method === "upload" ? (
          <div style={{ fontSize: ".875rem", color: "var(--text-muted)" }}>Insurance details will be extracted from your uploaded documents.</div>
        ) : (
          <div className="rw-grid2">
            <ReviewField label="Payer" value={manualData.primaryInsuranceName} />
            <ReviewField label="Member ID" value={manualData.primaryMemberId} />
          </div>
        )}
      </ReviewCard>

      {files.length > 0 && (
        <ReviewCard icon={FileText} title="Documents Uploaded">
          <div className="rw-stack" style={{ gap: 7 }}>
            {files.map((f: UploadedFile) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".875rem" }}>
                <span style={{ color: "var(--color-success)", display: "inline-flex" }}><CheckCircle size={15} /></span>
                <span style={{ color: "var(--text-primary)" }}>{f.name}</span>
                <span style={{ color: "var(--text-muted)" }}>({f.size})</span>
              </div>
            ))}
          </div>
        </ReviewCard>
      )}

      <NoticeStrip icon={Sparkles} tone="teal">Our AI will automatically extract patient info, provider details, drug information, and more from your documents.</NoticeStrip>
      <NoticeStrip icon={Shield}>Our team will handle the prior authorization process.</NoticeStrip>

      <label className="rw-choicebox" style={{ background: "var(--color-stone-50)" }} onClick={(e) => { e.preventDefault(); setConfirm(!confirm); }}>
        <span className={`rw-check${confirm ? " on" : ""}`}>{confirm && <Check size={13} />}</span>
        <span className="rw-choice-plain">I confirm all information is accurate and complete.</span>
      </label>
    </div>
  );
}
