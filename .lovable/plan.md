

## Wire CreateReferral.tsx to Real API

Nine changes across two files, exactly as specified by the user, with one correction: the import references `mapCreateReferralToBackend` which doesn't exist — the actual function is `mapManualFormToBackend`. We'll use that instead.

### File 1: `src/pages/clinic/CreateReferral.tsx`

**1. Imports** (lines 1-24)
- Remove `import { mockPatients, type Patient } from "@/data/mockData"`
- Change React import to `import { useState, useCallback, useMemo, useEffect, useRef } from "react"`
- Add `import { clinicApi } from "@/lib/api"` and `import { mapManualFormToBackend } from "@/lib/dataMapper"`

**2. Patient type** (after imports, ~line 24)
- Add inline `type Patient` with fields: `id`, `full_name?`, `first_name?`, `last_name?`, `dob?`, `phone_primary?`, `phone?`, `pa_status?`, `pa_expiration_date?`, `last_drug?`, `last_dosage?`

**3. Preselected patient logic** (lines 42-48)
- Remove `preselectedPatient` variable
- Initialize `currentStep` with `preselectedPatientId ? 1 : 0`
- Initialize `selectedPatient` as `null`
- Initialize `patientMode` with `preselectedPatientId ? "existing" : null`
- Add `useEffect` to fetch patient via `clinicApi.getPatient(preselectedPatientId)`

**4. Patient search** (lines 87-95)
- Replace `useMemo` with `useState<Patient[]>([])` + `useRef` for debounce timeout
- Add `useEffect` that debounces 300ms, calls `clinicApi.getPatients(patientSearch)`, sets results from `data.items`

**5. UploadedFile interface** (line 31-36)
- Add optional `file?: File` field

**6. Replace `simulateUpload`** (lines 106-119)
- New `handleRealFileUpload(file, zone)` that validates type and adds to state with the raw `File` object

**7. Upload zones** (lines 420, 428, 436)
- Replace `simulateUpload("required")` etc. with `document.getElementById('upload-required')?.click()` etc.
- Add three hidden `<input type="file">` elements before the upload zones

**8. Replace `handleSubmit`** (lines 133-139)
- Async function: create patient if new → build payload with `mapManualFormToBackend` → `clinicApi.createReferral` → upload files loop → set submitted. Error handling with toast.

**9. Update patient display fields** (lines 229-230, 284-285, 293-298, 301-303, 704-706)
- Use `patient.full_name || \`${patient.first_name || ''} ${patient.last_name || ''}\`.trim()` for name display
- Use `patient.phone_primary || patient.phone || '—'` for phone display

### File 2: `src/lib/api.ts`

- Add `createPatient` method to `clinicApi` (POST to `/patients`)
- `createReferral` and `uploadDocument` already exist in `clinicApi`, so no additions needed for those

### File 3: `src/lib/dataMapper.ts`

- No changes needed — we use existing `mapManualFormToBackend`

