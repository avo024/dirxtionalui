

## Fix `uploadDocument` headers in `src/lib/api.ts`

Since `getHeaders()` includes `Content-Type: application/json` which breaks FormData uploads, we need a two-part fix:

### 1. Add `getAuthHeaders()` helper (after line 21)
A new function that returns only auth headers (no Content-Type):
```ts
function getAuthHeaders(): HeadersInit {
  return { 'X-DEV-ADMIN': '1' };
}
```

### 2. Update `uploadDocument` (lines 73–75)
Replace the inline `{ 'X-DEV-ADMIN': '1' }` with `getAuthHeaders()`.

This centralizes the auth header so if it changes later (e.g., real JWT tokens), `uploadDocument` picks it up automatically — while keeping Content-Type out for FormData.

