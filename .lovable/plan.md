

## Fix: Support `reference_number` field alias in PA data loading

**File:** `src/components/PAManagementCard.tsx`, line 102

Replace `if (paData.ref_number) setRefNumber(paData.ref_number);` with:

```ts
if (paData.reference_number || paData.ref_number) setRefNumber(paData.reference_number || paData.ref_number);
```

This ensures the component loads the reference number from either `reference_number` or `ref_number` in the PA data, accommodating both field naming conventions from the backend.

