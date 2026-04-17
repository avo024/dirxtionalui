import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useApi } from "@/hooks/useApi";

export type UserRole = "clinic_user" | "internal_admin";

interface User {
  role: UserRole;
  name: string;
  clinic_name?: string;
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

  const user = useMemo<User | null>(() => {
    if (!isAuthenticated || !auth0User) return null;

    const claimedRole = auth0User[ROLE_CLAIM] as UserRole | undefined;
    const role: UserRole = claimedRole === "internal_admin" ? "internal_admin" : "clinic_user";

    if (!claimedRole) {
      // TODO: configure Auth0 Action to inject role claim at ROLE_CLAIM.
      // Until then, every authenticated user defaults to clinic_user.
      console.warn(
        `[Auth] No role claim "${ROLE_CLAIM}" found on Auth0 user — defaulting to clinic_user.`,
      );
    }

    return {
      role,
      name: auth0User.name || auth0User.email || "User",
      email: auth0User.email,
      picture: auth0User.picture,
      clinic_name: (auth0User[CLINIC_CLAIM] as string) || "Your Clinic",
    };
  }, [auth0User, isAuthenticated]);

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
