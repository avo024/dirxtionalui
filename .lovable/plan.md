

## Fix DOB Display in Step 3 Review

**File**: `src/pages/clinic/CreateReferral.tsx`, line 912

Replace the raw DOB value for existing patients with a formatted date using `formatDateShort` (already imported).

**Change**:
```tsx
// Before
<ReviewField label="DOB" value={patientMode === "new" ? newPatient.dob : (selectedPatient?.dob || "—")} />

// After
<ReviewField label="DOB" value={
  patientMode === "new" 
    ? newPatient.dob 
    : selectedPatient?.dob 
      ? formatDateShort(selectedPatient.dob)
      : "—"
} />
```

Single line edit. No imports or other changes needed.

