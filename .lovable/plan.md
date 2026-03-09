

## Plan: Wire ReferralDetail.tsx to Real API

Two files need changes:

### File 1: `src/lib/api.ts` — Add `getReferralDocuments` method

Add a new method to `clinicApi` (before `uploadDocument` at line 51):

```typescript
async getReferralDocuments(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referrals/${id}/documents`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
},
```

### File 2: `src/pages/clinic/ReferralDetail.tsx` — Full rewrite

All 12 changes from the user's spec applied as a single rewrite:

1. **Imports** (lines 1-16): Replace `mockReferrals` import with `clinicApi`, `mapReferralFromBackend`, add `useEffect`, add `Skeleton`.

2. **Status types/maps** (lines 18-40): Replace `ReferralStatus` with local type including `approved_to_send`. Update all three Record objects (`statusDescriptions`, `statusTimelineIcons`, `statusTimelineColors`) to use `approved_to_send` instead of `approved`.

3. **Component state** (lines 42-60): Replace mock lookup with `useState` for `referral`, `documents`, `loading`, `error`. Add `useEffect` calling `clinicApi.getReferral(id)` + `clinicApi.getReferralDocuments(id)`, applying `mapReferralFromBackend`. Add loading skeleton and error UI.

4. **Extracted data destructuring** (line 62): Replace `const { extracted_data: data } = referral` with safe destructuring into `patient`, `clinical`, `provider`, `insurance`, `priorAuth` variables with `|| {}` fallbacks.

5. **Overview tab field references** (lines 159-259): Replace all `data.patient.X` with `patient.X || '—'`, `data.clinical.X` with `clinical.X || '—'`, etc. Patient name becomes `` `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || '—' ``.

6. **Approved/Sent banner** (lines 117-141): Change `"approved"` checks to `"approved_to_send"`. Make `pharmacy_location` and `pharmacy_contact` conditionally rendered. Update label to "Approved & Sending".

7. **Status progress tracker** (lines 213-249): Change step array to `["uploaded", "processing", "approved_to_send", "sent_to_pharmacy"]`. Update `stepLabels`. Simplify progress logic using `stepOrder.indexOf`.

8. **Documents tab** (lines 266-292): Replace `referral.documents` with `documents` state. Handle empty state. Use `doc.file_name || doc.name` and `doc.uploaded_at || doc.created_at`.

9. **History tab** (lines 296-332): Replace `referral.history` reverse-map with a generated timeline based on `referral.status` and `created_at`/`updated_at` timestamps showing progression through statuses.

10. **Helper components** (lines 385-458): Unchanged — `InfoCard`, `Field`, `CopyableField` stay as-is.

### Technical Notes

- The `Referral` type from `src/types/index.ts` still uses `"approved"` as a status value. The local `ReferralStatus` type in this file will include `"approved_to_send"` to match the real backend, and the component will cast/use `any` where needed to avoid type conflicts until the shared type is updated.
- Loading state uses `Skeleton` components (already available in the project).
- Error state shows message + "Back to Referrals" button.
- Documents are fetched in parallel with the referral via `Promise.all`, with a `.catch` fallback for documents so the page still loads if that endpoint fails.

