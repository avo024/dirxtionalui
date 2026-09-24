import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ConfidenceIndicator } from "@/components/ConfidenceIndicator";
import { TagListEditor } from "@/components/TagListEditor";
import { DrugCombobox } from "@/components/DrugCombobox";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ExtractionEditorProps {
  referral: any;
  /** Called after any successful save (section save or insurance-expired
   *  toggle) so the caller can refetch the referral. */
  onSaved: () => void;
}

/**
 * The editable extraction sections — Patient · Prescriber · Prescription /
 * Medication · Insurance · Prior Authorization · Pharmacy (+ Dermatology
 * when present) — extracted from the legacy `AdminReferralReview` page so
 * both it and the v2 workstation's "All Fields" tab share one editor
 * (phase 4b, flow-script build-plan §4).
 */
export function ExtractionEditor({ referral, onSaved }: ExtractionEditorProps) {
  const [editedData, setEditedData] = useState<any>(referral?.extracted_data || {});
  const [changedSections, setChangedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    setEditedData(referral?.extracted_data || {});
    setChangedSections(new Set());
    // Reset local edits whenever the referral (or its saved extraction) changes —
    // mirrors the legacy page's behaviour of resetting editedData after a fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referral?.id, referral?.extracted_data]);

  const conf = editedData?.meta?.confidence || editedData?.confidence || {};

  const updateField = (section: string, field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: value,
      },
    }));
    setChangedSections((prev) => new Set(prev).add(section));
  };

  const updateNestedField = (section: string, subsection: string, field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [subsection]: {
          ...prev?.[section]?.[subsection],
          [field]: value,
        },
      },
    }));
    setChangedSections((prev) => new Set(prev).add(section));
  };

  const updateArrayField = (section: string, field: string, items: string[]) => {
    setEditedData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: items,
      },
    }));
    setChangedSections((prev) => new Set(prev).add(section));
  };

  const handleSaveSectionChanges = async (section: string) => {
    if (!referral?.id) return;
    try {
      await adminApi.updateExtractedData(referral.id, editedData);
      toast({
        title: "Changes Saved",
        description: `${section.charAt(0).toUpperCase() + section.slice(1)} information has been updated`,
      });
      setChangedSections((prev) => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
      onSaved();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const SectionSaveButton = ({ section }: { section: string }) =>
    changedSections.has(section) ? (
      <Button onClick={(e) => { e.stopPropagation(); handleSaveSectionChanges(section); }} variant="outline" size="sm" className="ml-auto">Save</Button>
    ) : null;

  return (
    <Accordion type="multiple" defaultValue={["patient", "clinical", "insurance"]} className="space-y-3">

      {/* ── Patient Information ── */}
      <AccordionItem value="patient" className="rounded-xl border border-border bg-card card-shadow px-4">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center justify-between w-full pr-4">
            <span>Patient Information</span>
            <SectionSaveButton section="patient" />
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-3 gap-3 pb-2">
            <FieldEdit label="First Name" value={editedData?.patient?.first_name || ""} confidence={conf["patient.first_name"] ?? conf.first_name} onChange={(v) => updateField("patient", "first_name", v)} />
            <FieldEdit label="Last Name" value={editedData?.patient?.last_name || ""} confidence={conf["patient.last_name"] ?? conf.last_name} onChange={(v) => updateField("patient", "last_name", v)} />
            <FieldEdit label="MI" value={editedData?.patient?.middle_initial || editedData?.patient?.mi || ""} onChange={(v) => updateField("patient", "middle_initial", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Date of Birth" value={editedData?.patient?.dob || ""} confidence={conf["patient.dob"] ?? conf.dob} onChange={(v) => updateField("patient", "dob", v)} />
            <FieldEdit label="Gender" value={editedData?.patient?.gender || ""} onChange={(v) => updateField("patient", "gender", v)} />
            <FieldEdit label="Phone (Primary)" value={editedData?.patient?.phone_primary || editedData?.patient?.phone || ""} confidence={conf["patient.phone_primary"] ?? conf.phone} onChange={(v) => updateField("patient", "phone_primary", v)} />
            <FieldEdit label="Phone (Secondary)" value={editedData?.patient?.phone_secondary || ""} onChange={(v) => updateField("patient", "phone_secondary", v)} />
            <FieldEdit label="Email" value={editedData?.patient?.email || ""} className="col-span-2" onChange={(v) => updateField("patient", "email", v)} />
            <FieldEdit label="Address" value={editedData?.patient?.address || ""} className="col-span-2" onChange={(v) => updateField("patient", "address", v)} />
          </div>
          <div className="grid grid-cols-3 gap-3 pb-2">
            <FieldEdit label="City" value={editedData?.patient?.city || ""} onChange={(v) => updateField("patient", "city", v)} />
            <FieldEdit label="State" value={editedData?.patient?.state || ""} onChange={(v) => updateField("patient", "state", v)} />
            <FieldEdit label="Zip" value={editedData?.patient?.zip || ""} onChange={(v) => updateField("patient", "zip", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Height" value={editedData?.patient?.height || ""} onChange={(v) => updateField("patient", "height", v)} />
            <FieldEdit label="Weight" value={editedData?.patient?.weight || ""} onChange={(v) => updateField("patient", "weight", v)} />
          </div>
          <div className="pb-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Allergies</Label>
            <Textarea value={editedData?.patient?.allergies || ""} onChange={(e) => updateField("patient", "allergies", e.target.value)} className="text-sm" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="MRN" value={editedData?.patient?.mrn || ""} onChange={(v) => updateField("patient", "mrn", v)} />
            <FieldEdit label="Language" value={editedData?.patient?.language || ""} onChange={(v) => updateField("patient", "language", v)} />
            <FieldEdit label="Preferred Contact Method" value={editedData?.patient?.preferred_contact_method || ""} onChange={(v) => updateField("patient", "preferred_contact_method", v)} />
          </div>
          {(editedData?.patient?.guardian?.name || editedData?.patient?.authorized_representative) && (
            <div className="border-t border-border pt-3 mt-2">
              <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Guardian / Representative</Label>
              <div className="grid grid-cols-3 gap-3">
                <FieldEdit label="Name" value={editedData?.patient?.guardian?.name || editedData?.patient?.authorized_representative || ""} onChange={(v) => updateNestedField("patient", "guardian", "name", v)} />
                <FieldEdit label="Relationship" value={editedData?.patient?.guardian?.relationship || ""} onChange={(v) => updateNestedField("patient", "guardian", "relationship", v)} />
                <FieldEdit label="Phone" value={editedData?.patient?.guardian?.phone || editedData?.patient?.authorized_representative_phone || ""} onChange={(v) => updateNestedField("patient", "guardian", "phone", v)} />
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      {/* ── Prescriber Information ── */}
      <AccordionItem value="provider" className="rounded-xl border border-border bg-card card-shadow px-4">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center justify-between w-full pr-4">
            <span>Prescriber Information</span>
            <SectionSaveButton section="provider" />
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Provider Name" value={editedData?.provider?.name || ""} onChange={(v) => updateField("provider", "name", v)} />
            <FieldEdit label="NPI" value={editedData?.provider?.npi || ""} confidence={conf["provider.npi"] ?? conf.npi} onChange={(v) => updateField("provider", "npi", v)} />
            <FieldEdit label="Specialty" value={editedData?.provider?.specialty || ""} className="col-span-2" onChange={(v) => updateField("provider", "specialty", v)} />
            <FieldEdit label="Phone" value={editedData?.provider?.phone || ""} onChange={(v) => updateField("provider", "phone", v)} />
            <FieldEdit label="Fax" value={editedData?.provider?.fax || ""} onChange={(v) => updateField("provider", "fax", v)} />
            <FieldEdit label="Office / Facility Name" value={editedData?.provider?.office_name || ""} className="col-span-2" onChange={(v) => updateField("provider", "office_name", v)} />
            <FieldEdit label="Office Address" value={editedData?.provider?.office_address || editedData?.provider?.address || ""} className="col-span-2" onChange={(v) => updateField("provider", "office_address", v)} />
          </div>
          <div className="grid grid-cols-3 gap-3 pb-2">
            <FieldEdit label="City" value={editedData?.provider?.office_city || editedData?.provider?.city || ""} onChange={(v) => updateField("provider", "office_city", v)} />
            <FieldEdit label="State" value={editedData?.provider?.office_state || editedData?.provider?.state || ""} onChange={(v) => updateField("provider", "office_state", v)} />
            <FieldEdit label="Zip" value={editedData?.provider?.office_zip || editedData?.provider?.zip || ""} onChange={(v) => updateField("provider", "office_zip", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Collaborating Physician" value={editedData?.provider?.collaborating_physician || ""} onChange={(v) => updateField("provider", "collaborating_physician", v)} />
            <FieldEdit label="Collaborating NPI" value={editedData?.provider?.collaborating_npi || ""} onChange={(v) => updateField("provider", "collaborating_npi", v)} />
            <FieldEdit label="DEA Number" value={editedData?.provider?.dea_number || ""} onChange={(v) => updateField("provider", "dea_number", v)} />
            <FieldEdit label="Tax ID" value={editedData?.provider?.tax_id || ""} onChange={(v) => updateField("provider", "tax_id", v)} />
            <FieldEdit label="Signature Date" value={editedData?.provider?.signature_date || ""} onChange={(v) => updateField("provider", "signature_date", v)} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ── Prescription / Clinical ── */}
      <AccordionItem value="clinical" className="rounded-xl border border-border bg-card card-shadow px-4">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center justify-between w-full pr-4">
            <span>Prescription</span>
            <SectionSaveButton section="clinical" />
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="pb-3">
            <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
              Drug Requested
              {(conf["clinical.drug_requested"] ?? conf.drug_requested) !== undefined && (
                <ConfidenceIndicator confidence={conf["clinical.drug_requested"] ?? conf.drug_requested} />
              )}
            </Label>
            <DrugCombobox
              value={editedData?.clinical?.drug_requested || ""}
              onChange={(v) => updateField("clinical", "drug_requested", v)}
              fetchDrugs={adminApi.getFormularyDrugs}
              onSelectItem={(item) => {
                updateField("clinical", "brand_name", item.drug_name);
                if (item.generic_name) {
                  updateField("clinical", "generic_name", item.generic_name);
                }
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Brand Name" value={editedData?.clinical?.brand_name || ""} onChange={(v) => updateField("clinical", "brand_name", v)} />
            <FieldEdit label="Generic Name" value={editedData?.clinical?.generic_name || ""} onChange={(v) => updateField("clinical", "generic_name", v)} />
            <FieldEdit label="Primary ICD-10" value={editedData?.clinical?.diagnosis_icd10_primary || editedData?.clinical?.diagnosis_icd10 || ""} confidence={conf["clinical.diagnosis_icd10_primary"] ?? conf.diagnosis_icd10} onChange={(v) => updateField("clinical", "diagnosis_icd10_primary", v)} />
            <FieldEdit label="Diagnosis Description" value={editedData?.clinical?.diagnosis_description || ""} onChange={(v) => updateField("clinical", "diagnosis_description", v)} />
          </div>
          <div className="pb-3">
            <TagListEditor label="All Diagnoses (ICD-10)" items={editedData?.clinical?.diagnoses || []} onChange={(items) => updateArrayField("clinical", "diagnoses", items)} placeholder="Add ICD-10 code..." />
          </div>
          <div className="pb-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Dosing Directions</Label>
            <Textarea value={editedData?.clinical?.dosing_directions || editedData?.clinical?.dosing || ""} onChange={(e) => updateField("clinical", "dosing_directions", e.target.value)} className="text-sm" rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3 pb-2">
            <FieldEdit label="Dose Amount" value={editedData?.clinical?.dose_amount || ""} onChange={(v) => updateField("clinical", "dose_amount", v)} />
            <FieldEdit label="Dose Frequency" value={editedData?.clinical?.dose_frequency || editedData?.clinical?.frequency || ""} onChange={(v) => updateField("clinical", "dose_frequency", v)} />
            <FieldEdit label="Route" value={editedData?.clinical?.route || editedData?.clinical?.administration || ""} onChange={(v) => updateField("clinical", "route", v)} />
          </div>
          <div className="grid grid-cols-3 gap-3 pb-2">
            <FieldEdit label="Quantity" value={editedData?.clinical?.quantity || ""} onChange={(v) => updateField("clinical", "quantity", v)} />
            <FieldEdit label="Day Supply" value={editedData?.clinical?.day_supply || ""} onChange={(v) => updateField("clinical", "day_supply", v)} />
            <FieldEdit label="Refills" value={editedData?.clinical?.refills || editedData?.clinical?.length_of_therapy || ""} onChange={(v) => updateField("clinical", "refills", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Device Type</Label>
              <Combobox
                size="sm"
                className="h-8 text-sm"
                placeholder="Select..."
                value={editedData?.clinical?.device_type || ""}
                onValueChange={(v) => updateField("clinical", "device_type", v)}
                options={["Pre-filled syringe", "Pre-filled pen", "Auto-injector", "Oral", "Other"]}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Urgency</Label>
              <Combobox
                size="sm"
                className="h-8 text-sm"
                placeholder="Select..."
                value={editedData?.clinical?.urgency || ""}
                onValueChange={(v) => updateField("clinical", "urgency", v)}
                options={[
                  { value: "routine", label: "Routine" },
                  { value: "urgent", label: "Urgent" },
                  { value: "stat", label: "Stat" },
                ]}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 pb-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={editedData?.clinical?.is_new_start || false} onCheckedChange={(checked) => updateField("clinical", "is_new_start", checked)} />
              <Label className="text-xs font-normal">New Start</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editedData?.clinical?.is_refill || false} onCheckedChange={(checked) => updateField("clinical", "is_refill", checked)} />
              <Label className="text-xs font-normal">Refill</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Loading Dose" value={editedData?.clinical?.loading_dose || ""} onChange={(v) => updateField("clinical", "loading_dose", v)} />
            <FieldEdit label="Maintenance Dose" value={editedData?.clinical?.maintenance_dose || ""} onChange={(v) => updateField("clinical", "maintenance_dose", v)} />
          </div>
          <div className="pb-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Ship To</Label>
            <Combobox
              size="sm"
              className="h-8 text-sm"
              placeholder="Select..."
              value={editedData?.clinical?.ship_to || ""}
              onValueChange={(v) => updateField("clinical", "ship_to", v)}
              options={["Patient's Home", "Doctor's Office", "Other"]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2 items-center">
            <div className="flex items-center gap-2">
              <Checkbox checked={editedData?.clinical?.loading_dose_received || false} onCheckedChange={(checked) => updateField("clinical", "loading_dose_received", checked)} />
              <Label className="text-xs font-normal">Loading Dose Received?</Label>
            </div>
            {editedData?.clinical?.loading_dose_received && (
              <FieldEdit label="Start Date" value={editedData?.clinical?.loading_dose_start_date || ""} onChange={(v) => updateField("clinical", "loading_dose_start_date", v)} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 pb-2 items-center">
            <div className="flex items-center gap-2">
              <Checkbox checked={editedData?.clinical?.tb_ruled_out || false} onCheckedChange={(checked) => updateField("clinical", "tb_ruled_out", checked)} />
              <Label className="text-xs font-normal">TB Ruled Out?</Label>
            </div>
            {editedData?.clinical?.tb_ruled_out && (
              <FieldEdit label="TB Test Date" value={editedData?.clinical?.tb_test_date || ""} onChange={(v) => updateField("clinical", "tb_test_date", v)} />
            )}
          </div>
          <div className="pb-3">
            <TagListEditor label="Prior Failed Medications" items={editedData?.clinical?.prior_failed_medications || []} onChange={(items) => updateArrayField("clinical", "prior_failed_medications", items)} placeholder="Add medication..." />
          </div>
          <div className="pb-2">
            <Label className="text-xs text-muted-foreground mb-1 block">Clinical Justification (for PA)</Label>
            <Textarea value={editedData?.clinical?.clinical_justification || ""} onChange={(e) => updateField("clinical", "clinical_justification", e.target.value)} className="text-sm" rows={3} />
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ── Insurance ── */}
      <AccordionItem id="extraction-insurance" value="insurance" className={cn("rounded-xl border bg-card card-shadow px-4", referral?.insurance_expired ? "border-orange-300" : "border-border")}>
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center justify-between w-full pr-4">
            <span>Insurance</span>
            <div className="flex items-center gap-2">
              {referral?.insurance_expired && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-[10px]">EXPIRED</Badge>
              )}
              <SectionSaveButton section="insurance" />
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <Checkbox
                checked={referral?.insurance_expired || false}
                onCheckedChange={async (checked) => {
                  if (!referral?.id) return;
                  try {
                    await adminApi.markInsuranceExpired(referral.id, !!checked);
                    toast({
                      title: checked ? "Insurance marked as expired" : "Insurance expiration cleared",
                      description: checked ? "The clinic has been notified." : "Expiration flag removed.",
                    });
                    onSaved();
                  } catch (err: any) {
                    toast({ title: "Error", description: err.message, variant: "destructive" });
                  }
                }}
              />
              <Label className="text-xs font-normal text-orange-700">Insurance Expired</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={editedData?.insurance?.has_insurance_card || editedData?.insurance?.has_insurance || false} onCheckedChange={(checked) => updateField("insurance", "has_insurance_card", checked)} />
              <Label className="text-xs font-normal">Has Insurance Card</Label>
            </div>
            <Label className="text-xs font-semibold text-muted-foreground block">Primary Insurance</Label>
            <div className="grid grid-cols-2 gap-3">
              <FieldEdit label="Plan Name" value={editedData?.insurance?.primary_plan_name || editedData?.insurance?.primary_insurance_name || ""} className="col-span-2" onChange={(v) => updateField("insurance", "primary_plan_name", v)} />
              <FieldEdit label="Member ID" value={editedData?.insurance?.primary_member_id || ""} onChange={(v) => updateField("insurance", "primary_member_id", v)} />
              <FieldEdit label="Group Number" value={editedData?.insurance?.primary_group_number || ""} onChange={(v) => updateField("insurance", "primary_group_number", v)} />
              <FieldEdit label="Policy ID" value={editedData?.insurance?.primary_policy_id || ""} onChange={(v) => updateField("insurance", "primary_policy_id", v)} />
              <FieldEdit label="Carrier Phone" value={editedData?.insurance?.primary_carrier_phone || ""} onChange={(v) => updateField("insurance", "primary_carrier_phone", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldEdit label="RxBIN" value={editedData?.insurance?.primary_rxbin || ""} onChange={(v) => updateField("insurance", "primary_rxbin", v)} />
              <FieldEdit label="RxPCN" value={editedData?.insurance?.primary_rxpcn || ""} onChange={(v) => updateField("insurance", "primary_rxpcn", v)} />
            </div>

            {(editedData?.insurance?.secondary_plan_name || editedData?.insurance?.secondary_insurance_name || editedData?.insurance?.secondary_member_id) && (
              <div className="border-t border-border pt-3">
                <Label className="text-xs font-semibold text-muted-foreground mb-2 block">Secondary Insurance</Label>
                <div className="grid grid-cols-2 gap-3">
                  <FieldEdit label="Plan Name" value={editedData?.insurance?.secondary_plan_name || editedData?.insurance?.secondary_insurance_name || ""} className="col-span-2" onChange={(v) => updateField("insurance", "secondary_plan_name", v)} />
                  <FieldEdit label="Member ID" value={editedData?.insurance?.secondary_member_id || ""} onChange={(v) => updateField("insurance", "secondary_member_id", v)} />
                  <FieldEdit label="Group Number" value={editedData?.insurance?.secondary_group_number || ""} onChange={(v) => updateField("insurance", "secondary_group_number", v)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <FieldEdit label="Policyholder Name" value={editedData?.insurance?.policyholder_name || ""} onChange={(v) => updateField("insurance", "policyholder_name", v)} />
              <FieldEdit label="Policyholder Relationship" value={editedData?.insurance?.policyholder_relationship || ""} onChange={(v) => updateField("insurance", "policyholder_relationship", v)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Benefit Type</Label>
              <Combobox
                size="sm"
                className="h-8 text-sm"
                placeholder="Select..."
                value={editedData?.insurance?.pharmacy_benefit_or_medical_benefit || ""}
                onValueChange={(v) => updateField("insurance", "pharmacy_benefit_or_medical_benefit", v)}
                options={[
                  { value: "pharmacy", label: "Pharmacy Benefit" },
                  { value: "medical", label: "Medical Benefit" },
                  { value: "unknown", label: "Unknown" },
                ]}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Notes</Label>
              <Textarea value={editedData?.insurance?.notes || ""} onChange={(e) => updateField("insurance", "notes", e.target.value)} className="text-sm" rows={2} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ── Prior Authorization ── */}
      <AccordionItem value="prior_auth" className="rounded-xl border border-border bg-card card-shadow px-4">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center justify-between w-full pr-4">
            <span>Prior Authorization (referral metadata)</span>
            <SectionSaveButton section="prior_auth" />
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 pb-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={editedData?.prior_auth?.required || false} onCheckedChange={(checked) => updateField("prior_auth", "required", checked)} />
                <Label className="text-xs font-normal">PA Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editedData?.prior_auth?.handled_by_clinic ?? editedData?.prior_auth?.handled_by_us ?? false} onCheckedChange={(checked) => updateField("prior_auth", "handled_by_clinic", checked)} />
                <Label className="text-xs font-normal">Handled by Clinic</Label>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ── Dermatology (conditional) ── */}
      {editedData?.dermatology && (
        <AccordionItem value="dermatology" className="rounded-xl border border-border bg-card card-shadow px-4">
          <AccordionTrigger className="text-sm font-semibold">
            <div className="flex items-center justify-between w-full pr-4">
              <span>Dermatology Assessment <span className="text-xs font-normal text-muted-foreground">(for PA documentation)</span></span>
              <SectionSaveButton section="dermatology" />
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-4 gap-3 pb-2">
              <FieldEdit label="BSA %" value={editedData?.dermatology?.bsa_percentage || ""} onChange={(v) => updateField("dermatology", "bsa_percentage", v)} />
              <FieldEdit label="IGA Score" value={editedData?.dermatology?.iga_score || ""} onChange={(v) => updateField("dermatology", "iga_score", v)} />
              <FieldEdit label="EASI Score" value={editedData?.dermatology?.easi_score || ""} onChange={(v) => updateField("dermatology", "easi_score", v)} />
              <FieldEdit label="PASI Score" value={editedData?.dermatology?.pasi_score || ""} onChange={(v) => updateField("dermatology", "pasi_score", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3 pb-2">
              <FieldEdit label="POEM Score" value={editedData?.dermatology?.poem_score || ""} onChange={(v) => updateField("dermatology", "poem_score", v)} />
              <FieldEdit label="Itch NRS Score" value={editedData?.dermatology?.itch_nrs_score || ""} onChange={(v) => updateField("dermatology", "itch_nrs_score", v)} />
              <FieldEdit label="Condition Severity" value={editedData?.dermatology?.condition_severity || ""} className="col-span-2" onChange={(v) => updateField("dermatology", "condition_severity", v)} />
            </div>
            <div className="space-y-3 pb-3">
              <TagListEditor label="Affected Body Areas" items={editedData?.dermatology?.affected_body_areas || []} onChange={(items) => updateArrayField("dermatology", "affected_body_areas", items)} placeholder="Add area..." />
              <TagListEditor label="Prior Topicals Tried" items={editedData?.dermatology?.prior_topicals_tried || []} onChange={(items) => updateArrayField("dermatology", "prior_topicals_tried", items)} placeholder="Add topical..." />
              <TagListEditor label="Prior Systemics Tried" items={editedData?.dermatology?.prior_systemics_tried || []} onChange={(items) => updateArrayField("dermatology", "prior_systemics_tried", items)} placeholder="Add systemic..." />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Checkbox checked={editedData?.dermatology?.phototherapy_tried || false} onCheckedChange={(checked) => updateField("dermatology", "phototherapy_tried", checked)} />
              <Label className="text-xs font-normal">Phototherapy Tried</Label>
            </div>
            <FieldEdit label="Date of Diagnosis" value={editedData?.dermatology?.date_of_diagnosis || ""} onChange={(v) => updateField("dermatology", "date_of_diagnosis", v)} />
          </AccordionContent>
        </AccordionItem>
      )}

      {/* ── Pharmacy ── */}
      <AccordionItem value="pharmacy" className="rounded-xl border border-border bg-card card-shadow px-4">
        <AccordionTrigger className="text-sm font-semibold">
          <div className="flex items-center justify-between w-full pr-4">
            <span>Pharmacy</span>
            <SectionSaveButton section="pharmacy" />
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-3 pb-2">
            <FieldEdit label="Preferred Pharmacy Name" value={editedData?.pharmacy?.preferred_pharmacy_name || ""} className="col-span-2" onChange={(v) => updateField("pharmacy", "preferred_pharmacy_name", v)} />
            <FieldEdit label="Phone" value={editedData?.pharmacy?.preferred_pharmacy_phone || ""} onChange={(v) => updateField("pharmacy", "preferred_pharmacy_phone", v)} />
            <FieldEdit label="Fax" value={editedData?.pharmacy?.preferred_pharmacy_fax || ""} onChange={(v) => updateField("pharmacy", "preferred_pharmacy_fax", v)} />
          </div>
        </AccordionContent>
      </AccordionItem>

    </Accordion>
  );
}

function FieldEdit({ label, value, confidence, className, onChange }: { label: string; value: string; confidence?: number; className?: string; onChange?: (newValue: string) => void }) {
  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mb-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {confidence !== undefined && <ConfidenceIndicator confidence={confidence} />}
      </div>
      <Input
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}
