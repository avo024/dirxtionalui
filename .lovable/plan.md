

## Plan: Expand Info Cards & Upgrade Insurance/PA in ReferralDetail.tsx

**File:** `src/pages/clinic/ReferralDetail.tsx`

### Change 1: Patient Information card (lines 203-221)
Replace the current 5-field grid with 16 fields: First Name, Last Name, MI, DOB, Gender, Phone (copyable), Email (copyable), Address, City, State, Zip Code, Height, Weight, Allergies, Authorized Representative, Representative Phone.

### Change 2: Clinical Information card (lines 223-232)
Replace the current 5-field grid with 12 fields: Diagnosis (ICD-10), Drug Requested, Therapy Type, Date Therapy Initiated, Duration of Therapy, Dose/Strength, Frequency, Quantity, Length of Therapy / #Refills, Administration, Administration Location, Refill / Renewal.

### Change 3: Provider Information card (lines 234-243)
Replace the current 5-field grid with 15 fields: First Name, Last Name, Specialty, NPI, DEA Number, Address, City, State, Zip Code, Phone, Fax, Email, Office Contact Person, Requestor, Signature Date.

### Change 4: Insurance & PA card (lines 294-302)
Replace with expanded read-only section:
- Insurance fields: Has Insurance, Primary Insurance (conditional), Member ID (conditional), Secondary Insurance (conditional), Insurance Notes (conditional)
- Divider, then PA section reading from root-level `referral` object
- PA Required field, then conditionally: PA Status badge (with color-coded variants for approved/denied/pending/null), PA Number & Expiration (when approved), Denial Reason (when denied), PA Handled By

All fields are read-only. No new imports needed — existing `Field`, `CopyableField`, `InfoCard`, and utility functions are reused.

