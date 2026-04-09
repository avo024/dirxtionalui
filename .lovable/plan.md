

## Auto-trigger AI Extraction on Clinic Submit

### Overview
After documents are uploaded in the clinic submit flow, call `POST /referrals/{id}/finalize` to trigger background AI extraction. Fire-and-forget — failures are logged but don't block the user.

### Changes

**1. `src/lib/api.ts`** — Add `finalizeReferral` to `clinicApi`

```ts
async finalizeReferral(referralId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/referrals/${referralId}/finalize`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return handleResponse(response);
},
```

**2. `src/pages/clinic/CreateReferral.tsx`** — Call finalize after document uploads

Insert between line 256 (end of file upload loop) and line 258 (`setSubmitting(false)`):

```ts
// Step 5: Trigger AI extraction in background (fire-and-forget)
try {
  await clinicApi.finalizeReferral(referral.id);
} catch (err) {
  console.warn('Finalize call failed (admin can retry manually):', err);
}
```

**3. `src/pages/clinic/CreateReferral.tsx`** — Update success message (line 299)

Change from:
> "Referral submitted successfully! Our team will review your documents and process the referral. You'll receive a notification when it's been approved."

To:
> "Referral submitted successfully! Our AI is extracting the details now and our team will review within the hour."

### No other files affected

