

## Admin Review Page Overhaul

### Summary
Add a 3-tab layout to the admin referral detail right panel (Summary / All Fields / Notes), rename the AI extract button, and replace the sidebar badge with a live API count.

### Changes

**File 1: `src/pages/admin/AdminReferralReview.tsx`** (major rewrite of right panel)

**Tab structure** — Replace the single scrollable right panel (lines 302-662) with `<Tabs>` component:
- **"Summary"** (default): 6 stacked cards, single-column, compact
- **"All Fields"**: The existing accordion with all 76+ editable fields (move current content here unchanged)
- **"Notes (N)"**: Move the notes section (lines 665-726) into this tab, show count in tab label

**Summary tab cards:**

1. **Patient** — Name, DOB, Phone, full address (one line). Show confidence dots. Missing critical fields (name, DOB) in red italic.

2. **Insurance** — Plan name, Member ID, Group #, RxBIN, RxPCN. Yellow warning if no insurance. Missing Member ID flagged red.

3. **Medication** — Drug as "Brand (generic)", Dose, Frequency, Route. PA Required badge (green "No PA Required" or amber "PA Required: reason"). Missing drug name flagged red.

4. **PA Management** — Reuse existing `<PAManagementCard>` component inline. Remove the standalone instance at line 599.

5. **Diagnosis & Clinical** — ICD-10 codes + descriptions, clinical justification, prior failed meds list. If `editedData.dermatology` exists, show BSA%, POEM, Itch NRS, severity. Missing ICD-10 flagged red.

6. **Prescriber** — Name, NPI, Phone, Fax. Missing NPI flagged red.

**Confidence indicators on Summary**: For each displayed field, look up confidence from `conf` object. If < 0.85 show amber dot, if < 0.5 show red dot. No dot if missing or >= 0.85.

**Rename button** (line 284): Change "Extract with AI" to "Re-extract", add `RefreshCw` icon, change to `variant="ghost"` with muted styling.

**Remove** the "AI Extracted Data" label badge (lines 288-291).

**File 2: `src/components/layout/AdminSidebar.tsx`**

- Remove `mockReferrals` import and hardcoded `processingCount`
- Add `useState` + `useEffect` to fetch `GET /admin/referrals/counts` on mount
- Show `counts.needs_review` as badge on "All Referrals" (hide if 0)
- Change badge color from `bg-warning` to `bg-primary text-white`

**File 3: `src/lib/api.ts`**

- Add `getReferralCounts()` method to `adminApi`: `GET /admin/referrals/counts`

### Technical details

- Helper component `SummaryField` for rendering label/value with optional confidence dot and missing-field flag
- `MissingFlag` component: `<span className="text-destructive italic text-sm">Missing — check source documents</span>`
- Critical fields list: `patient.first_name`, `patient.last_name`, `patient.dob`, `insurance.primary_member_id`, `clinical.drug_requested`, `clinical.diagnosis_icd10_primary`, `provider.npi`
- Notes tab label dynamically shows count: `Notes (${notes.length})`
- Bottom action bar and all modals remain untouched

### Files changed
- `src/pages/admin/AdminReferralReview.tsx`
- `src/components/layout/AdminSidebar.tsx`
- `src/lib/api.ts`

