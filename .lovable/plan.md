

## Update Patient Information Tab with All Fields

Single file: `src/pages/clinic/PatientDetail.tsx`

### Change 1: Basic Information card grid (lines ~219-248)
Replace the current `grid grid-cols-2 gap-4` inside the Basic Information card with the expanded version containing 15 fields: Full Name, DOB, Gender, Phone (with copy), Email (with copy), Address, City, State, Zip, Height, Weight, Allergies, Authorized Representative, Representative Phone, Alternate Phone.

### Change 2: Insurance Information card grid (lines ~258-263)
Replace the current insurance grid with the updated version that uses `PAStatusBadge` component for PA Status display and keeps Insurance Type, Plan Details, and PA Expiration.

Both grids use the existing `InfoField` helper component and `copyToClipboard` function already present in the file. No new imports needed.

