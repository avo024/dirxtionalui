# Migrate Auth0 → AWS Amplify (Cognito)

HIPAA migration. Same UI, new auth backend. No production deploy — preview only.

## Dependencies & env

- Remove: `@auth0/auth0-react`
- Add: `aws-amplify` (v6)
- `.env` updates:
  - Remove `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`
  - Add `VITE_COGNITO_REGION`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_APP_CLIENT_ID`, `VITE_COGNITO_DOMAIN` with the values you provided
- Redirect URLs computed at runtime from `window.location.origin` so prod (`https://app.dirxctional.com`) and dev (`http://localhost:5173`, Lovable preview) both work without code changes:
  - `redirectSignIn: [origin + "/callback"]`
  - `redirectSignOut: [origin + "/"]`

## New files

1. **`src/lib/amplify.ts`** — `Amplify.configure({...})` with Cognito User Pool + OAuth (scopes `openid email profile`, response type `code`, domain from env). Imported once from `main.tsx` before `<App/>` renders.
2. **`src/lib/cognito.ts`** — thin wrapper exposing `getIdToken()`, `getCurrentUser()`, `signOut()`, `federatedSignIn()`, `signUp(...)`, plus a `parseClaims(idToken)` helper that pulls `sub`, `https://dirxctional.com/role`, `https://dirxctional.com/clinic_id`, `https://dirxctional.com/npi` (and standard `email`, `name`, `picture`) from the JWT payload.
3. **`src/pages/Callback.tsx`** — route at `/callback`. On mount, awaits `fetchAuthSession()` (Amplify v6 completes the code exchange automatically when this URL loads), then `navigate("/", { replace: true })` so `Index` sends the user to the right dashboard. Shows a spinner while resolving; shows an error + "Back to login" if the session fails.

## Changed files

### `src/main.tsx`
Replace `<Auth0Provider>` wrapper with a plain `<App/>`. Import `./lib/amplify` for its side effect (configures Amplify). Drop `onRedirectCallback` (Cognito handled in `/callback` page; pending invite token still uses `sessionStorage` set by `AcceptInvite`).

### `src/contexts/AuthContext.tsx`
Rewrite to be Amplify-backed but keep the **same exported API** (`useAuth()` returns `{ user, login, logout, isAuthenticated, isLoading }`) so the rest of the app is untouched.
- On mount: call `fetchAuthSession()` → parse ID token claims → set `user`. Subscribe to Amplify Hub `auth` events (`signedIn`, `signedOut`, `tokenRefresh`) to keep state fresh.
- `user.role` from `https://dirxctional.com/role` claim (default `clinic_user` with the same console warning as today).
- `user.clinic_id` from `https://dirxctional.com/clinic_id` claim — stop calling `getMyClinic()` purely for the id (still call it for `name`/`specialty` fallback, same React Query hook).
- `logout()` calls `signOut({ global: true })` which redirects through the Cognito sign-out endpoint back to `/`.

### `src/hooks/useApi.ts`
Replace `useAuth0().getAccessTokenSilently` with a function that calls `fetchAuthSession()` and returns `tokens.idToken.toString()`. Same `setAuthTokenProvider` plumbing — `src/lib/api.ts` doesn't change.

### `src/pages/Login.tsx`
Keep the existing card UI. The "Log In" button now calls `signInWithRedirect()` (Amplify v6 equivalent of `Auth.federatedSignIn()`) which sends the user to the Cognito Hosted UI. No in-app email/password form.

### `src/components/layout/UserMenu.tsx`
Replace `useAuth0()` with the existing `useAuth()` context (already exposes `logout` + user info). Avatar/email/name come from the Cognito ID token claims surfaced through `AuthContext` instead of `auth0User`.

### `src/components/InviteAccepter.tsx`
Replace `getAccessTokenSilently()` with `fetchAuthSession()` → ID token. Same logic: read `pendingInviteToken` from sessionStorage after sign-in, POST to `/invites/:token/accept`, toast, clear.

