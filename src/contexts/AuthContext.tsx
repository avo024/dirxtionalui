import React, { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export type UserRole = "clinic_user" | "internal_admin";

interface User {
  role: UserRole;
  name: string;
  clinic_name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("mock_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = useCallback((role: UserRole) => {
    const newUser: User = role === "clinic_user"
      ? { role, name: "Sarah Johnson", clinic_name: "Dallas Dermatology Clinic" }
      : { role, name: "Admin User" };
    setUser(newUser);
    localStorage.setItem("mock_user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("mock_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
