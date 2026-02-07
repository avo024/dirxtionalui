import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, ArrowRight, Check, Upload, Plus, ChevronDown,
  FileText, User, Pill, Stethoscope, Shield, Files, Info,
  CheckCircle, Loader2, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ReferralFormData, type UploadedDocument,
  initialFormData, DRUG_OPTIONS, ICD10_OPTIONS,
} from "@/types/referralForm";

const steps = [
  { label: "Patient Info", icon: User },
  { label: "Clinical Info", icon: Pill },
  { label: "Provider Info", icon: Stethoscope },
  { label: "Insurance", icon: Shield },
  { label: "Prior Auth", icon: FileText },
  { label: "Documents", icon: Upload },
  { label: "Review", icon: CheckCircle },
];

export default function CreateReferral() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ReferralFormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const updateField = useCallback(
    <K extends keyof ReferralFormData>(field: K, value: ReferralFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const progress = Math.round(((currentStep + 1) / steps.length) * 100);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 2000);
  };

  const goToStep = (step: number) => {
    if (step < currentStep) setCurrentStep(step);
  };

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
          <Button
            variant="outline"
            onClick={() => {
              setFormData(initialFormData);
              setCurrentStep(0);
              setSubmitted(false);
            }}
          >
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
        <p className="text-muted-foreground mt-1">Fill out the form below to submit a new referral</p>
      </div>

      {/* Progress bar */}
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
              onClick={() => goToStep(i)}
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
              <div
                className={cn(
                  "flex-1 h-0.5 rounded",
                  i < currentStep ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form content */}
      <div className="rounded-xl border border-border bg-card p-6 md:p-8 card-shadow">
        {/* Step 1: Patient Information */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <StepHeader number={1} title="Patient Information" subtitle="Enter the patient's basic details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="First Name" required>
                <Input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="John" />
              </FormField>
              <FormField label="Last Name" required>
                <Input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Doe" />
              </FormField>
              <FormField label="Date of Birth" required>
                <Input type="date" value={formData.dob} onChange={(e) => updateField("dob", e.target.value)} />
              </FormField>
              <FormField label="Gender">
                <Select value={formData.gender} onValueChange={(v) => updateField("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Phone">
                <Input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="(555) 123-4567" />
              </FormField>
              <FormField label="Email">
                <Input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="patient@email.com" />
              </FormField>
            </div>
            {/* Guardian */}
            <Collapsible open={formData.hasGuardian} onOpenChange={(open) => updateField("hasGuardian", open)}>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <Plus className="h-3.5 w-3.5" />
                {formData.hasGuardian ? "Remove Guardian" : "Add Guardian"}
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", formData.hasGuardian && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-secondary/50">
                  <FormField label="Guardian Name">
                    <Input value={formData.guardianName} onChange={(e) => updateField("guardianName", e.target.value)} placeholder="Guardian name" />
                  </FormField>
                  <FormField label="Relationship">
                    <Select value={formData.guardianRelationship} onValueChange={(v) => updateField("guardianRelationship", v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Guardian Phone">
                    <Input value={formData.guardianPhone} onChange={(e) => updateField("guardianPhone", e.target.value)} placeholder="(555) 123-4567" />
                  </FormField>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Step 2: Clinical Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <StepHeader number={2} title="Clinical Information" subtitle="Enter diagnosis and medication details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Diagnosis ICD-10 Code" required>
                <Select value={formData.diagnosisCode} onValueChange={(v) => updateField("diagnosisCode", v)}>
                  <SelectTrigger><SelectValue placeholder="Select diagnosis code" /></SelectTrigger>
                  <SelectContent>
                    {ICD10_OPTIONS.map((opt) => (
                      <SelectItem key={opt.code} value={opt.code}>
                        {opt.code} — {opt.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Drug Requested" required>
                <Select value={formData.drugRequested} onValueChange={(v) => updateField("drugRequested", v)}>
                  <SelectTrigger><SelectValue placeholder="Select drug" /></SelectTrigger>
                  <SelectContent>
                    {DRUG_OPTIONS.map((drug) => (
                      <SelectItem key={drug} value={drug}>{drug}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Dosing Directions" className="md:col-span-2">
                <Textarea
                  value={formData.dosing}
                  onChange={(e) => updateField("dosing", e.target.value)}
                  placeholder="e.g., Inject 300mg SUBQ every other week"
                  rows={2}
                />
              </FormField>
              <FormField label="Quantity">
                <Input value={formData.quantity} onChange={(e) => updateField("quantity", e.target.value)} placeholder="2 syringes" />
              </FormField>
              <FormField label="Is this a refill?">
                <div className="flex items-center gap-3 h-10">
                  <Switch checked={formData.isRefill} onCheckedChange={(v) => updateField("isRefill", v)} />
                  <span className="text-sm text-muted-foreground">{formData.isRefill ? "Yes" : "No"}</span>
                </div>
              </FormField>
            </div>
            <FormField label="Urgency">
              <RadioGroup value={formData.urgency} onValueChange={(v) => updateField("urgency", v as ReferralFormData["urgency"])} className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="routine" />
                  <span className="text-sm">Routine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="urgent" />
                  <span className="text-sm text-warning font-medium">Urgent</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="emergency" />
                  <span className="text-sm text-destructive font-medium">Emergency</span>
                </label>
              </RadioGroup>
            </FormField>
          </div>
        )}

        {/* Step 3: Provider Information */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <StepHeader number={3} title="Provider Information" subtitle="Enter the prescribing provider's details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Provider Name" required>
                <Input value={formData.providerName} onChange={(e) => updateField("providerName", e.target.value)} placeholder="Dr. Emily Martinez" />
              </FormField>
              <FormField label="NPI Number" required helper="Must be exactly 10 digits">
                <Input value={formData.npi} onChange={(e) => updateField("npi", e.target.value)} placeholder="1234567890" maxLength={10} />
              </FormField>
              <FormField label="Address" className="md:col-span-2">
                <Input value={formData.providerAddress} onChange={(e) => updateField("providerAddress", e.target.value)} placeholder="5500 Greenville Ave" />
              </FormField>
              <FormField label="City">
                <Input value={formData.providerCity} onChange={(e) => updateField("providerCity", e.target.value)} placeholder="Dallas" />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="State">
                  <Input value={formData.providerState} onChange={(e) => updateField("providerState", e.target.value)} placeholder="TX" maxLength={2} />
                </FormField>
                <FormField label="Zip">
                  <Input value={formData.providerZip} onChange={(e) => updateField("providerZip", e.target.value)} placeholder="75206" maxLength={5} />
                </FormField>
              </div>
              <FormField label="Phone">
                <Input value={formData.providerPhone} onChange={(e) => updateField("providerPhone", e.target.value)} placeholder="(214) 555-0200" />
              </FormField>
              <FormField label="Fax (optional)">
                <Input value={formData.providerFax} onChange={(e) => updateField("providerFax", e.target.value)} placeholder="(214) 555-0201" />
              </FormField>
              <FormField label="Signature Date">
                <Input type="date" value={formData.signatureDate} onChange={(e) => updateField("signatureDate", e.target.value)} />
              </FormField>
            </div>
          </div>
        )}

        {/* Step 4: Insurance */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <StepHeader number={4} title="Insurance Information" subtitle="Enter the patient's insurance details" />
            <FormField label="Does patient have insurance card?">
              <div className="flex items-center gap-3 h-10">
                <Switch checked={formData.hasInsurance} onCheckedChange={(v) => updateField("hasInsurance", v)} />
                <span className="text-sm text-muted-foreground">{formData.hasInsurance ? "Yes" : "No"}</span>
              </div>
            </FormField>
            {formData.hasInsurance ? (
              <>
                <FormField label="Insurance Type">
                  <Select value={formData.insuranceType} onValueChange={(v) => updateField("insuranceType", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial">Commercial</SelectItem>
                      <SelectItem value="medicare">Medicare</SelectItem>
                      <SelectItem value="medicaid">Medicaid</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Insurance Notes (optional)">
                  <Textarea
                    value={formData.insuranceNotes}
                    onChange={(e) => updateField("insuranceNotes", e.target.value)}
                    placeholder="Plan name, member ID, group number, etc."
                    rows={3}
                  />
                </FormField>
              </>
            ) : (
              <div className="flex gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">
                  Patient will need to explore cash-pay or assistance programs.
                </p>
              </div>
            )}
            <div className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Upload insurance card images in the Documents step.
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Prior Authorization */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <StepHeader number={5} title="Prior Authorization" subtitle="Specify prior authorization requirements" />
            <FormField label="Is prior authorization required?">
              <div className="flex items-center gap-3 h-10">
                <Switch checked={formData.paRequired} onCheckedChange={(v) => updateField("paRequired", v)} />
                <span className="text-sm text-muted-foreground">{formData.paRequired ? "Yes" : "No"}</span>
              </div>
            </FormField>
            {formData.drugRequested && (
              <p className="text-xs text-muted-foreground italic">
                Based on drug ({formData.drugRequested}) and insurance type, PA is likely required.
              </p>
            )}
            {formData.paRequired && (
              <>
                <FormField label="Who will handle PA?">
                  <RadioGroup value={formData.paHandledBy} onValueChange={(v) => updateField("paHandledBy", v)} className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="pharmacy" />
                      <span className="text-sm">Pharmacy/Admin will handle PA</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value="clinic" />
                      <span className="text-sm">Clinic will handle PA</span>
                    </label>
                  </RadioGroup>
                </FormField>
                <FormField label="PA Notes (optional)">
                  <Textarea
                    value={formData.paNotes}
                    onChange={(e) => updateField("paNotes", e.target.value)}
                    placeholder="Any additional PA details..."
                    rows={3}
                  />
                </FormField>
              </>
            )}
            <div className="flex gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Prior authorization requirements depend on insurance type and requested medication. Our team will verify during review.
              </p>
            </div>
          </div>
        )}

        {/* Step 6: Document Upload */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <StepHeader number={6} title="Upload Supporting Documents" subtitle="Attach all relevant documents for this referral" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "Referral Form", type: "referral_form", required: true },
                { name: "Demographics", type: "demographics", required: false },
                { name: "Insurance Card - Front", type: "insurance_front", required: formData.hasInsurance },
                { name: "Insurance Card - Back", type: "insurance_back", required: formData.hasInsurance },
                { name: "Chart Notes", type: "chart_notes", required: false },
                { name: "Prior Authorization Form", type: "pa_form", required: false },
              ].map((docType) => {
                const uploaded = formData.documents.find((d) => d.type === docType.type);
                return (
                  <DocumentUploadCard
                    key={docType.type}
                    name={docType.name}
                    required={docType.required}
                    uploaded={uploaded}
                    onUpload={() => {
                      const newDoc: UploadedDocument = {
                        name: docType.name,
                        fileName: `${docType.type.replace(/_/g, "-")}.pdf`,
                        fileSize: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
                        type: docType.type,
                      };
                      updateField("documents", [...formData.documents, newDoc]);
                    }}
                    onRemove={() => {
                      updateField(
                        "documents",
                        formData.documents.filter((d) => d.type !== docType.type)
                      );
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Step 7: Review */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <StepHeader number={7} title="Review Your Referral" subtitle="Please review all information before submitting" />

            <ReviewSection
              icon={User}
              title="Patient Information"
              onEdit={() => setCurrentStep(0)}
              fields={[
                { label: "Name", value: `${formData.firstName} ${formData.lastName}` || "—" },
                { label: "DOB", value: formData.dob || "—" },
                { label: "Gender", value: formData.gender || "—" },
                { label: "Phone", value: formData.phone || "—" },
                { label: "Email", value: formData.email || "—" },
              ]}
            />

            <ReviewSection
              icon={Pill}
              title="Clinical Information"
              onEdit={() => setCurrentStep(1)}
              fields={[
                { label: "Diagnosis", value: formData.diagnosisCode || "—" },
                { label: "Drug", value: formData.drugRequested || "—" },
                { label: "Dosing", value: formData.dosing || "—" },
                { label: "Quantity", value: formData.quantity || "—" },
                { label: "Urgency", value: formData.urgency },
              ]}
            />

            <ReviewSection
              icon={Stethoscope}
              title="Provider Information"
              onEdit={() => setCurrentStep(2)}
              fields={[
                { label: "Provider", value: formData.providerName || "—" },
                { label: "NPI", value: formData.npi || "—" },
                { label: "Phone", value: formData.providerPhone || "—" },
              ]}
            />

            <ReviewSection
              icon={Shield}
              title="Insurance & Prior Auth"
              onEdit={() => setCurrentStep(3)}
              fields={[
                { label: "Has Insurance", value: formData.hasInsurance ? "Yes" : "No" },
                { label: "Type", value: formData.insuranceType || "—" },
                { label: "PA Required", value: formData.paRequired ? "Yes" : "No" },
                { label: "PA Handled By", value: formData.paHandledBy || "—" },
              ]}
            />

            <ReviewSection
              icon={Files}
              title="Documents"
              onEdit={() => setCurrentStep(5)}
              fields={formData.documents.map((d) => ({
                label: d.name,
                value: `${d.fileName} (${d.fileSize})`,
              }))}
            />

            <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary/50 border border-border">
              <input
                type="checkbox"
                checked={formData.confirmAccuracy}
                onChange={(e) => updateField("confirmAccuracy", e.target.checked)}
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
          onClick={() => currentStep === 0 ? navigate("/clinic/referrals") : setCurrentStep(currentStep - 1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 0 ? "Cancel" : "Previous"}
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            Next: {steps[currentStep + 1].label}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!formData.confirmAccuracy || submitting}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Submit Referral
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/* Helper Components */

function StepHeader({ number, title, subtitle }: { number: number; title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
        Step {number} of 7
      </p>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function FormField({
  label,
  required,
  helper,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  );
}

function DocumentUploadCard({
  name,
  required,
  uploaded,
  onUpload,
  onRemove,
}: {
  name: string;
  required: boolean;
  uploaded?: UploadedDocument;
  onUpload: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed p-4 transition-all duration-200",
        uploaded
          ? "border-success/40 bg-success/5"
          : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {uploaded ? (
            <CheckCircle className="h-4 w-4 text-success" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        {required && !uploaded && (
          <span className="text-xs text-destructive font-medium">Required</span>
        )}
      </div>
      {uploaded ? (
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {uploaded.fileName} · {uploaded.fileSize}
          </div>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive hover:text-destructive" onClick={onRemove}>
            Remove
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onUpload}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Choose File
        </Button>
      )}
    </div>
  );
}

function ReviewSection({
  icon: Icon,
  title,
  onEdit,
  fields,
}: {
  icon: React.ElementType;
  title: string;
  onEdit: () => void;
  fields: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={onEdit}>
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.label}>
            <p className="text-xs text-muted-foreground">{f.label}</p>
            <p className="text-sm font-medium text-foreground">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
