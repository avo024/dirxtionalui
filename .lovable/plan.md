

## Fix PA Summary Card on Patient Detail

### Problem
The "Prior Authorization Status" card (lines 223-267) reads from stale patient-level fields (`patient.last_drug`, `patient.pa_status`, `patient.pa_expiration_date`). The real data is already fetched in `medications` state.

### Solution

**File: `src/pages/clinic/PatientDetail.tsx`** (lines 222-267)

Replace the single-row PA summary with a medications-driven layout:

1. **Derive `activeDrugs`** from `medications.filter(m => m.is_active)` (can reuse `sortedMedications` filtered to active)

2. **If no active drugs**: Show empty state message — "No active medications — medications appear here after a referral is approved."

3. **If active drugs exist**: Show a summary row per drug with 4 columns:
   - **Current Drug**: `drug_name` + dosage in lighter text
   - **PA Status**: Use existing `getDrugPABadge()` helper (already at line 34) to render colored badge
   - **PA Expiration**: Formatted date, with warning color if within 30 days, red if expired
   - **Last Filled**: `last_filled` date if available

4. **Expiration alerts**: For each drug with expiring/expired PA, show the appropriate warning/error alert below

5. Also remove the `Pill` icon from the referrals table drug column (line 297) — same fix applied elsewhere but missed here.

### Files changed
- `src/pages/clinic/PatientDetail.tsx` — rewrite PA summary card, remove pill icon from referrals table

