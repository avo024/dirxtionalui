## Fix Step 3 Pharmacy Bridge-Program Filter

### Problem
In `CreateReferral.tsx` Step 3, the pharmacy list is incorrectly filtered to only `accepts_no_insurance` pharmacies when the user selects "bridge program" on Step 2. The backend does **not** track `supports_bridge_program` on pharmacies, so this filter is wrong and shows misleading empty-state copy.

### Changes
1. **Remove bridge-based pharmacy filtering (lines 352-367)**
   - Delete `availablePharmacies` useMemo that filters by `accepts_no_insurance` when `insuranceChoice === "bridge"`
   - Delete useEffect that auto-clears pharmacy selection when bridge is chosen
   - Everywhere the component currently uses `availablePharmacies`, use `pharmacies` instead

2. **Fix Step 3 UI copy (lines 940-944, 962-965)**
   - Replace conditional helper text with single generic sentence about defaulting to clinic's preferred pharmacy
   - Replace conditional empty-state with generic: "No pharmacies available for your clinic. Contact DiRxctional support."

3. **Fix default-pharmacy warning (line 946)**
   - Remove `insuranceChoice !== "bridge"` guard so the warning shows for all users without a default pharmacy

4. **Fix defaultId logic in PharmacyPicker (lines 971-977)**
   - Remove special bridge-only null-default handling
   - Pass `defaultPharmacyId` directly, always

5. **Fix InsuranceChoiceSection bridge copy (lines 1298, 1354-1360)**
   - Change radio sub-label from "Pharmacy list will be filtered" to generic text
   - Remove "On Step 3 you'll only see pharmacies that support bridge programs" info box

### What stays unchanged
- Step 2 bridge-program toggle itself
- `is_bridge_program` / `insurance_not_provided` submission payload (still sent to backend correctly)
- Admin-side flows
- `PharmacyPicker.tsx` component itself (only its caller changes)

### Test plan
1. Upload referral → Step 2 select "No bridge program" → Step 3 shows all pharmacies
2. Upload referral → Step 2 select "Yes, bridge program" → Step 3 shows same full pharmacy list
3. Verify `is_bridge_program: true` is still sent on submission