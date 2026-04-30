import {
  fetchAuthSession,
  getCurrentUser,
  signInWithRedirect,
  signOut,
  signIn,
  signUp,
  type SignUpInput,
} from "aws-amplify/auth";

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

const ROLE_CLAIM = "https://dirxctional.com/role";
const CLINIC_ID_CLAIM = "https://dirxctional.com/clinic_id";
const NPI_CLAIM = "https://dirxctional.com/npi";

export function parseClaims(payload: Record<string, unknown> | undefined | null): IdTokenClaims {
  const p = payload ?? {};
  return {
    sub: p.sub as string | undefined,
    email: p.email as string | undefined,
    name: (p.name as string | undefined) ?? undefined,
    given_name: p.given_name as string | undefined,
    family_name: p.family_name as string | undefined,
    picture: p.picture as string | undefined,
    role: p[ROLE_CLAIM] as string | undefined,
    clinic_id: p[CLINIC_ID_CLAIM] as string | undefined,
    npi: p[NPI_CLAIM] as string | undefined,
    raw: p as Record<string, unknown>,
  };
}

/** Returns the current Cognito ID token JWT, or undefined if signed out. */
export async function getIdToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch {
    return undefined;
  }
}

/** Returns parsed claims from the current ID token, or null if signed out. */
export async function getCurrentClaims(): Promise<IdTokenClaims | null> {
  try {
    const session = await fetchAuthSession();
    const payload = session.tokens?.idToken?.payload as
      | Record<string, unknown>
      | undefined;
    if (!payload) return null;
    return parseClaims(payload);
  } catch {
    return null;
  }
}

export async function isSignedIn(): Promise<boolean> {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
}

/** Redirect to the Cognito Hosted UI. */
export function hostedUiSignIn() {
  return signInWithRedirect();
}

/**
 * Sign out of Cognito. With OAuth configured, Amplify hits the Cognito
 * sign-out endpoint and redirects back to redirectSignOut.
 */
export async function cognitoSignOut() {
  await signOut({ global: true });
}

export { signIn, signUp, fetchAuthSession, getCurrentUser };
export type { SignUpInput };
