

## Build Invite Acceptance Page (Mock Auth)

Since Auth0 isn't integrated yet, Auth0-specific calls (`loginWithRedirect`, `getAccessTokenSilently`) will be replaced with mock equivalents using the existing `useAuth` context.

### Files to create/edit

**1. Create `src/pages/InviteAcceptPage.tsx`**

Three-state page (loading, error, valid invite) matching the Login page styling.

- **On mount**: Fetch `GET ${API_BASE_URL}/invites/${token}` (public, no auth). Handle 200/404/410/other.
- **Valid invite (not authenticated)**: Centered card with logo, "You've been invited to join", clinic name, email if present. "Create Account & Join" button calls `login("clinic_user")` then navigates back to `/invite/${token}`. "Already have an account?" link does the same.
- **After login (isAuthenticated)**: Show "Setting up your account..." spinner, call `POST ${API_BASE_URL}/invites/${token}/accept` with `X-DEV-ADMIN: 1` header, then redirect to `/clinic/dashboard` on success.
- **Error state**: Alert icon, error message, "Go to Login" button linking to `/login`.
- Uses existing `Card`, `Button`, `Alert` components and the logo from `@/assets/logo.png`.

**2. Edit `src/App.tsx`**

Add route outside authenticated layouts:
```tsx
<Route path="/invite/:token" element={<InviteAcceptPage />} />
```
Import `InviteAcceptPage` from `@/pages/InviteAcceptPage`.

### Mock auth behavior

- "Create Account & Join" → `login("clinic_user")`, component re-renders with `isAuthenticated: true`, triggers the accept API call
- When Auth0 is integrated later, swap `login()` for `loginWithRedirect()` and add real token handling

### Technical details

- API base URL from `import.meta.env.VITE_API_URL` (same as `src/lib/api.ts`)
- Mobile responsive: same `min-h-screen flex items-center justify-center` pattern as Login page
- Loading state uses `Loader2` spinner from lucide-react

