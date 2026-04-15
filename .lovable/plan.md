

## Bridge Program: Upload Flow Toggle + Pharmacy Picker

### Summary
Add a "Patient has no insurance" toggle inside the Insurance Cards upload zone, and convert the Bridge Program modal into a two-step flow where the user must select a pharmacy before confirming.

### Changes

**File 1: `src/pages/clinic/CreateReferral.tsx`**

**1A. New state**
- `uploadHasInsurance` (boolean, default true) — controls the toggle in the upload flow
- `bridgePharmacyId` (string, default "") — selected pharmacy for bridge program
- `bridgePharmacyName` (string, default "") — display name
- `pharmacies` (array) — fetched pharmacy list
- `loadingPharmacies` (boolean) — loading state
- `bridgeStep` ("ask" | "pick") — which step the modal is on

**1B. Insurance toggle inside the Insurance Cards upload zone (lines 651-658)**

Replace the simple `<UploadZone>` for insurance with a custom container that includes:
- A toggle row at the top: "Patient has no insurance [switch]"
- When toggle ON: set `uploadHasInsurance = false`, trigger `setShowBridgeModal(true)`, dim the upload dropzone below
- When toggle OFF: reset `uploadHasInsurance = true`, `isBridgeProgram = false`, re-enable dropzone
- Show a purple "Bridge Program — [pharmacy name]" badge below the toggle when bridge is confirmed
- The upload dropzone renders below, disabled/dimmed when `uploadHasInsurance === false`

**1C. Bridge Program modal becomes two-step (lines 1024-1042)**

Step 1 ("ask"): Current Yes/No question — unchanged layout
- "No" → close modal, `isBridgeProgram = false`
- "Yes, Bridge Program" → transition to step 2 (set `bridgeStep = "pick"`), fetch `pharmacyApi.getPharmacies()` if not already loaded

Step 2 ("pick"): "Which pharmacy is handling the Bridge Program?"
- Dropdown of all active pharmacies from `pharmacyApi.getPharmacies()`
- "Confirm" button — disabled until a pharmacy is selected
- "Back" link to return to step 1
- On confirm: set `isBridgeProgram = true`, `bridgePharmacyId`, `bridgePharmacyName`, close modal

On modal close/cancel: reset `bridgeStep = "ask"`, `isBridgeProgram = false`

**1D. Submit payload (line 208)**

Add `target_pharmacy_id: bridgePharmacyId || undefined` to the referral payload when `isBridgeProgram` is true.

**1E. Upload flow validation (line 301)**

When `uploadHasInsurance === false` and `isBridgeProgram === false` (they said No to bridge), still allow proceeding — just no insurance files needed. When `isBridgeProgram === true`, also allow proceeding (bridge pharmacy selected).

**1F. Both toggles sync**

The manual entry "Has insurance card?" switch (line 847) and the upload flow toggle should both drive the same `isBridgeProgram` / `bridgePharmacyId` state. The modal is shared.

**File 2: `src/pages/clinic/CreateReferral.tsx` — UploadZone component**

No changes to the UploadZone component itself. The insurance zone will be replaced inline with a custom block that wraps an UploadZone with the toggle above it.

### Files changed
- `src/pages/clinic/CreateReferral.tsx` — all changes in one file (new state, insurance toggle in upload zone, two-step modal, payload update)

