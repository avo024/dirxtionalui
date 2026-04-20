import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { PAStatusBadge } from "@/components/PAStatusBadge";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Check, Upload, UserPlus, Users,
  FileText, Pill, Stethoscope, Shield, Info, Edit,
  CheckCircle, Loader2, AlertTriangle, Search, X, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clinicApi, pharmacyApi, getMyClinic } from "@/lib/api";
import { mapManualFormToBackend } from "@/lib/dataMapper";
// Drug/ICD10 options removed — fields are now free text
import { formatDateShort } from "@/lib/dateUtils";
import { DrugCombobox } from "@/components/DrugCombobox";
import { NewPatientModal, type CreatedPatient } from "@/components/NewPatientModal";
import { PharmacyPicker } from "@/components/PharmacyPicker";

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

const steps = [
  { label: "Select Patient", icon: Users },
  { label: "Referral Method", icon: Upload },
  { label: "Choose Pharmacy", icon: Pill },
  { label: "Review & Submit", icon: CheckCircle },
];

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  zone: "required" | "insurance" | "additional";
  file?: File;
}

export default function CreateReferral() {
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get("patientId");

  const [currentStep, setCurrentStep] = useState(preselectedPatientId ? 1 : 0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  // patientMode is retained for downstream code; with the modal flow we always end up "existing".
  const [patientMode, setPatientMode] = useState<"existing" | "new" | null>(preselectedPatientId ? "existing" : "existing");
  const [patientSearch, setPatientSearch] = useState("");
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "", lastName: "", dob: "", phone: "",
    email: "", gender: "", address: "", city: "", state: "", zip: "",
    mi: "", height: "", weight: "", allergies: "",
    authorizedRepresentative: "", authorizedRepresentativePhone: "",
  });

  // Fetch preselected patient
  useEffect(() => {
    if (!preselectedPatientId) return;
    clinicApi.getPatient(preselectedPatientId)
      .then((data) => {
        setSelectedPatient(data);
        setPatientMode("existing");
      })
      .catch(() => toast({ title: "Error", description: "Failed to load patient", variant: "destructive" }));
  }, [preselectedPatientId]);

  // Referral method
  const [referralMethod, setReferralMethod] = useState<"upload" | "manual" | null>(null);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  // Upload mode: explicit acknowledgement that no documents are available
  const [noDocsConfirmed, setNoDocsConfirmed] = useState(false);

  // Manual entry state
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

  // Insurance choice — forced selection (applies to both upload + manual)
  // null = not yet chosen, "has" = patient has insurance, "bridge" = no insurance, use bridge program
  const [insuranceChoice, setInsuranceChoice] = useState<"has" | "bridge" | null>(null);

  // Bridge program is implied by insuranceChoice === "bridge"
  const isBridgeProgram = insuranceChoice === "bridge";
  // Step 4 submit-attempt validation errors
  const [showSubmitErrors, setShowSubmitErrors] = useState(false);

  // Pharmacy list (used by both bridge program picker and pharmacy step)
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);

  // Selected target pharmacy for this referral (Step 3 — Choose Pharmacy)
  const [defaultPharmacyId, setDefaultPharmacyId] = useState<string | null>(null);
  const [defaultPharmacyName, setDefaultPharmacyName] = useState<string | null>(null);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<string | null>(null);

  // Load pharmacies + clinic default once on mount
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
          setDefaultPharmacyName(clinic.default_pharmacy_name || null);
          setSelectedPharmacyId((prev) => prev ?? clinic.default_pharmacy_id ?? null);
        }
      })
      .finally(() => setLoadingPharmacies(false));
  }, []);

  // Submission state
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);

  const navigate = useNavigate();
  const progress = Math.round(((currentStep + 1) / steps.length) * 100);


  // Patient search (debounced API call)
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!patientSearch.trim()) {
      setFilteredPatients([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      clinicApi.getPatients(patientSearch)
        .then((data) => setFilteredPatients((data.items || []).slice(0, 5)))
        .catch(() => setFilteredPatients([]));
    }, 300);
  }, [patientSearch]);

  const getAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleRealFileUpload = async (file: File, zone: UploadedFile["zone"]) => {
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
      id: `file-${Date.now()}`,
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      zone,
      file,
    };
    setUploadedFiles((prev) => [...prev, newFile]);
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

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Step 1: Create patient if new
      let patientId = selectedPatient?.id;
      if (patientMode === "new") {
        const created = await clinicApi.createPatient({
          full_name: `${newPatient.firstName} ${newPatient.lastName}`.trim(),
          dob: newPatient.dob,
          phone_primary: newPatient.phone,
          email: newPatient.email,
          gender: newPatient.gender,
          address: newPatient.address,
          city: newPatient.city,
          state: newPatient.state,
          zip: newPatient.zip,
          mi: newPatient.mi,
          height: newPatient.height,
          weight: newPatient.weight,
          allergies: newPatient.allergies,
          authorized_representative: newPatient.authorizedRepresentative,
          authorized_representative_phone: newPatient.authorizedRepresentativePhone,
        });
        patientId = created.id;
      }

      // Step 2: Build referral payload
      const referralPayload: any = {
        patient_id: patientId,
        referral_method: referralMethod,
        urgency: "routine",
        is_bridge_program: isBridgeProgram,
        insurance_not_provided: insuranceChoice === "bridge",
        ...(selectedPharmacyId ? { target_pharmacy_id: selectedPharmacyId } : {}),
      };

      // Build patient section from actual patient data
      const patientSection = patientMode === "new" ? {
        first_name: newPatient.firstName,
        last_name: newPatient.lastName,
        mi: newPatient.mi || "",
        dob: newPatient.dob,
        gender: newPatient.gender,
        phone: newPatient.phone,
        email: newPatient.email || "",
        address: newPatient.address,
        city: newPatient.city,
        state: newPatient.state,
        zip: newPatient.zip,
        height: newPatient.height || "",
        weight: newPatient.weight || "",
        allergies: newPatient.allergies || "",
        authorized_representative: newPatient.authorizedRepresentative || "",
        authorized_representative_phone: newPatient.authorizedRepresentativePhone || "",
      } : {
        first_name: selectedPatient?.full_name?.split(' ')[0] || "",
        last_name: selectedPatient?.full_name?.split(' ').slice(1).join(' ') || "",
        dob: selectedPatient?.dob || "",
        phone: selectedPatient?.phone_primary || selectedPatient?.phone || "",
      };

      if (referralMethod === "manual") {
        const mapped = mapManualFormToBackend(manualData);
        referralPayload.extracted_data = {
          ...mapped,
          patient: { ...((mapped as any).patient || {}), ...patientSection },
        };
        referralPayload.drug_requested = manualData.drugRequested;
      } else {
        referralPayload.extracted_data = { patient: patientSection };
        referralPayload.drug_requested = "";
      }

      // Step 3: Create referral
      const referral = await clinicApi.createReferral(referralPayload);

      // Step 4: Upload files if any
      if (uploadedFiles.length > 0) {
        for (const f of uploadedFiles) {
          if (f.file) {
            try {
              await clinicApi.uploadDocument(referral.id, f.file, f.zone);
            } catch (err) {
              console.error("File upload failed:", err);
            }
          }
        }
      }

      // Step 5: Trigger AI extraction in background (fire-and-forget)
      try {
        await clinicApi.finalizeReferral(referral.id);
      } catch (err) {
        console.warn('Finalize call failed (admin can retry manually):', err);
      }

      setSubmitting(false);
      setSubmitted(true);

    } catch (err: any) {
      setSubmitting(false);
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to create referral. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getPatientName = (patient: Patient) =>
    patient.full_name || `${patient.first_name || ''} ${patient.last_name || ''}`.trim();

  const getPatientPhone = (patient: Patient) =>
    patient.phone_primary || patient.phone || '—';

  const canProceedStep1 = !!selectedPatient;
  // Insurance section validity (used by Step 2)
  const insuranceSectionValid = (() => {
    if (insuranceChoice === null) return false;
    if (insuranceChoice === "bridge") return true;
    // "has" requires payer + member ID
    return !!manualData.primaryInsuranceName.trim() && !!manualData.primaryMemberId.trim();
  })();

  const canProceedStep2 = (() => {
    if (!insuranceSectionValid) return false;
    if (referralMethod === "upload") {
      const hasDocs = uploadedFiles.length > 0;
      return hasDocs || noDocsConfirmed;
    }
    return !!manualData.diagnosisCode && !!manualData.drugRequested;
  })();

  // Pharmacies available in step 3 — filter to bridge-eligible when bridge chosen
  const availablePharmacies = useMemo(() => {
    if (insuranceChoice === "bridge") {
      return pharmacies.filter((p: any) => p.accepts_no_insurance);
    }
    return pharmacies;
  }, [pharmacies, insuranceChoice]);

  // If bridge selected and current selection isn't eligible, clear it
  useEffect(() => {
    if (insuranceChoice !== "bridge") return;
    const current = pharmacies.find((p: any) => p.id === selectedPharmacyId);
    if (current && !current.accepts_no_insurance) {
      setSelectedPharmacyId(null);
    }
  }, [insuranceChoice, pharmacies, selectedPharmacyId]);

  const canProceedStep3 = !!selectedPharmacyId;
  const selectedPharmacy = useMemo(
    () => pharmacies.find((p: any) => p.id === selectedPharmacyId) || null,
    [pharmacies, selectedPharmacyId],
  );

  // SUCCESS STATE
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">We'll Take It From Here!</h1>
        <p className="text-muted-foreground mb-2">
          Referral submitted successfully! Our AI is extracting the details now and our team will review within the hour.
        </p>
        <p className="text-sm font-mono bg-secondary inline-block px-3 py-1 rounded mb-8">
          REF-{String(Math.floor(Math.random() * 900000) + 100000)}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/clinic/dashboard")}>Back to Dashboard</Button>
          <Button variant="outline" onClick={() => navigate("/clinic/referrals")}>View Referrals</Button>
          <Button variant="outline" onClick={() => {
            setSelectedPatient(null);
            setPatientMode(null);
            setReferralMethod(null);
            setUploadedFiles([]);
            setExtracted(false);
            setConfirmAccuracy(false);
            setSelectedPharmacyId(defaultPharmacyId);
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
        <h1 className="text-2xl font-bold text-foreground">New Referral</h1>
        <p className="text-muted-foreground mt-1">Quick {steps.length}-step process to submit a referral</p>
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
      {selectedPatient && patientMode === "existing" && currentStep > 0 && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{getPatientName(selectedPatient)}</p>
              <p className="text-xs text-muted-foreground">DOB: {formatDateShort(selectedPatient.dob || '')} · {getPatientPhone(selectedPatient)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Form content */}
      <div className="rounded-xl border border-border bg-card p-6 md:p-8 card-shadow">
        {currentStep === 0 && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 1 of 4</p>
              <h2 className="text-lg font-semibold text-foreground">Select Patient</h2>
              <p className="text-sm text-muted-foreground">Search for an existing patient or add a new one</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, DOB, or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewPatientModal(true)}
                  className="shrink-0"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add New Patient
                </Button>
              </div>

              {filteredPatients.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <button
                      key={p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPatient(p);
                        setPatientMode("existing");
                        setPatientSearch("");
                        if (p.last_drug) {
                          setManualData((prev) => ({ ...prev, drugRequested: p.last_drug || "" }));
                        }
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2.5 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors",
                        selectedPatient?.id === p.id && "bg-primary/5"
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{getPatientName(p)}</p>
                      <p className="text-xs text-muted-foreground">DOB: {formatDateShort(p.dob || '')} · Last: {p.last_drug || '—'}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedPatient && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{getPatientName(selectedPatient)}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Clear selected patient"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">DOB: {formatDateShort(selectedPatient.dob || '')} · Phone: {getPatientPhone(selectedPatient)}</p>
                  <div className="flex items-center gap-2">
                    <Pill className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Last drug: {selectedPatient.last_drug || '—'} {selectedPatient.last_dosage || ''}</span>
                  </div>
                  <PAStatusBadge status={(selectedPatient.pa_status as any) || 'none'} expirationDate={selectedPatient.pa_expiration_date} />
                </div>
              )}

              {!selectedPatient && !patientSearch && (
                <div className="rounded-lg border border-dashed border-border p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Search above or add a new patient to continue</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: REFERRAL METHOD */}
        {currentStep === 1 && !referralMethod && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2 of 4</p>
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
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2 of 4</p>
              <h2 className="text-lg font-semibold text-foreground">Upload Documents</h2>
              <p className="text-sm text-muted-foreground">Upload all relevant documents for this referral</p>
            </div>

            <input id="upload-required" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden" onChange={(e) => e.target.files?.[0] && handleRealFileUpload(e.target.files[0], 'required')} />
            <input id="upload-insurance" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden" onChange={(e) => e.target.files?.[0] && handleRealFileUpload(e.target.files[0], 'insurance')} />
            <input id="upload-additional" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden" onChange={(e) => e.target.files?.[0] && handleRealFileUpload(e.target.files[0], 'additional')} />

            <div className="space-y-4">
              <UploadZone
                label="Referral Form / Prescription"
                subtitle="PDF, JPG, PNG"
                icon={FileText}
                files={uploadedFiles.filter((f) => f.zone === "required")}
                onUpload={() => document.getElementById('upload-required')?.click()}
                onRemove={removeFile}
              />
              <UploadZone
                label="Insurance Cards"
                subtitle="Front & back — Upload both as separate files (optional if no insurance)"
                icon={Shield}
                files={uploadedFiles.filter((f) => f.zone === "insurance")}
                onUpload={() => document.getElementById('upload-insurance')?.click()}
                onRemove={removeFile}
              />
              <UploadZone
                label="Chart Notes, Lab Results, Other"
                subtitle="Optional — Any additional supporting documents"
                icon={FileText}
                files={uploadedFiles.filter((f) => f.zone === "additional")}
                onUpload={() => document.getElementById('upload-additional')?.click()}
                onRemove={removeFile}
              />
            </div>

            {/* No-documents acknowledgement */}
            {uploadedFiles.length === 0 && (
              <label
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  noDocsConfirmed
                    ? "border-primary/40 bg-primary/[0.04]"
                    : "border-border hover:bg-secondary/50",
                )}
              >
                <Checkbox
                  checked={noDocsConfirmed}
                  onCheckedChange={(v) => setNoDocsConfirmed(!!v)}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground">
                  Manual entry only — no documents available for this referral
                </span>
              </label>
            )}

            {/* Insurance choice */}
            <InsuranceChoiceSection
              choice={insuranceChoice}
              onChoiceChange={setInsuranceChoice}
              hasInsuranceData={{
                payer: manualData.primaryInsuranceName,
                memberId: manualData.primaryMemberId,
                groupId: manualData.insuranceNotes,
                subscriberName: manualData.secondaryInsuranceName,
              }}
              onHasInsuranceFieldChange={(field, value) => {
                setManualData((d) => ({
                  ...d,
                  ...(field === "payer" ? { primaryInsuranceName: value } : {}),
                  ...(field === "memberId" ? { primaryMemberId: value } : {}),
                  ...(field === "groupId" ? { insuranceNotes: value } : {}),
                  ...(field === "subscriberName" ? { secondaryInsuranceName: value } : {}),
                }));
              }}
              showErrors={showSubmitErrors}
            />

            <div className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Our AI will automatically extract patient info, provider details, drug information, and more from your documents.
              </p>
            </div>

            {/* PA Notice */}
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm text-foreground">
                Our team will handle the PA and process
              </p>
            </div>
          </div>
        )}

        {/* STEP 2B: MANUAL ENTRY (Accordions) */}
        {currentStep === 1 && referralMethod === "manual" && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 2 of 4</p>
              <h2 className="text-lg font-semibold text-foreground">Enter Referral Information</h2>
              <p className="text-sm text-muted-foreground">Fill in the details below</p>
            </div>

            <Accordion type="multiple" defaultValue={["clinical"]}>
              {/* Medication / Medical Information */}
              <AccordionItem value="clinical">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Pill className="h-4 w-4 text-primary" /> Medication / Medical Information</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Drug Requested" required helper="Search formulary or type custom">
                      <DrugCombobox
                        value={manualData.drugRequested}
                        onChange={(v) => setManualData((d) => ({ ...d, drugRequested: v }))}
                        fetchDrugs={clinicApi.getFormularyDrugs}
                        placeholder="Search drug..."
                      />
                    </FormField>
                    <FormField label="Diagnosis ICD-10" required helper="Enter ICD-10 code and description">
                      <Input
                        value={manualData.diagnosisCode}
                        onChange={(e) => setManualData((d) => ({ ...d, diagnosisCode: e.target.value }))}
                        placeholder="e.g., L20.9 Atopic Dermatitis"
                      />
                    </FormField>
                    <FormField label="Therapy Type">
                      <Select value={manualData.therapyType} onValueChange={(v) => setManualData((d) => ({ ...d, therapyType: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New Therapy</SelectItem>
                          <SelectItem value="renewal">Renewal</SelectItem>
                          <SelectItem value="step_therapy">Step Therapy Exception Request</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    {manualData.therapyType === "renewal" && (
                      <FormField label="Date Therapy Initiated">
                        <Input type="date" value={manualData.dateTherapyInitiated} onChange={(e) => setManualData((d) => ({ ...d, dateTherapyInitiated: e.target.value }))} />
                      </FormField>
                    )}
                    <FormField label="Duration of Therapy">
                      <Input value={manualData.durationOfTherapy} onChange={(e) => setManualData((d) => ({ ...d, durationOfTherapy: e.target.value }))} placeholder="e.g., 12 months" />
                    </FormField>
                    <FormField label="Dose/Strength">
                      <Input value={manualData.dosing} onChange={(e) => setManualData((d) => ({ ...d, dosing: e.target.value }))} placeholder="e.g., 300mg" />
                    </FormField>
                    <FormField label="Frequency">
                      <Input value={manualData.frequency} onChange={(e) => setManualData((d) => ({ ...d, frequency: e.target.value }))} placeholder="e.g., Every 2 weeks" />
                    </FormField>
                    <FormField label="Quantity">
                      <Input value={manualData.quantity} onChange={(e) => setManualData((d) => ({ ...d, quantity: e.target.value }))} placeholder="2 syringes" />
                    </FormField>
                    <FormField label="Length of Therapy / #Refills">
                      <Input value={manualData.lengthOfTherapy} onChange={(e) => setManualData((d) => ({ ...d, lengthOfTherapy: e.target.value }))} placeholder="e.g., 26 doses" />
                    </FormField>
                    <FormField label="Administration">
                      <Select value={manualData.administration} onValueChange={(v) => setManualData((d) => ({ ...d, administration: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oral">Oral/SL</SelectItem>
                          <SelectItem value="topical">Topical</SelectItem>
                          <SelectItem value="injection">Injection</SelectItem>
                          <SelectItem value="iv">IV</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Administration Location">
                      <Select value={manualData.administrationLocation} onValueChange={(v) => setManualData((d) => ({ ...d, administrationLocation: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="home">Patient's Home</SelectItem>
                          <SelectItem value="physician">Physician's Office</SelectItem>
                          <SelectItem value="infusion">Ambulatory Infusion Center</SelectItem>
                          <SelectItem value="ltc">Long Term Care</SelectItem>
                          <SelectItem value="home_care">Home Care Agency</SelectItem>
                          <SelectItem value="hospital">Outpatient Hospital Care</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Refill?">
                      <div className="flex items-center gap-3 h-10">
                        <Switch checked={manualData.isRefill} onCheckedChange={(v) => setManualData((d) => ({ ...d, isRefill: v }))} />
                        <span className="text-sm text-muted-foreground">{manualData.isRefill ? "Yes" : "No"}</span>
                      </div>
                    </FormField>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Prescriber Information */}
              <AccordionItem value="provider">
                <AccordionTrigger className="text-sm font-semibold">
                  <span className="flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" /> Prescriber Information</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="First Name">
                      <Input value={manualData.providerFirstName} onChange={(e) => setManualData((d) => ({ ...d, providerFirstName: e.target.value }))} placeholder="Emily" />
                    </FormField>
                    <FormField label="Last Name">
                      <Input value={manualData.providerLastName} onChange={(e) => setManualData((d) => ({ ...d, providerLastName: e.target.value }))} placeholder="Martinez" />
                    </FormField>
                    <FormField label="Specialty">
                      <Input value={manualData.specialty} onChange={(e) => setManualData((d) => ({ ...d, specialty: e.target.value }))} placeholder="e.g., Dermatology" />
                    </FormField>
                    <FormField label="NPI" helper="10 digits">
                      <Input value={manualData.npi} onChange={(e) => setManualData((d) => ({ ...d, npi: e.target.value }))} placeholder="1234567890" maxLength={10} />
                    </FormField>
                    <FormField label="DEA Number">
                      <Input value={manualData.deaNumber} onChange={(e) => setManualData((d) => ({ ...d, deaNumber: e.target.value }))} placeholder="Optional" />
                    </FormField>
                    <FormField label="Address">
                      <Input value={manualData.providerAddress} onChange={(e) => setManualData((d) => ({ ...d, providerAddress: e.target.value }))} placeholder="5500 Greenville Ave" />
                    </FormField>
                    <FormField label="City">
                      <Input value={manualData.providerCity} onChange={(e) => setManualData((d) => ({ ...d, providerCity: e.target.value }))} placeholder="Dallas" />
                    </FormField>
                    <FormField label="State">
                      <Input value={manualData.providerState} onChange={(e) => setManualData((d) => ({ ...d, providerState: e.target.value }))} placeholder="TX" maxLength={2} />
                    </FormField>
                    <FormField label="Zip Code">
                      <Input value={manualData.providerZip} onChange={(e) => setManualData((d) => ({ ...d, providerZip: e.target.value }))} placeholder="75206" maxLength={10} />
                    </FormField>
                    <FormField label="Phone">
                      <Input value={manualData.providerPhone} onChange={(e) => setManualData((d) => ({ ...d, providerPhone: e.target.value }))} placeholder="(214) 555-0200" />
                    </FormField>
                    <FormField label="Fax">
                      <Input value={manualData.providerFax} onChange={(e) => setManualData((d) => ({ ...d, providerFax: e.target.value }))} placeholder="(214) 555-0201" />
                    </FormField>
                    <FormField label="Email">
                      <Input type="email" value={manualData.providerEmail} onChange={(e) => setManualData((d) => ({ ...d, providerEmail: e.target.value }))} placeholder="doctor@clinic.com" />
                    </FormField>
                    <FormField label="Office Contact Person">
                      <Input value={manualData.officeContact} onChange={(e) => setManualData((d) => ({ ...d, officeContact: e.target.value }))} placeholder="Office contact name" />
                    </FormField>
                    <FormField label="Requestor (if different)">
                      <Input value={manualData.requestor} onChange={(e) => setManualData((d) => ({ ...d, requestor: e.target.value }))} placeholder="If different than prescriber" />
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
                  <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Insurance Information <span className="text-destructive">*</span></span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <InsuranceChoiceSection
                    choice={insuranceChoice}
                    onChoiceChange={(c) => {
                      setInsuranceChoice(c);
                      setManualData((d) => ({ ...d, hasInsurance: c === "has" }));
                    }}
                    hasInsuranceData={{
                      payer: manualData.primaryInsuranceName,
                      memberId: manualData.primaryMemberId,
                      groupId: manualData.insuranceNotes,
                      subscriberName: manualData.secondaryInsuranceName,
                    }}
                    onHasInsuranceFieldChange={(field, value) => {
                      setManualData((d) => ({
                        ...d,
                        ...(field === "payer" ? { primaryInsuranceName: value } : {}),
                        ...(field === "memberId" ? { primaryMemberId: value } : {}),
                        ...(field === "groupId" ? { insuranceNotes: value } : {}),
                        ...(field === "subscriberName" ? { secondaryInsuranceName: value } : {}),
                      }));
                    }}
                    showErrors={showSubmitErrors}
                  />
                  {insuranceChoice === "has" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                      <FormField label="Secondary Insurance Name">
                        <Input value={manualData.secondaryMemberId ? manualData.secondaryInsuranceName : manualData.secondaryInsuranceName} onChange={(e) => setManualData((d) => ({ ...d, secondaryInsuranceName: e.target.value }))} placeholder="Optional" />
                      </FormField>
                      <FormField label="Secondary Patient ID Number">
                        <Input value={manualData.secondaryMemberId} onChange={(e) => setManualData((d) => ({ ...d, secondaryMemberId: e.target.value }))} placeholder="Optional" />
                      </FormField>
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
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* PA Notice */}
              <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm text-foreground">
                  Our team will handle the PA and process
                </p>
              </div>
            </Accordion>
          </div>
        )}

        {/* STEP 3: CHOOSE PHARMACY */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 3 of 4</p>
              <h2 className="text-lg font-semibold text-foreground">Select pharmacy for this referral</h2>
              <p className="text-sm text-muted-foreground">
                {insuranceChoice === "bridge"
                  ? "Showing only pharmacies that support bridge programs."
                  : "Defaults to your clinic's preferred pharmacy. Change if this referral needs a different one."}
              </p>
            </div>

            {!loadingPharmacies && !defaultPharmacyId && insuranceChoice !== "bridge" && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Your clinic doesn't have a default pharmacy set. Pick one for this referral.
                </p>
              </div>
            )}

            {loadingPharmacies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availablePharmacies.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {insuranceChoice === "bridge"
                    ? "No bridge-program pharmacies available — contact DiRxctional support."
                    : "No pharmacies available. Contact your administrator."}
                </p>
              </div>
            ) : (
              <PharmacyPicker
                pharmacies={availablePharmacies}
                selectedId={selectedPharmacyId}
                defaultId={
                  insuranceChoice === "bridge" &&
                  defaultPharmacyId &&
                  !availablePharmacies.some((p: any) => p.id === defaultPharmacyId)
                    ? null
                    : defaultPharmacyId
                }
                onSelect={setSelectedPharmacyId}
              />
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="mb-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Step 4 of 4</p>
              <h2 className="text-lg font-semibold text-foreground">Submit Referral</h2>
              <p className="text-sm text-muted-foreground">Confirm and submit your referral for processing</p>
            </div>

            {/* Patient Info */}
            <ReviewCard icon={Users} title="Patient Information">
              <div className="grid grid-cols-2 gap-3">
                <ReviewField label="Name" value={patientMode === "new" ? `${newPatient.firstName} ${newPatient.lastName}`.trim() : (selectedPatient?.full_name || "—")} />
                <ReviewField label="DOB" value={
                  patientMode === "new" 
                    ? newPatient.dob 
                    : selectedPatient?.dob 
                      ? formatDateShort(selectedPatient.dob)
                      : "—"
                } />
              </div>
            </ReviewCard>

            {/* Pharmacy */}
            <ReviewCard icon={Pill} title="Pharmacy">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {selectedPharmacy?.name || "—"}
                  </p>
                  {selectedPharmacy && (
                    <p className="text-xs text-muted-foreground">
                      {[selectedPharmacy.city, selectedPharmacy.state].filter(Boolean).join(", ") || "—"}
                    </p>
                  )}
                </div>
                {defaultPharmacyId && selectedPharmacyId === defaultPharmacyId && (
                  <Badge variant="secondary" className="text-xs">Default</Badge>
                )}
              </div>
            </ReviewCard>

            {/* Documents */}
            {uploadedFiles.length > 0 && (
              <ReviewCard icon={FileText} title="Documents Uploaded">
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

            {/* Info notes */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Our AI will automatically extract patient info, provider details, drug information, and more from your documents.
                </p>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Shield className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">
                  Our team will handle the prior authorization process.
                </p>
              </div>
            </div>

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
              if (!canProceedStep2) {
                setShowSubmitErrors(true);
                return;
              }
              setCurrentStep(2);
            }}
            disabled={!canProceedStep2}
            title={!canProceedStep2 ? "Complete required fields" : undefined}
          >
            Next: Choose Pharmacy
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {currentStep === 2 && (
          <Button
            onClick={() => setCurrentStep(3)}
            disabled={!canProceedStep3}
          >
            Continue to Review
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        {currentStep === 3 && (
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

      {/* New Patient Modal */}
      <NewPatientModal
        open={showNewPatientModal}
        onOpenChange={setShowNewPatientModal}
        onCreated={(patient) => {
          setSelectedPatient(patient);
          setPatientMode("existing");
          setPatientSearch("");
        }}
      />

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
