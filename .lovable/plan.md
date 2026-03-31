

## Admin Document Viewer — Real Documents Side-by-Side

The page already has a split-panel layout (lines 227–369) with DocumentViewer on the left and extracted data on the right. The DocumentViewer component currently shows a placeholder. We need to wire it to real API data.

### Files to edit

**1. Add `getDocumentUrl` to `src/lib/api.ts`** (adminApi section)

```ts
async getDocumentUrl(docId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/admin/documents/${docId}/url`, {
    headers: getHeaders(),
  });
  return handleResponse(response);
}
```

**2. Rewrite `src/components/DocumentViewer.tsx`**

Replace the mock placeholder component with a real document viewer:

- **Props change**: Accept `documents` as array of `{ id, original_filename, file_type, doc_type, uploaded_at }` (backend shape) plus optional `className`
- **On tab select**: Call `adminApi.getDocumentUrl(docId)` to get presigned URL, cache it in state (`Record<string, { url: string; fetchedAt: number }>`)
- **Render by file type**:
  - `application/pdf` → `<iframe src={url} className="w-full h-full" />`
  - Images (`image/jpeg`, `image/png`, `image/tiff`) → `<img src={url} className="object-contain w-full h-full" />`, click opens in new tab
- **URL expiration**: Track `fetchedAt` timestamp. If >4 min old, show a "Refresh" button overlay that re-fetches the URL
- **Download button** in toolbar: opens presigned URL in new tab
- **Empty state**: "No documents uploaded for this referral"
- **Tab labels**: Show `original_filename` with `doc_type` badge (e.g., "referral_form")
- Keep existing zoom controls for images; hide zoom for PDFs (iframe handles its own zoom)

**3. Update `src/pages/admin/AdminReferralReview.tsx`**

- Add state: `const [documents, setDocuments] = useState<any[]>([]);`
- In the existing `useEffect` (line 32), after fetching the referral, also fetch documents:
  ```ts
  const docsRes = await adminApi.getReferralDocuments(id);
  setDocuments(docsRes.items || docsRes || []);
  ```
- Pass real documents to DocumentViewer: `<DocumentViewer documents={documents} />`
- Add doc count badge next to StatusBadge in the top bar: `<Badge variant="secondary">{documents.length} docs</Badge>`
- Remove the `ReferralDocument` mock type import from DocumentViewer

### Responsive behavior
Already handled — the existing layout uses `flex-col lg:flex-row` (line 227). No changes needed.

### Technical notes
- `adminApi.getReferralDocuments` already exists in `api.ts` at the clinic level (`clinicApi`); need to check if admin version exists or reuse the clinic one
- Presigned URL caching prevents unnecessary re-fetches when switching between tabs
- The `getReferralDocuments` endpoint is called via `GET /admin/referrals/{id}/documents` — need to add this to adminApi if not present (currently only `clinicApi` has it)

