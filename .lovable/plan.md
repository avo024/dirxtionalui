

## Fix "Extract with AI" Button Status Check

**File**: `src/pages/admin/AdminReferralReview.tsx`, line 215

**Change**: Update the condition to also show the button for `ready_for_review` status.

```tsx
// Before
{referral.status === 'uploaded' && (

// After
{(referral.status === 'uploaded' || referral.status === 'ready_for_review') && (
```

Single line edit. No other files affected.

