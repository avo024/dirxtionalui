// Demo stand-in for @/lib/cognito: always signed in as Rosa Kelly.
import { fetchAuthSession, getCurrentUser, signIn, signUp, type SignUpInput } from "./amplify-auth.mock";

export type IdTokenClaims = {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  role?: "clinic_user" | "internal_admin" | string;
  clinic_id?: string;
  npi?: string;
  raw: Record<string, unknown>;
};

const DEMO_CLAIMS: IdTokenClaims = {
  sub: "demo-user-rosa",
  email: "rosa.kelly@mercywestderm.example",
  name: "Rosa Kelly",
  given_name: "Rosa",
  family_name: "Kelly",
  role: "clinic_user",
  clinic_id: "demo-clinic-mercy-west",
  raw: {},
};

export function parseClaims(_payload: Record<string, unknown> | undefined | null): IdTokenClaims {
  return DEMO_CLAIMS;
}

export async function getIdToken(): Promise<string | undefined> {
  return "demo-token";
}

export async function getCurrentClaims(): Promise<IdTokenClaims | null> {
  return DEMO_CLAIMS;
}

export async function isSignedIn(): Promise<boolean> {
  return true;
}

export function hostedUiSignIn() {
  window.location.hash = "#/clinic/dashboard";
  return Promise.resolve();
}

export async function cognitoSignOut() {
  window.location.hash = "#/clinic/dashboard";
  window.location.reload();
}

export { signIn, signUp, fetchAuthSession, getCurrentUser };
export type { SignUpInput };
