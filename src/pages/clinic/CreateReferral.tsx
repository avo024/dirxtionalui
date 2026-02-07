import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  "Patient Information",
  "Clinical Information",
  "Provider Information",
  "Insurance",
  "Prior Authorization",
  "Document Upload",
];

export default function CreateReferral() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleSubmit = () => {
    toast({ title: "Referral Submitted!", description: "Your referral has been created and is being processed." });
    navigate("/clinic/referrals");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Create New Referral</h1>
        <p className="text-muted-foreground mt-1">Fill out the form below to submit a new referral</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors",
              i < currentStep
                ? "bg-primary text-primary-foreground"
                : i === currentStep
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-secondary text-muted-foreground"
            )}>
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 rounded", i < currentStep ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-foreground">Step {currentStep + 1}: {steps[currentStep]}</p>

      {/* Form content */}
      <div className="rounded-xl border border-border bg-card p-6 card-shadow">
        {currentStep === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fname">First Name</Label>
              <Input id="fname" placeholder="John" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lname">Last Name</Label>
              <Input id="lname" placeholder="Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="patient@email.com" />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="icd10">Diagnosis ICD-10 Code</Label>
              <Input id="icd10" placeholder="L20.9" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drug">Drug Requested</Label>
              <Input id="drug" placeholder="Dupixent" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dosing">Dosing</Label>
              <Input id="dosing" placeholder="300mg every 2 weeks" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" placeholder="2 syringes" />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Checkbox id="refill" />
              <Label htmlFor="refill" className="text-sm font-normal">This is a refill</Label>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provname">Provider Name</Label>
              <Input id="provname" placeholder="Dr. Emily Martinez" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npi">NPI Number</Label>
              <Input id="npi" placeholder="1234567890" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="provaddr">Address</Label>
              <Input id="provaddr" placeholder="5500 Greenville Ave, Dallas, TX 75206" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provphone">Phone</Label>
              <Input id="provphone" placeholder="(214) 555-0200" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sigdate">Signature Date</Label>
              <Input id="sigdate" type="date" />
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="hascard" />
              <Label htmlFor="hascard" className="text-sm font-normal">Patient has insurance card</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="insnotes">Insurance Notes</Label>
              <Textarea id="insnotes" placeholder="Insurance plan details, member ID, group number, etc." rows={4} />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox id="parequired" />
              <Label htmlFor="parequired" className="text-sm font-normal">Prior Authorization is required</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="pahandled" />
              <Label htmlFor="pahandled" className="text-sm font-normal">Prior Authorization handled by us</Label>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Upload required documents for this referral</p>
            {["Referral Form", "Demographics", "Insurance Front", "Insurance Back", "Chart Notes"].map((doc) => (
              <div key={doc} className="flex items-center justify-between rounded-lg border border-dashed border-border p-4 hover:border-primary/40 transition-colors">
                <span className="text-sm font-medium text-foreground">{doc}</span>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  Choose File
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        {currentStep < steps.length - 1 ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} className="bg-success hover:bg-success/90 text-success-foreground">
            <Check className="h-4 w-4 mr-2" />
            Submit Referral
          </Button>
        )}
      </div>
    </div>
  );
}
