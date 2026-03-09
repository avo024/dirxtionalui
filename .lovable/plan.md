

## Plan: Add Pharmacy Column to Admin Referrals Table

**File:** `src/components/ReferralTable.tsx`

Two insertions, both gated behind `isAdmin`:

1. **Header** (after line 90, the Status `<TableHead>`): Add a new `<TableHead>` for "Pharmacy", only shown when `isAdmin`.

2. **Body** (after line 136, the Status `<TableCell>`): Add a new `<TableCell>` showing `ref.pharmacy_name || "—"`, only shown when `isAdmin`. Uses same `text-sm text-muted-foreground` styling as the Clinic column.

