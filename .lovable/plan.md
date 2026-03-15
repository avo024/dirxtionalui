

## Add optional demographic fields to New Patient form

Four changes in `src/pages/clinic/CreateReferral.tsx`:

### 1. Expand `newPatient` state (lines 63-66)
Add `mi`, `height`, `weight`, `allergies`, `authorizedRepresentative`, `authorizedRepresentativePhone` to initial state.

### 2. Add form fields after Zip/State (after line 481)
Insert the 6 new fields (MI, Height, Weight, Allergies spanning 2 cols, Authorized Representative, Representative Phone) inside the existing `<div className="space-y-3">` block, right after the State/Zip grid.

### 3. Update `createPatient` payload (lines 169-179)
Add `mi`, `height`, `weight`, `allergies`, `authorized_representative`, `authorized_representative_phone` to the API call.

### 4. Update reset in "Existing Patient" onClick (line 352)
Add the new fields to the `setNewPatient` reset call.

No Patient Details accordion exists in Step 2, so no removal needed.

