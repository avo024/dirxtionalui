

## Show PA Status on Clinic Side

### What's needed
The backend already returns `pa_status` and `pa_data` fields. We need to surface them in 3 places.

### Changes

**1. New component: `src/components/ClinicPABadge.tsx`**
Small reusable badge for PA status display across all three locations:
- `null`/empty → render nothing
- `"pending"` → gray "PA Pending"
- `"processing"` → blue "PA In Progress"
- `"submitted"` → amber "PA Submitted"
- `"approved"` → green "PA Approved"
- `"denied"` → red "PA Denied"

**2. Referral list table — `src/components/ReferralTable.tsx`**
Add a "PA Status" column after the existing "Status" column, **only for clinic** userType. Render `<ClinicPABadge status={ref.pa_status} />`. Skip column entirely if admin (admin already has their own PA column).

**3. Referral detail — `src/pages/clinic/ReferralDetail.tsx`**
The PA section already exists at lines 428-467 with Insurance & PA card. It already shows pa_status badges and conditional fields for approved/denied/pending. Need to add:
- `"processing"` status display: blue badge "PA In Progress" + message "DiRxtional team is working on PA"
- `"submitted"` status display: amber badge "PA Submitted" + submitted date from `referral.pa_submission_date`
- When `pa_required` is true and no `pa_status`: show "PA required — DiRxtional team will handle this"

**4. Patient detail referrals table — `src/pages/clinic/PatientDetail.tsx`**
Add a "PA Status" column header + cell to the referrals table (lines 306-342). Render `<ClinicPABadge status={ref.pa_status} />`.

**5. Types — `src/types/index.ts`**
Add `pa_number`, `pa_denial_reason`, `pa_submission_date` to `Referral` interface if not already present (some are already there via `pa_status`, `pa_expiration_date`).

### Files changed
- `src/components/ClinicPABadge.tsx` (new)
- `src/components/ReferralTable.tsx`
- `src/pages/clinic/ReferralDetail.tsx`
- `src/pages/clinic/PatientDetail.tsx`
- `src/types/index.ts`