### `src/pages/AcceptInvite.tsx` (significant rebuild)
Today this page just collects an email and bounces to Auth0. New flow per your spec: full in-app signup form.
- Still calls `GET /invites/:token` first to validate + fetch `clinic_name` and `clinic_id`.
- Form fields (all required, validated client-side):
  - Email
  - First name (`given_name`)
  - Last name (`family_name`)
  - Phone (E.164, regex `^\+[1-9]\d{1,14}$`, helper text "Format: +12141234567")
  - NPI (exactly 10 digits)
  - Password (≥12 chars, upper, lower, number, symbol — live checklist below the field)
  - Confirm password
- Submit calls Amplify v6 `signUp({ username: email, password, options: { userAttributes: { email, given_name, family_name, phone_number, 'custom:role': 'clinic_user', 'custom:clinic_id': clinicId, 'custom:npi': npi }, validationData: { invite_token: token } } })`.
- On success (Pre-SignUp Lambda auto-confirms): call `signIn({ username: email, password })` to log them in immediately, then `navigate("/")`. If auto-sign-in fails, fall back to redirecting to `/login` with a success toast.
- Error states: surface Cognito errors (`UsernameExistsException`, `InvalidPasswordException`, `InvalidParameterException`, Pre-SignUp Lambda rejection for invalid invite token) as inline form errors / toast.
- The existing `not_found` / `expired` / `error` invite-state branches stay as-is.

### `src/App.tsx`
Add `<Route path="/callback" element={<Callback />} />`.

## Technical details

- **Amplify v6 API names** (the spec referenced v5 names like `Auth.signIn`; v6 is now standard and what `aws-amplify@^6` ships):
  - `Auth.currentSession()` → `fetchAuthSession()`
  - `Auth.currentAuthenticatedUser()` → `getCurrentUser()`
  - `Auth.signIn()` → `signIn()`
  - `Auth.signOut()` → `signOut()`
  - `Auth.signUp()` → `signUp()`
  - `Auth.federatedSignIn()` → `signInWithRedirect()`
  - All imported from `aws-amplify/auth`.
  - Token: `(await fetchAuthSession()).tokens?.idToken?.toString()`.
- **Amplify v6 `signUp` and `validationData`**: in v6, `validationData` lives under `options.validationData` as `Record<string, string>`. The Pre-SignUp Lambda receives it on `event.request.validationData`.
- **Custom claim parsing**: `idToken.payload` is already a parsed object in v6 — no manual JWT decode needed. We read `payload['https://dirxctional.com/role']` etc.
- **Hub events**: `import { Hub } from 'aws-amplify/utils'` then `Hub.listen('auth', ({ payload }) => …)`.
- **Sign-out redirect**: `signOut({ global: true })` with `redirectSignOut` configured in Amplify will hit the Cognito logout endpoint and bounce back to `/`.
- **Dev/preview redirect URIs**: the Cognito App Client must have both `https://app.dirxctional.com/callback` and the Lovable preview URL (`https://id-preview--16e269eb-61df-41a0-87c9-86db3f97fe05.lovable.app/callback`) plus `http://localhost:5173/callback` listed as allowed callback URLs, with matching sign-out URLs. **You'll need to add the Lovable preview URL in the Cognito console before the preview test will work** — flagging this so it's not a surprise.
- `src/lib/api.ts` is unchanged: still pulls a bearer token from the registered provider; the provider just returns Cognito ID tokens now.
- `mock_user` localStorage cleanup in `AuthContext` is preserved.

## Test plan (preview)

1. Hard-refresh preview → Login page renders unchanged.
2. Click "Log In" → redirects to `dirxctional.auth.us-east-2.amazoncognito.com` Hosted UI (different from Auth0 — confirms cutover).
3. After Hosted UI sign-in → lands on `/callback`, spinner, then routed to clinic or admin dashboard based on role claim.
4. Logout → returns to `/` then `/login`, Cognito session cleared.
5. Invite flow: visit `/invite/<valid-token>` → form renders with clinic name → submit with valid fields → user created + signed in → lands on dashboard. Invalid token → backend rejects via Pre-SignUp Lambda → inline error.
6. API calls in the dashboard include `Authorization: Bearer <Cognito ID token>` (verify in Network tab).

No production publish — you'll flip the backend feature flag and publish manually.
