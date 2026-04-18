

## Invite Acceptance Flow + Hide Signup on Main Login

### Discovery
- `src/pages/InviteAcceptPage.tsx` already exists with old mock-auth flow (uses deprecated `login()` from AuthContext + `X-DEV-ADMIN`). It's wired to `/invite/:token` in `App.tsx`. Will replace contents to match new spec and rename concept to `AcceptInvite` (keep file or rename — see below).
- `src/main.tsx` has `onRedirectCallback` that just does `history.replaceState` — needs sessionStorage write for `inviteToken`.
- `src/pages/Login.tsx` calls `loginWithRedirect({ appState: { returnTo: "/" } })` with no `screen_hint` — Auth0 Universal Login currently shows signup link.
- `src/App.tsx` already imports `InviteAcceptPage` for `/invite/:token` (route is OUTSIDE layout guards — already public ✓).
- `useToast` is available at `@/hooks/use-toast` for the welcome toast.
- `VITE_API_URL` is read in existing `InviteAcceptPage` via `import.meta.env.VITE_API_URL || "http://localhost:5000"` — will reuse same fallback.

### Plan

**1. Replace `src/pages/InviteAcceptPage.tsx` → rename file to `AcceptInvite.tsx`**
- Delete `InviteAcceptPage.tsx`, create `src/pages/AcceptInvite.tsx`
- On mount: `GET ${VITE_API_URL}/invites/${token}` with NO auth header
- Three states: `404` → "Invite not found" card, `410` → "expired/used" card, `200` → invite card
- `200` card:
  - Heading: "You're invited to DiRxctional"
  - Subtitle: "Join {clinic_name} to manage specialty referrals"
  - "This invite is for: {email}" (read-only)
  - Primary "Create Account" → `loginWithRedirect({ authorizationParams: { screen_hint: 'signup', login_hint: email }, appState: { inviteToken: token, returnTo: '/' } })`
  - Secondary "Already have an account? Log in" → same but `screen_hint: 'login'`
- Loading spinner while fetching
- Error/404/410 cards include "Go to Login" button → `/login`
- No auth guard, no `useAuth()` calls — purely public

**2. `src/App.tsx`**
- Update import: `InviteAcceptPage` → `AcceptInvite` from `./pages/AcceptInvite`
- Route stays: `<Route path="/invite/:token" element={<AcceptInvite />} />` (already outside guards)

**3. `src/main.tsx`**
- Update `onRedirectCallback` to write `sessionStorage.setItem('pendingInviteToken', appState.inviteToken)` when present, before `history.replaceState`

**4. New component `src/components/InviteAccepter.tsx`**
- Renders nothing (returns `null`)
- Uses `useAuth0()` for `isAuthenticated` + `getAccessTokenSilently`
- Uses `useToast()` from `@/hooks/use-toast`
- `useEffect` (with ref guard so it runs once per mount/login):
  - When `isAuthenticated` becomes true, read `sessionStorage.getItem('pendingInviteToken')`
  - If present: get bearer token, `POST ${VITE_API_URL}/invites/${token}/accept` with `Authorization: Bearer ...`
  - On success: parse `clinic_name` from response, show toast `"Welcome to {clinic_name}"`, remove sessionStorage key
  - On error: log + remove key (don't trap user in retry loop)

**5. Mount `<InviteAccepter />`**
- Inside `<App />`, just below `<AuthProvider>` opening tag (so it has access to Auth0 context which `main.tsx` provides, and renders alongside `<Routes>`)

**6. `src/pages/Login.tsx`**
- Update the "Log In" button:
  ```tsx
  loginWithRedirect({ authorizationParams: { screen_hint: 'login' }, appState: { returnTo: '/' } })
  ```

### Files touched
- `src/pages/AcceptInvite.tsx` — new (replaces `InviteAcceptPage.tsx`)
- `src/pages/InviteAcceptPage.tsx` — delete
- `src/components/InviteAccepter.tsx` — new
- `src/App.tsx` — swap import + mount `<InviteAccepter />`
- `src/main.tsx` — sessionStorage write in `onRedirectCallback`
- `src/pages/Login.tsx` — add `screen_hint: 'login'`

### Risks / notes
- The `InviteAccepter` runs inside `<BrowserRouter>` + `<AuthProvider>`; Auth0 context comes from `main.tsx` so it's available. Toast requires `<Toaster />` already mounted — confirmed in `App.tsx`.
- Ref guard prevents double-POST in React StrictMode dev mode.
- Backend is expected to return `clinic_name` in the accept response; if not, toast falls back to "Welcome!".
- The existing `AcceptInvite` page does NOT call accept itself — acceptance is deferred to post-Auth0-redirect (per spec).

