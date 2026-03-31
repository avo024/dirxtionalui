

## Remove drug pre-fill from preselected patient useEffect

**File**: `src/pages/clinic/CreateReferral.tsx`

Remove the `last_drug` pre-fill block from the patient preselection `useEffect`, keeping only `setSelectedPatient(data)` and `setPatientMode("existing")` in the `.then()` callback.

**Before**:
```tsx
.then((data) => {
  setSelectedPatient(data);
  setPatientMode("existing");
  // Pre-fill manual form with existing patient data
  if (data.last_drug) {
    setManualData((prev) => ({
      ...prev,
      drugRequested: data.last_drug || "",
    }));
  }
})
```

**After**:
```tsx
.then((data) => {
  setSelectedPatient(data);
  setPatientMode("existing");
})
```

Single edit, no other files affected.

