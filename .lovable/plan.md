

## Preview PDF Before Approve — Admin Review Flow

### Overview
Update the bottom action bar to be status-aware, add a "Send to Pharmacy" action with its API endpoint, and change the approve flow to stay on the page instead of navigating away.

### Files to edit

**1. `src/lib/api.ts`** — Add `deliverReferral` to adminApi
```ts
async deliverReferral(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/referrals/${id}/deliver`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
}
```

**2. `src/pages/admin/AdminReferralReview.tsx`**

#### a. Update `handleApprove` (line 159)
After approve succeeds, instead of `navigate("/admin/referrals")`, re-fetch the referral to update status in-place:
```ts
const data = await adminApi.getReferral(id!);
const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
setReferral(mapped);
setEditedData(mapped.extracted_data || {});
```

#### b. Add `handleDeliver` handler
```ts
const handleDeliver = async () => {
  try {
    await adminApi.deliverReferral(id!);
    toast({ title: "Sent to Pharmacy", description: "Referral has been sent to the pharmacy." });
    const data = await adminApi.getReferral(id!);
    const mapped = { ...data, drug: data.drug_requested, blocked: data.preferred_pharmacy_blocked };
    setReferral(mapped);
  } catch (err: any) {
    toast({ title: "Error", description: err.message || "Failed to send", variant: "destructive" });
  }
};
```

#### c. Add `deliverOpen` state for confirm modal

#### d. Replace bottom action bar (lines 655–663)
Make buttons status-conditional:

```text
Status-based button visibility:
┌────────────────────┬──────────┬─────────┬────────┬──────────────────┐
│ Status             │ Preview  │ Reject  │ Approve│ Send to Pharmacy │
├────────────────────┼──────────┼─────────┼────────┼──────────────────┤
│ ready_for_review   │ ✓        │ ✓       │ ✓      │                  │
│ uploaded           │ ✓        │ ✓       │ ✓      │                  │
│ approved_to_send   │ ✓        │         │        │ ✓                │
│ sent_to_pharmacy   │ ✓        │         │        │                  │
│ rejected           │ ✓        │         │        │                  │
└────────────────────┴──────────┴─────────┴────────┴──────────────────┘
```

- "Preview PDF" always shown (outline-primary, existing handler)
- Helper text "Preview the PDF before approving" shown for review statuses
- "Send to Pharmacy" button uses `variant="success"`, opens a ConfirmModal
- "Approve" button shown only for reviewable statuses

#### e. Add deliver ConfirmModal (after reject modal)
```tsx
<ConfirmModal
  open={deliverOpen}
  onOpenChange={setDeliverOpen}
  title="Send to Pharmacy"
  description={`Send ${referral.patient_name}'s referral to the pharmacy?`}
  confirmLabel="Send"
  variant="success"
  onConfirm={handleDeliver}
/>
```

### No other files affected

