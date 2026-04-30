import React, { createContext, useContext, useMemo, useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Hub } from "aws-amplify/utils";
import { useApi } from "@/hooks/useApi";
import { getMyClinic } from "@/lib/api";
import { getCurrentClaims, cognitoSignOut, type IdTokenClaims } from "@/lib/cognito";

export type UserRole = "clinic_user" | "internal_admin";

interface User {
  role: UserRole;
  name: string;
  nickname?: string;
  given_name?: string;
  family_name?: string;
  clinic_name?: string;
  clinic_specialty?: string;
  clinic_id?: string;
  email?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  /** @deprecated mock login no-op — use Login page's hosted-UI redirect */
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const ROLE_CLAIM = "https://dirxctional.com/role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [claims, setClaims] = useState<IdTokenClaims | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bridge Cognito ID tokens into the API layer.
  useApi();

  // Initial session load + Hub subscription for sign-in / sign-out / refresh.
  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const c = await getCurrentClaims();
      if (!cancelled) {
        setClaims(c);
        setIsLoading(false);
      }
    };

    refresh();

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "tokenRefresh":
        case "signInWithRedirect":
          refresh();
          break;
        case "signedOut":
          if (!cancelled) setClaims(null);
          break;
        default:
          break;
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const isAuthenticated = !!claims;

  const claimedRole = claims?.role as UserRole | undefined;
  const role: UserRole | null = !isAuthenticated
    ? null
    : claimedRole === "internal_admin"
      ? "internal_admin"
      : "clinic_user";

  // Fetch real clinic info for clinic_users (cached). Falls back to claim if it fails.
  const { data: clinic } = useQuery({
    queryKey: ["clinic", "me"],
    queryFn: getMyClinic,
    enabled: isAuthenticated && role === "clinic_user",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const user = useMemo<User | null>(() => {
    if (!isAuthenticated || !claims || !role) return null;

    if (!claimedRole) {
      // TODO: configure Cognito Pre-Token-Generation Lambda to inject the role claim.
      console.warn(
        `[Auth] No role claim "${ROLE_CLAIM}" found on Cognito ID token — defaulting to clinic_user.`,
      );
    }

    const legalName =
      [claims.given_name, claims.family_name].filter(Boolean).join(" ") ||
      claims.name ||
      claims.email ||
      "User";
    const displayName = claims.nickname?.trim() || legalName;

    return {
      role,
      name: displayName,
      nickname: claims.nickname,
      given_name: claims.given_name,
      family_name: claims.family_name,
      email: claims.email,
      picture: claims.picture,
      clinic_id: clinic?.id ?? claims.clinic_id,
      clinic_name: clinic?.name || "Your Clinic",
      clinic_specialty: clinic?.specialty,
    };
  }, [claims, isAuthenticated, role, claimedRole, clinic]);

  const login = useCallback((_role: UserRole) => {
    console.warn(
      "[Auth] Mock login() is deprecated. Trigger the Cognito Hosted UI from the Login page instead.",
    );
  }, []);

  const logout = useCallback(() => {
    void cognitoSignOut();
  }, []);

  // Clean up legacy mock-auth localStorage key once.
  useEffect(() => {
    localStorage.removeItem("mock_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isAuthenticated, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
