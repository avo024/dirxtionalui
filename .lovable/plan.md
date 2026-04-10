

## Fix Referral Tab Filtering + Dashboard Stat Card Navigation

### 1. ReferralsList.tsx — Filter logic overhaul

**Update filters array** (line 21-26): Change filter values to `in_review`, `rejected`, `sent_to_pharmacy`.

**Add `filterStatusMap`** and use it in both `getFilterCount` and the `filtered` memo:
```
in_review → ["processing", "ready_for_review", "uploaded"]
rejected → ["rejected"]
sent_to_pharmacy → ["sent_to_pharmacy", "approved_to_send"]
```

**Read query param**: Import `useSearchParams`, initialize `activeFilter` from `searchParams.get('filter') || 'all'`.

### 2. ClinicDashboard.tsx — Fix stat card links

- "In Review" link → `?filter=in_review`
- "Sent to Pharmacy" link → `?filter=sent_to_pharmacy`
- Also fix `sentCount` (line 43-45) to include `sent_to_pharmacy` status, not just `approved_to_send`

### Files changed
- `src/pages/clinic/ReferralsList.tsx`
- `src/pages/clinic/ClinicDashboard.tsx`

