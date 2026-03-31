

## Map upload zone names to backend doc_type values in `src/lib/api.ts`

**What**: The `uploadDocument` method currently passes the raw zone name (`required`, `insurance`, `additional`) as `doc_type`. The backend expects specific values like `referral_form`, `insurance_front`, `chart_notes`.

**Change** (line 70 in `uploadDocument`):

Replace `formData.append('doc_type', docType);` with a mapping lookup:

```ts
const docTypeMap: Record<string, string> = {
  required: 'referral_form',
  insurance: 'insurance_front',
  additional: 'chart_notes',
};
formData.append('doc_type', docTypeMap[docType] || docType);
```

Single edit in `src/lib/api.ts`, no other files affected.

