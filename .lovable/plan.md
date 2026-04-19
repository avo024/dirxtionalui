
## Pass invite_token to Auth0 signup via authorizationParams

### Change
In `src/pages/AcceptInvite.tsx`, add `invite_token: token` to the `authorizationParams` in the `handleCreateAccount` function (signup flow only).

**Current (line 45-50):**
```typescript
const handleCreateAccount = () => {
  loginWithRedirect({
    authorizationParams: { screen_hint: "signup", login_hint: email },
    appState: { inviteToken: token, returnTo: "/" },
  });
};
```

**New:**
```typescript
const handleCreateAccount = () => {
  loginWithRedirect({
    authorizationParams: { screen_hint: "signup", login_hint: email, invite_token: token },
    appState: { inviteToken: token, returnTo: "/" },
  });
};
```

### Do not touch
- `handleLogIn` function (login flow doesn't need invite_token)
- `InviteAccepter.tsx` (works correctly, reads token from sessionStorage)
- Any other files

### File to edit
- `src/pages/AcceptInvite.tsx` (1 line change in `handleCreateAccount`)

### Testing verification
1. Random signup without invite_token → blocked by Auth0 Action
2. Invited user clicks "Create Account" → invite_token passed in query params → Auth0 allows signup
