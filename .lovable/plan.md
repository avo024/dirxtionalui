

## Fix patient mode switching state cleanup

Three one-line changes in `src/pages/clinic/CreateReferral.tsx`:

**1. Line 414** — Clear `selectedPatient` when switching to New Patient:
```
onClick={() => setPatientMode("new")
→
onClick={() => { setPatientMode("new"); setSelectedPatient(null); }}
```

**2. Line 352** — Reset `newPatient` form when switching to Existing Patient:
```
onClick={() => setPatientMode("existing")
→
onClick={() => { setPatientMode("existing"); setNewPatient({ firstName: "", lastName: "", dob: "", phone: "", email: "", gender: "", address: "", city: "", state: "", zip: "" }); }}
```

**3. Line 324** — Only show patient summary banner in existing patient mode:
```
{selectedPatient && currentStep > 0 && (
→
{selectedPatient && patientMode === "existing" && currentStep > 0 && (
```

