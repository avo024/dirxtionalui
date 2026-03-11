

## Plan: Fix handleMarkComplete in PAManagementCard.tsx

**File:** `src/components/PAManagementCard.tsx`

**Single change** — In the `handleMarkComplete` function, replace `approval_duration: paNumber,` with three fields:

```
pa_number: paNumber,
ref_number: refNumber,
approval_duration: "",
```

This ensures the PA number and reference number are sent as separate fields rather than stuffing the PA number into `approval_duration`.

