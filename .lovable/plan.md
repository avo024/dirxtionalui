

## Auth0 SDK Integration - Full Implementation

This is a large, multi-file refactor. I'll execute it in one pass once approved.

### Discovery notes
- Current auth: mock `AuthContext` with `localStorage` + role picker on `Login.tsx`
- `api.ts` has ~40 functions split across `clinicApi`, `adminApi`, `pharmacyApi`, `patientApi` — all use `getHeaders()` / `getAuthHeaders()` (FormData uploads)
- Layouts (`AdminLayout`, `ClinicLayout`) and many pages call `useAuth()` for `user.role`
- `AuthContext` decides role; Auth0 will replace `isAuthenticated`, but **role still needs to come from somewhere** (Auth0 token claim, or temporary fallback)

### Plan

**1. Install dependency**
- `bun add @auth0/auth0-react@^2`

**2. `src/main.tsx`** — wrap `<App />` in `<Auth0Provider>` reading env vars, with `onRedirectCallback` restoring history.

**3. `src/hooks/useApi.ts`** (new) — exports `useApi()` returning `{ getToken }` that calls `getAccessTokenSilently` when authenticated, swallows errors → undefined.

**4. `src/lib/api.ts`** — refactor:
- `getHeaders(token?)`: adds `Authorization: Bearer ${token}` if present; keeps `X-DEV-ADMIN: 1` only when `import.meta.env.DEV`
- `getAuthHeaders(token?)`: same Bearer logic for FormData uploads
- Every method in `clinicApi`, `adminApi`, `pharmacyApi`, `patientApi` gets `token?: string` as **first parameter**, passes to `getHeaders(token)`

**5. `src/pages/Login.tsx`** — full rewrite:
- Centered card, logo, tagline, single "Log In" primary button → `loginWithRedirect()`
- `isLoading` → spinner; `isAuthenticated` → `<Navigate to="/" replace />`
- Removes all role-picker / mock text

**6. `src/contexts/AuthContext.tsx`** — refactor to bridge Auth0 → existing app:
- Replace mock state with `useAuth0()` underneath
- Derive `isAuthenticated` from Auth0
- Derive `role` from Auth0 token custom claim (e.g. `https://dirxctional.com/role`); fallback `clinic_user` if missing — keeps existing layout guards working
- `logout()` calls Auth0 `logout({ logoutParams: { returnTo: window.location.origin } })`
- Removes mock `login()` (no longer used; Login page calls `loginWithRedirect` directly)

**7. Update API callers (priority pass)** — thread `getToken()` through:
- `src/pages/admin/AdminDashboard.tsx`
- `src/pages/clinic/ClinicDashboard.tsx`
- `src/components/layout/AdminSidebar.tsx` (badge counts)
- `src/pages/admin/AdminReferralsList.tsx`, `AdminReferralReview.tsx`
- `src/pages/clinic/ReferralsList.tsx`, `ReferralDetail.tsx`, `CreateReferral.tsx`, `PatientsList.tsx`, `PatientDetail.tsx`, `CreatePatient.tsx`
- `src/pages/admin/PharmaciesList.tsx`, `PharmacyDetail.tsx`, `BlockedReferrals.tsx`
- Remaining less-critical callers: `// TODO: thread token` comment

Pattern at each site:
```tsx
const { getToken } = useApi();
// inside async fn:
const token = await getToken();
const data = await adminApi.getReferrals(token, { status: 'needs_review' });
```

**8. Logout button** — add to `AdminLayout.tsx` and `ClinicLayout.tsx` top-right header strip (small button with `LogOut` icon + user name from `useAuth0().user`). Calls Auth0 `logout`.

**9. Verification (run after edits)**
```bash
grep -l "Auth0Provider" src/main.tsx
grep -rl "useAuth0\|@auth0/auth0-react" src/
grep -rl "Mock authentication" src/   # must be empty
grep -l "loginWithRedirect" src/pages/Login.tsx
```

### Risks / notes
- **Role claim**: Auth0 won't include a `role` claim by default. Until Auth0 Action is configured to inject one, all logged-in users will fall back to `clinic_user`, and admins won't reach `/admin/*`. I'll add a clear `// TODO` and `console.warn` when no role claim is found. The dev-bypass header keeps backend working in dev.
- **InviteAcceptPage** uses `X-DEV-ADMIN` directly — I'll leave it (public flow, pre-auth) and mark with TODO.
- **`AuthContext` shape preserved** so existing `useAuth()` consumers keep compiling (`user`, `isAuthenticated`, `logout`); the now-unused `login(role)` becomes a no-op with deprecation warning to avoid breaking imports.

### Files touched
- `package.json` (+ lockfile) — add `@auth0/auth0-react`
- `src/main.tsx` — Auth0Provider wrap
- `src/hooks/useApi.ts` — new
- `src/lib/api.ts` — token-aware headers + every method signature
- `src/pages/Login.tsx` — full rewrite
- `src/contexts/AuthContext.tsx` — bridge to Auth0
- `src/components/layout/AdminLayout.tsx`, `ClinicLayout.tsx` — logout button
- ~12 page/component files — thread `getToken()` into API calls

