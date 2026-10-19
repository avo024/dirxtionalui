// Demo stand-in for aws-amplify/auth (only Callback.tsx imports it directly,
// and that route is never reached in the demo).
export async function fetchAuthSession() {
  return { tokens: { idToken: { toString: () => "demo-token", payload: {} } } };
}
export async function getCurrentUser() {
  return { username: "rosa.kelly" };
}
export async function signInWithRedirect() {}
export async function signOut() {}
export async function signIn() {
  return { isSignedIn: true };
}
export async function signUp() {
  return { isSignUpComplete: true };
}
export type SignUpInput = Record<string, unknown>;
