

## Fix Step 1 (Select Patient) in CreateReferral.tsx

Seven changes, all in `src/pages/clinic/CreateReferral.tsx`:

### 1. Patient search results display (lines 367-368)
Already using `getPatientName(p)` and `p.last_drug` — these are correct. No change needed.

### 2. Selected patient summary card (lines 373-388)
Already using `getPatientName`, `getPatientPhone`, `selectedPatient.last_drug`, `selectedPatient.last_dosage`, and `PAStatusBadge`. No change needed.

### 3. Update `newPatient` state (line 63)
Add `email`, `gender`, `address`, `city`, `state`, `zip` fields to initial state.

### 4. Replace New Patient form (lines 407-428)
Replace the current 4-field form with the expanded version containing: First Name, Last Name, DOB, Gender (Select), Phone, Email, Address, City, State + Zip side-by-side. All required except Email.

### 5. Update validation `canProceedStep1` (line 224)
Add checks for `gender`, `address`, `city`, `state`, `zip`.

### 6. Update `createPatient` call in `handleSubmit` (lines 166-170)
Add `email`, `gender`, `address`, `city`, `state`, `zip` to the payload.

### 7. Auto-fill drug on patient selection (line 361)
After `setSelectedPatient(p)`, add logic to prefill `manualData.drugRequested` from `p.last_drug`.

