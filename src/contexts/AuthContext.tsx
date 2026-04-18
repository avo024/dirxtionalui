import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "@/hooks/useApi";
import { getMyClinic } from "@/lib/api";

export type UserRole = "clinic_user" | "internal_admin";

interface User {
  role: UserRole;
  name: string;
  clinic_name?: string;
  clinic_specialty?: string;
  clinic_id?: string;
  email?: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  /** @deprecated mock login no-op — use Auth0's loginWithRedirect on the Login page */
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Custom claim namespaces (configure in your Auth0 Action)
const ROLE_CLAIM = "https://dirxctional.com/role";
const CLINIC_CLAIM = "https://dirxctional.com/clinic_name";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const {
    user: auth0User,
    isAuthenticated,
    isLoading,
    logout: auth0Logout,
  } = useAuth0();

  // Bridge Auth0 access tokens into the API layer.
  useApi();

  const claimedRole = auth0User?.[ROLE_CLAIM] as UserRole | undefined;
  const role: UserRole | null = !isAuthenticated || !auth0User
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
    if (!isAuthenticated || !auth0User || !role) return null;

    if (!claimedRole) {
      // TODO: configure Auth0 Action to inject role claim at ROLE_CLAIM.
      console.warn(
        `[Auth] No role claim "${ROLE_CLAIM}" found on Auth0 user — defaulting to clinic_user.`,
      );
    }

    const fallbackClinicName = (auth0User[CLINIC_CLAIM] as string) || "Your Clinic";

    return {
      role,
      name: auth0User.name || auth0User.email || "User",
      email: auth0User.email,
      picture: auth0User.picture,
      clinic_id: clinic?.id,
      clinic_name: clinic?.name || fallbackClinicName,
      clinic_specialty: clinic?.specialty,
    };
  }, [auth0User, isAuthenticated, role, claimedRole, clinic]);

  const login = useCallback((_role: UserRole) => {
    console.warn(
      "[Auth] Mock login() is deprecated. Call useAuth0().loginWithRedirect() from the Login page instead.",
    );
  }, []);

  const logout = useCallback(() => {
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });
  }, [auth0Logout]);

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
