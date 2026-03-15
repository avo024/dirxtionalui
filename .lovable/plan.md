

## Merge patient demographics into `extracted_data.patient` in handleSubmit

Two edits in `src/pages/clinic/CreateReferral.tsx`:

### 1. Build `patientSection` and merge it (lines 198–204)

Replace the current manual/upload branching with logic that:
- Builds a `patientSection` object from either `newPatient` state (new mode) or `selectedPatient` fields (existing mode)
- For manual method: merges `patientSection` into `mapped.patient`
- For upload method: sets `extracted_data = { patient: patientSection }`

```typescript
// Build patient section from actual patient data (before the if/else)
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
    patient: { ...(mapped.patient || {}), ...patientSection },
  };
  referralPayload.drug_requested = manualData.drugRequested;
} else {
  referralPayload.extracted_data = { patient: patientSection };
  referralPayload.drug_requested = "";
}
```

This replaces lines 198–204 in the current file. No other changes needed.

