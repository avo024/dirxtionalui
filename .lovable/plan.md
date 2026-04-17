

## Patient Detail UI Polish + Bridge Program PA Bypass (Admin)

### File 1: `src/pages/clinic/PatientDetail.tsx`

**1A. PA Status card subtitle (line ~226-229)**
- Change card header to keep title "Prior Authorization Status" + add subtitle below: `<p className="text-xs text-muted-foreground">Most recent active medication</p>`
- Also update `activeDrugs` rendering: instead of `.map(allActive)`, take only the **most recent** active drug (sort by `last_filled` or `created_at` desc, take first one) so the subtitle is truthful. Currently it shows ALL active drugs.

**1B. Rename "Medications" tab to "Prior Authorizations" (line 219)**
- Change `<TabsTrigger value="medications">Medications</TabsTrigger>` → `Prior Authorizations`. Keep the `value="medications"` key unchanged (no need to refactor state).

**1C. Drug card status tags (lines ~563-608)**
- Extend `getDrugPABadge` to handle all states:
  - `is_active === false` → "Discontinued" gray tag
  - `pa_status === 'denied'` → "PA Denied" red
  - `pa_status === 'pending' || 'submitted' || 'processing'` → "PA Pending" yellow
  - `pa_status === 'approved'` + expiration logic (already handled)
  - null/empty → "No PA" gray
- Remove `opacity-60` on inactive cards. Replace with `bg-muted/30` background. Remove the small "Discontinued" subtext under drug name (the badge in the corner now handles it).

### File 2: `src/pages/admin/AdminReferralReview.tsx`

**2A. PA auto-detection card — bridge program (line ~439-447)**
Wrap the existing badge logic so that if `referral.is_bridge_program === true`, render a purple badge instead:
```tsx
{referral.is_bridge_program ? (
  <Badge className="bg-purple-100 text-purple-700 border-purple-200">
    Bridge Program — PA not required
  </Badge>
) : referral.pa_required ? (...) : (...)}
```

**2B. PA Management card — hide for bridge program (line ~452)**
Wrap render: only show `<PAManagementCard>` when `!referral.is_bridge_program`. Otherwise render a simple card: "PA not required for Bridge Program referrals" (purple-tinted, matching style).

**2C. Send to Pharmacy button — skip PA letter check (line ~957-972)**
Update `blocked` calc: `const blocked = !referral.is_bridge_program && paLetterInfo?.drug_requires_pa && !paLetterInfo?.has_letter;`

### File 3: `src/components/DeliveryConfirmModal.tsx`

**3A. Hide PA Letter from "Always included" + skip block when bridge program**
- Add `isBridgeProgram` from `referral.is_bridge_program` (already passed via `referral` prop).
- Override:
  - `hasPALetter` → force false if `isBridgeProgram` (so the PA Letter line disappears)
  - `paMissing` → force false if `isBridgeProgram` (so Confirm & Send is enabled)

### Files changed
- `src/pages/clinic/PatientDetail.tsx` — PA card subtitle + most-recent slice, tab rename, drug card status tags, remove gray-out
- `src/pages/admin/AdminReferralReview.tsx` — Bridge Program PA detection badge, hide PAManagementCard, skip PA letter block on Send button
- `src/components/DeliveryConfirmModal.tsx` — Bridge Program: hide PA Letter line, skip PA-missing block

