

## Plan: Fix Tabs, Filters & Status Labels Across 4 Files

### File 1: `src/pages/admin/AdminReferralsList.tsx`

**Lines 11-17** — Replace filters array with:
- All, Needs Review (`ready_for_review`), Rejected (`rejected`), Approved & Sent (`approved_to_send`)
- Removes the "Sent" tab, renames and reorders "Approved"

No filter logic changes needed — line 73 already does `r.status === activeFilter` directly.

### File 2: `src/pages/clinic/ReferralsList.tsx`

**Lines 21-27** — Replace filters array with:
- All, In Review (`processing`), Needs Attention (`rejected`), Sent (`approved_to_send`)
- Removes "Approved" tab, fixes "Sent" to use real backend value

**Lines 58-64** — Update `getFilterCount`: remove `approved` and `sent` cases, add `approved_to_send` case matching `r.status === "approved_to_send"`.

**Lines 75-80** — Update `filtered` logic: remove `approved` and `sent` cases, add `approved_to_send` case.

### File 3: `src/data/mockData.ts`

**Lines 1-6** — Expand `ReferralStatus` type to add `ready_for_review` and `approved_to_send`.

**Lines 852-858** — Update `statusLabels`: add `approved_to_send: "Sent to Pharmacy"` and `ready_for_review: "In Review"`.

**Lines 860-866** — Update `adminStatusLabels`: add `approved_to_send: "Approved & Sent"` and `ready_for_review: "Needs Review"`.

### File 4: `src/components/StatusBadge.tsx`

**Lines 6-12** — Add `approved_to_send` and `ready_for_review` entries to `statusStyles`.

**Lines 14-20** — Add entries to `dotStyles`.

**Lines 22-28** — Add entries to `statusIcons`.

**Lines 39-40** — After `const Icon = statusIcons[status]`, add safety fallback that returns a plain gray badge with the raw status string if `Icon` or `statusStyles[status]` is undefined.

