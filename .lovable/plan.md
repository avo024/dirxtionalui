

## Update Step 3 Review Cards in CreateReferral.tsx

Four display-only changes to the review section (lines 908–956):

### 1. Patient Information ReviewCard (lines 909–915)
Replace the 3-field grid with a 6-field `grid-cols-3` layout showing Name, DOB, Phone, Gender, Address (formatted), and Email — using `patientMode` to switch between `newPatient` and `selectedPatient` data.

### 2. Clinical Information ReviewCard (lines 918–937)
Replace the current content (which has upload/manual branching) with a single 9-field `grid-cols-3` grid: Diagnosis (ICD-10), Drug Requested, Dose/Strength, Quantity, Frequency, Therapy Type, Refill (Yes/No), Administration, Duration.

### 3. Provider Information ReviewCard (lines 940–956)
Replace with 8-field `grid-cols-3` grid: Provider Name (using `providerFirstName + providerLastName`), NPI, Phone, Specialty, Address (formatted), Fax, Email, Signature Date.

### 4. Add Insurance ReviewCard (after line 956, before Documents card)
New `ReviewCard` with `Shield` icon showing: Has Insurance, Primary Insurance, Member ID, plus conditional Secondary Insurance and Notes fields. `Shield` is already imported.

No logic, state, or API changes — purely display updates.

