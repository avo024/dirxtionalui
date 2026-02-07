import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Check, Upload, UserPlus, Users,
  FileText, Pill, Stethoscope, Shield, Info, Edit,
  CheckCircle, Loader2, AlertTriangle, Search, X, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { mockPatients, type Patient } from "@/data/mockData";
import { DRUG_OPTIONS, ICD10_OPTIONS } from "@/types/referralForm";
import { formatDateShort } from "@/lib/dateUtils";

const steps = [
  { label: "Select Patient", icon: Users },
  { label: "Referral Method", icon: Upload },
  { label: "Review & Submit", icon: CheckCircle },
];

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  zone: "required" | "insurance" | "additional";
}

export default function CreateReferral() {
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");
  const preselectedPatient = preselectedPatientId
    ? mockPatients.find((p) => p.id === preselectedPatientId)
    : null;

  const [currentStep, setCurrentStep] = useState(preselectedPatient ? 1 : 0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(preselectedPatient || null);
  const [patientMode, setPatientMode] = useState<"existing" | "new" | null>(preselectedPatient ? "existing" : null);
  const [patientSearch, setPatientSearch] = useState("");
  const [newPatient, setNewPatient] = useState({ firstName: "", lastName: "", dob: "", phone: "" });

  // Referral method
  const [referralMethod, setReferralMethod] = useState<"upload" | "manual" | null>(null);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Manual entry state
  const [manualData, setManualData] = useState({
    diagnosisCode: "", drugRequested: "", dosing: "", quantity: "",
    isRefill: false, urgency: "routine" as "routine" | "urgent" | "emergency",
    providerName: "", npi: "", providerPhone: "", signatureDate: new Date().toISOString().split("T")[0],
    hasInsurance: true, insuranceType: "", insuranceNotes: "",
    paRequired: false, paHandledBy: "", paNotes: "",
  });

  // Submission state
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  const navigate = useNavigate();
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  // Patient search
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return [];
    const q = patientSearch.toLowerCase();
    return mockPatients.filter((p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
      p.dob.includes(q) ||
      p.phone.includes(q)
    ).slice(0, 5);
  }, [patientSearch]);

  // PA auto-calculation
  const paCalculation = useMemo(() => {
    if (!selectedPatient) return null;
    if (selectedPatient.pa_status === "expired") return { required: true, reason: `PA expired on ${formatDateShort(selectedPatient.pa_expiration_date)}` };
    if (selectedPatient.pa_status === "none") return { required: true, reason: "New patient — no active PA" };
    if (selectedPatient.pa_status === "expiring") return { required: true, reason: `PA expiring on ${formatDateShort(selectedPatient.pa_expiration_date)}` };
    return { required: false, reason: "Continuation of existing therapy" };
  }, [selectedPatient]);

  const getAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const simulateUpload = (zone: UploadedFile["zone"]) => {
    const names: Record<string, string> = {
      required: "referral-form.pdf",
      insurance: "insurance-card.jpg",
      additional: "chart-notes.pdf",
    };
    const file: UploadedFile = {
      id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: names[zone] || "document.pdf",
      size: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
      zone,
    };
    setUploadedFiles((prev) => [...prev, file]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartExtraction = () => {
    setExtracting(true);
    setTimeout(() => {
      setExtracting(false);
      setExtracted(true);
    }, 3000);
  };

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 2000);
  };

  const canProceedStep1 = patientMode === "existing" ? !!selectedPatient : (newPatient.firstName && newPatient.lastName && newPatient.dob && newPatient.phone);
  const canProceedStep2 = referralMethod === "upload" ? uploadedFiles.length > 0 : (manualData.diagnosisCode && manualData.drugRequested);

  // SUCCESS STATE
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Referral Submitted Successfully!</h1>
        <p className="text-muted-foreground mb-2">
          Your referral has been submitted for review. You'll be notified once it's approved.
        </p>
        <p className="text-sm font-mono bg-secondary inline-block px-3 py-1 rounded mb-8">
          REF-{String(Math.floor(Math.random() * 900000) + 100000)}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/clinic/referrals")}>View Referrals</Button>
          <Button variant="outline" onClick={() => {
            setSelectedPatient(null);
            setPatientMode(null);
            setReferralMethod(null);
            setUploadedFiles([]);
            setExtracted(false);
            setConfirmAccuracy(false);
            setCurrentStep(0);
            setSubmitted(false);
          }}>
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Referral</h1>
        <p className="text-muted-foreground mt-1">Quick 3-step process to submit a referral</p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Step {currentStep + 1} of {steps.length}: {steps[currentStep].label}
          </span>
          <span className="text-xs text-muted-foreground">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 flex-1">
            <button
              onClick={() => i < currentStep && setCurrentStep(i)}
              disabled={i > currentStep}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-all duration-200",
                i < currentStep
                  ? "bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90"
                  : i === currentStep
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </button>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 rounded", i < currentStep ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Selected patient banner (sticky when on step 2+) */}
      {selectedPatient && currentStep > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{selectedPatient.first_name} {selectedPatient.last_name}</p>
              <p className="text-xs text-muted-foreground">DOB: {formatDateShort(selectedPatient.dob)} · {selectedPatient.phone}</p>
            </div>
          </div>
          {paCalculation && (
            <div className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full",
              paCalculation.required ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
            )}>
              PA {paCalculation.required ? "Required" : "Not Required"}: {paCalculation.reason}
            </div>
          )}
        </div>
      )}

      {/* Form content */}
      <div className="rounded-xl border border-border bg-card p-6 md:p-8 card-shadow">
        {/* STEP 1: SELECT PATIENT */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 1 of 3</p>
              <h2 className="text-lg font-semibold text-foreground">Select Patient</h2>
              <p className="text-sm text-muted-foreground">Choose an existing patient or add a new one</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Existing Patient Card */}
              <div
                onClick={() => setPatientMode("existing")}
                className={cn(
                  "rounded-xl border-2 p-5 cursor-pointer transition-all duration-200",
                  patientMode === "existing" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/40"
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Existing Patient</h3>
                <p className="text-sm text-muted-foreground mb-4">Select from your patient records</p>

                {patientMode === "existing" && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, DOB, or phone..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {filteredPatients.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                        {filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); setPatientSearch(""); }}
                            className={cn(
                              "w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors",
                              selectedPatient?.id === p.id && "bg-primary/5"
                            )}
                          >
                            <p className="text-sm font-medium text-foreground">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-muted-foreground">DOB: {formatDateShort(p.dob)} · Last: {p.last_drug}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedPatient && (
                      <div className="rounded-lg bg-secondary/50 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">DOB: {formatDateShort(selectedPatient.dob)} · Phone: {selectedPatient.phone}</p>
                        <div className="flex items-center gap-2">
                          <Pill className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Last drug: {selectedPatient.last_drug} {selectedPatient.last_dosage}</span>
                        </div>
                        <PAStatusBadge status={selectedPatient.pa_status} expirationDate={selectedPatient.pa_expiration_date} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* New Patient Card */}
              <div
                onClick={() => setPatientMode("new")}
                className={cn(
                  "rounded-xl border-2 p-5 cursor-pointer transition-all duration-200",
                  patientMode === "new" ? "border-primary bg-primary/[0.02]" : "border-border hover:border-primary/40"
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">New Patient</h3>
                <p className="text-sm text-muted-foreground mb-4">Add a new patient to your records</p>

                {patientMode === "new" && (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">First Name <span className="text-destructive">*</span></Label>
                        <Input value={newPatient.firstName} onChange={(e) => setNewPatient((p) => ({ ...p, firstName: e.target.value }))} placeholder="John" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Last Name <span className="text-destructive">*</span></Label>
                        <Input value={newPatient.lastName} onChange={(e) => setNewPatient((p) => ({ ...p, lastName: e.target.value }))} placeholder="Doe" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Date of Birth <span className="text-destructive">*</span></Label>
                      <Input type="date" value={newPatient.dob} onChange={(e) => setNewPatient((p) => ({ ...p, dob: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Phone <span className="text-destructive">*</span></Label>
                      <Input value={newPatient.phone} onChange={(e) => setNewPatient((p) => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: REFERRAL METHOD */}
        {currentStep === 1 && !referralMethod && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2 of 3</p>
              <h2 className="text-lg font-semibold text-foreground">How would you like to create this referral?</h2>
              <p className="text-sm text-muted-foreground">Choose your preferred method</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upload Documents */}
              <button
                onClick={() => setReferralMethod("upload")}
                className="rounded-xl border-2 border-border p-6 text-left cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.02] group"
              >
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground text-lg">Upload Documents</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">Recommended</span>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Our AI will extract all information from your documents</p>
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />Faster (AI does the work)
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />More accurate
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-success" />Less typing
                  </li>
                </ul>
              </button>

              {/* Manual Entry */}
              <button
                onClick={() => setReferralMethod("manual")}
                className="rounded-xl border-2 border-border p-6 text-left cursor-pointer transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.02] group"
              >
                <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Edit className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-1">Manual Entry</h3>
                <p className="text-sm text-muted-foreground mb-4">Type in the information yourself</p>
                <p className="text-xs text-muted-foreground italic">Use this if you don't have documents ready</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2A: UPLOAD DOCUMENTS */}
        {currentStep === 1 && referralMethod === "upload" && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2 of 3</p>
              <h2 className="text-lg font-semibold text-foreground">Upload Documents</h2>
              <p className="text-sm text-muted-foreground">Upload all relevant documents for this referral</p>
            </div>

            <div className="space-y-4">
              <UploadZone
                label="Referral Form / Prescription"
                subtitle="PDF, JPG, PNG — Required"
                icon={FileText}
                required
                files={uploadedFiles.filter((f) => f.zone === "required")}
                onUpload={() => simulateUpload("required")}
                onRemove={removeFile}
              />
              <UploadZone
                label="Insurance Cards"
                subtitle="Front & back — Upload both as separate files"
                icon={Shield}
                files={uploadedFiles.filter((f) => f.zone === "insurance")}
                onUpload={() => simulateUpload("insurance")}
                onRemove={removeFile}
              />
              <UploadZone
                label="Chart Notes, Lab Results, Other"
                subtitle="Optional — Any additional supporting documents"
                icon={FileText}
                files={uploadedFiles.filter((f) => f.zone === "additional")}
                onUpload={() => simulateUpload("additional")}
                onRemove={removeFile}
              />
            </div>

            <div className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Our AI will automatically extract patient info, provider details, drug information, and more from your documents.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2B: MANUAL ENTRY (Accordions) */}
        {currentStep === 1 && referralMethod === "manual" && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2 of 3</p>
              <h2 className="text-lg font-semibold text-foreground">Enter Referral Information</h2>
              <p className="text-sm text-muted-foreground">Fill in the details below</p>
            </div>

            <Accordion type="multiple" defaultValue={["clinical"]}>
              {/* Clinical */}
              <AccordionItem value="clinical">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> Clinical Information</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Diagnosis ICD-10" required>
                      <Select value={manualData.diagnosisCode} onValueChange={(v) => setManualData((d) => ({ ...d, diagnosisCode: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select diagnosis code" /></SelectTrigger>
                        <SelectContent>
                          {ICD10_OPTIONS.map((o) => <SelectItem key={o.code} value={o.code}>{o.code} — {o.description}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Drug Requested" required>
                      <Select value={manualData.drugRequested} onValueChange={(v) => setManualData((d) => ({ ...d, drugRequested: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select drug" /></SelectTrigger>
                        <SelectContent>
                          {DRUG_OPTIONS.map((drug) => <SelectItem key={drug} value={drug}>{drug}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Dosing Directions" className="md:col-span-2">
                      <Textarea value={manualData.dosing} onChange={(e) => setManualData((d) => ({ ...d, dosing: e.target.value }))} placeholder="e.g., Inject 300mg SUBQ every other week" rows={2} />
                    </FormField>
                    <FormField label="Quantity">
                      <Input value={manualData.quantity} onChange={(e) => setManualData((d) => ({ ...d, quantity: e.target.value }))} placeholder="2 syringes" />
                    </FormField>
                    <FormField label="Refill?">
                      <div className="flex items-center gap-3 h-10">
                        <Switch checked={manualData.isRefill} onCheckedChange={(v) => setManualData((d) => ({ ...d, isRefill: v }))} />
                        <span className="text-sm text-muted-foreground">{manualData.isRefill ? "Yes" : "No"}</span>
                      </div>
                    </FormField>
                  </div>
                  <FormField label="Urgency">
                    <RadioGroup value={manualData.urgency} onValueChange={(v) => setManualData((d) => ({ ...d, urgency: v as any }))} className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="routine" /><span className="text-sm">Routine</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="urgent" /><span className="text-sm text-warning font-medium">Urgent</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="emergency" /><span className="text-sm text-destructive font-medium">Emergency</span></label>
                    </RadioGroup>
                  </FormField>
                </AccordionContent>
              </AccordionItem>

              {/* Provider */}
              <AccordionItem value="provider">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Provider Information</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Provider Name">
                      <Input value={manualData.providerName} onChange={(e) => setManualData((d) => ({ ...d, providerName: e.target.value }))} placeholder="Dr. Emily Martinez" />
                    </FormField>
                    <FormField label="NPI" helper="10 digits">
                      <Input value={manualData.npi} onChange={(e) => setManualData((d) => ({ ...d, npi: e.target.value }))} placeholder="1234567890" maxLength={10} />
                    </FormField>
                    <FormField label="Phone">
                      <Input value={manualData.providerPhone} onChange={(e) => setManualData((d) => ({ ...d, providerPhone: e.target.value }))} placeholder="(214) 555-0200" />
                    </FormField>
                    <FormField label="Signature Date">
                      <Input type="date" value={manualData.signatureDate} onChange={(e) => setManualData((d) => ({ ...d, signatureDate: e.target.value }))} />
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Insurance */}
              <AccordionItem value="insurance">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Insurance Information</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FormField label="Has insurance card?">
                    <div className="flex items-center gap-3 h-10">
                      <Switch checked={manualData.hasInsurance} onCheckedChange={(v) => setManualData((d) => ({ ...d, hasInsurance: v }))} />
                      <span className="text-sm text-muted-foreground">{manualData.hasInsurance ? "Yes" : "No"}</span>
                    </div>
                  </FormField>
                  {manualData.hasInsurance && (
                    <>
                      <FormField label="Insurance Type">
                        <Select value={manualData.insuranceType} onValueChange={(v) => setManualData((d) => ({ ...d, insuranceType: v }))}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="commercial">Commercial</SelectItem>
                            <SelectItem value="medicare">Medicare</SelectItem>
                            <SelectItem value="medicaid">Medicaid</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormField>
                      <FormField label="Insurance Notes">
                        <Textarea value={manualData.insuranceNotes} onChange={(e) => setManualData((d) => ({ ...d, insuranceNotes: e.target.value }))} placeholder="Plan name, member ID, etc." rows={2} />
                      </FormField>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* PA */}
              <AccordionItem value="pa">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Prior Authorization</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FormField label="PA Required?">
                    <div className="flex items-center gap-3 h-10">
                      <Switch checked={manualData.paRequired} onCheckedChange={(v) => setManualData((d) => ({ ...d, paRequired: v }))} />
                      <span className="text-sm text-muted-foreground">{manualData.paRequired ? "Yes" : "No"}</span>
                    </div>
                  </FormField>
                  {paCalculation && (
                    <p className="text-xs text-muted-foreground italic">Auto-calculated: PA {paCalculation.required ? "Required" : "Not Required"} — {paCalculation.reason}</p>
                  )}
                  {manualData.paRequired && (
                    <>
                      <FormField label="Who will handle PA?">
                        <RadioGroup value={manualData.paHandledBy} onValueChange={(v) => setManualData((d) => ({ ...d, paHandledBy: v }))} className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="pharmacy" /><span className="text-sm">Pharmacy/Admin</span></label>
                          <label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="clinic" /><span className="text-sm">Clinic</span></label>
                        </RadioGroup>
                      </FormField>
                      <FormField label="PA Notes">
                        <Textarea value={manualData.paNotes} onChange={(e) => setManualData((d) => ({ ...d, paNotes: e.target.value }))} placeholder="Additional PA details..." rows={2} />
                      </FormField>
                    </>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

        {/* STEP 3: REVIEW & SUBMIT */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 3 of 3</p>
              <h2 className="text-lg font-semibold text-foreground">Review Referral</h2>
              <p className="text-sm text-muted-foreground">Confirm the information before submitting</p>
            </div>

            {/* AI Extraction animation */}
            {referralMethod === "upload" && !extracted && (
              <div className="text-center py-8">
                {extracting ? (
                  <>
                    <Loader2 className="h-10 w-10 text-primary mx-auto mb-4 animate-spin" />
                    <p className="text-foreground font-medium">AI is extracting information...</p>
                    <p className="text-sm text-muted-foreground">This takes 10-20 seconds</p>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-10 w-10 text-primary mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-4">Ready to extract data from your documents</p>
                    <Button onClick={handleStartExtraction}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Start AI Extraction
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Show extracted/manual data */}
            {(referralMethod === "manual" || extracted) && (
              <>
                {/* Patient Info */}
                <ReviewCard icon={Users} title="Patient Information">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <ReviewField label="Name" value={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : `${newPatient.firstName} ${newPatient.lastName}`} />
                    <ReviewField label="DOB" value={selectedPatient ? formatDateShort(selectedPatient.dob) : newPatient.dob} />
                    <ReviewField label="Phone" value={selectedPatient?.phone || newPatient.phone} />
                  </div>
                </ReviewCard>

                {/* Clinical Info (extracted or manual) */}
                <ReviewCard icon={Pill} title="Clinical Information">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {referralMethod === "upload" ? (
                      <>
                        <ReviewField label="Diagnosis" value="L20.9 — Atopic Dermatitis" confidence={0.88} />
                        <ReviewField label="Drug" value={selectedPatient?.last_drug || "Dupixent"} confidence={0.96} />
                        <ReviewField label="Dosing" value={selectedPatient?.last_dosage || "300mg every 2 weeks"} confidence={0.65} />
                        <ReviewField label="Quantity" value="2 syringes" confidence={0.92} />
                        <ReviewField label="Urgency" value="Standard" confidence={0.95} />
                      </>
                    ) : (
                      <>
                        <ReviewField label="Diagnosis" value={manualData.diagnosisCode || "—"} />
                        <ReviewField label="Drug" value={manualData.drugRequested || "—"} />
                        <ReviewField label="Dosing" value={manualData.dosing || "—"} />
                        <ReviewField label="Quantity" value={manualData.quantity || "—"} />
                        <ReviewField label="Urgency" value={manualData.urgency} />
                      </>
                    )}
                  </div>
                </ReviewCard>

                {/* Provider */}
                <ReviewCard icon={Stethoscope} title="Provider Information">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {referralMethod === "upload" ? (
                      <>
                        <ReviewField label="Provider" value="Dr. Emily Martinez" confidence={0.97} />
                        <ReviewField label="NPI" value="1234567890" confidence={0.72} />
                        <ReviewField label="Phone" value="(214) 555-0200" confidence={0.91} />
                      </>
                    ) : (
                      <>
                        <ReviewField label="Provider" value={manualData.providerName || "—"} />
                        <ReviewField label="NPI" value={manualData.npi || "—"} />
                        <ReviewField label="Phone" value={manualData.providerPhone || "—"} />
                      </>
                    )}
                  </div>
                </ReviewCard>

                {/* PA auto-calc */}
                {paCalculation && (
                  <div className={cn(
                    "rounded-lg border px-4 py-3",
                    paCalculation.required ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"
                  )}>
                    <div className="flex items-center gap-2">
                      {paCalculation.required ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-success" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        PA {paCalculation.required ? "Required" : "Not Required"}: {paCalculation.reason}
                      </span>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {uploadedFiles.length > 0 && (
                  <ReviewCard icon={FileText} title="Documents">
                    <div className="space-y-1.5">
                      {uploadedFiles.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-3.5 w-3.5 text-success" />
                          <span className="text-foreground">{f.name}</span>
                          <span className="text-muted-foreground">({f.size})</span>
                        </div>
                      ))}
                    </div>
                  </ReviewCard>
                )}

                {/* Confirm */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
                  <input
                    type="checkbox"
                    checked={confirmAccuracy}
                    onChange={(e) => setConfirmAccuracy(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <label className="text-sm text-foreground">
                    I confirm all information is accurate and complete.
                  </label>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep === 0) {
              navigate("/clinic/referrals");
            } else if (currentStep === 1 && referralMethod) {
              setReferralMethod(null);
            } else {
              setCurrentStep(currentStep - 1);
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? "Cancel" : "Back"}
        </Button>

        {currentStep === 0 && (
          <Button onClick={() => setCurrentStep(1)} disabled={!canProceedStep1}>
            Next: Referral Method
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {currentStep === 1 && referralMethod && (
          <Button
            onClick={() => {
              setCurrentStep(2);
              if (referralMethod === "upload") {
                // Will need extraction on step 3
              }
            }}
            disabled={!canProceedStep2}
          >
            Continue to Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {currentStep === 2 && (referralMethod === "manual" || extracted) && (
          <Button
            onClick={handleSubmit}
            disabled={!confirmAccuracy || submitting}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              <><Check className="h-4 w-4 mr-2" />Submit Referral</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/* Helper Components */

function FormField({ label, required, helper, className, children }: {
  label: string; required?: boolean; helper?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function UploadZone({ label, subtitle, icon: Icon, required, files, onUpload, onRemove }: {
  label: string; subtitle: string; icon: React.ElementType; required?: boolean;
  files: UploadedFile[]; onUpload: () => void; onRemove: (id: string) => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border-2 border-dashed p-5 transition-all duration-200",
      files.length > 0 ? "border-success/40 bg-success/[0.02]" : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {required && files.length === 0 && (
          <span className="text-xs text-destructive font-medium">Required</span>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((f) => (
            <div key={f.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-success" />
                <span className="text-sm text-foreground">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.size}</span>
              </div>
              <button onClick={() => onRemove(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" onClick={onUpload} className="w-full text-xs">
        <Upload className="h-3.5 w-3.5 mr-1" />
        {files.length > 0 ? "Upload Another File" : "Choose File or Drag & Drop"}
      </Button>
    </div>
  );
}

function ReviewCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ReviewField({ label, value, confidence }: { label: string; value: string; confidence?: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium text-foreground">{value}</p>
        {confidence !== undefined && <ConfidenceIndicator confidence={confidence} />}
      </div>
    </div>
  );
}
