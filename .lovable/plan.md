

## Fix API token regression after invite flow

### Root cause
The token-provider wiring is actually **intact and correct**:
- `src/hooks/useApi.ts` registers the token getter via `setAuthTokenProvider(getToken)` inside a `useEffect` ✓
- `src/lib/api.ts` `getHeaders()` / `getAuthHeaders()` are `async`, await `currentToken()`, and attach `Authorization: Bearer <token>` ✓
- `src/contexts/AuthContext.tsx` calls `useApi()` at the top of `AuthProvider`, which mounts on app boot inside `<BrowserRouter>` ✓

The 401s are caused by **the wrong API base URL**, not missing headers. `.env` currently contains only the three Auth0 variables — `VITE_API_URL` is **missing entirely**, so `api.ts` falls back to `http://localhost:5000`. From the deployed preview that resolves to nothing useful, and any request that does land on the real backend would hit a wrong path if `/api` was previously appended.

### Changes

**1. `.env`** — add the missing `VITE_API_URL` pointing at the real backend root (no `/api` suffix, since routes live at `/admin/*`, `/clinics/*`, `/invites/*`):
```
VITE_API_URL=https://app.dirxctional.com
```
(Keep the three existing Auth0 vars untouched.)

**2. Sanity-verify token wiring is still intact** — no code changes expected, but I'll re-confirm:
- `useApi()` invoked once in `AuthProvider` (mounts on boot, not behind a route guard)
- `setAuthTokenProvider` / `currentToken` round-trip in `api.ts`
- Every fetch in `clinicApi`, `adminApi`, `pharmacyApi`, `patientApi` calls `await getHeaders()` (it does)

If the regression turns out to be more than the env var (e.g. a stale build referencing `/api`), I'll grep for any hardcoded `/api/` path in `src/` and strip it.

### Files touched
- `.env` — add `VITE_API_URL`

### Verification (after restart)
- DevTools Network → reload `/admin/dashboard`
- Request URL should be `https://app.dirxctional.com/admin/referrals/counts` (no `/api`)
- Request Headers should include `authorization: Bearer eyJ…`
- Response: `200` JSON, not `401`

### Risk note
If the correct backend host is different (e.g. `https://api.dirxctional.com` to match the Auth0 audience), tell me before I commit and I'll use that instead. The audience `https://api.dirxctional.com` is just the JWT audience claim — it does not have to equal the API host.

