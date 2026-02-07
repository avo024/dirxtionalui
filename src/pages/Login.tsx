import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Pill, Building2, Shield } from "lucide-react";
import { useEffect } from "react";

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === "clinic_user" ? "/clinic/dashboard" : "/admin/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = (role: "clinic_user" | "internal_admin") => {
    login(role);
    navigate(role === "clinic_user" ? "/clinic/dashboard" : "/admin/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary mb-4">
            <Pill className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ReferralFlow</h1>
          <p className="text-muted-foreground mt-1">Clinical Referral Automation Platform</p>
        </div>

        {/* Role cards */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-center text-muted-foreground">Select your role to continue</p>

          <button
            onClick={() => handleLogin("clinic_user")}
            className="w-full group flex items-center gap-4 p-5 rounded-xl border border-border bg-card card-shadow hover:card-shadow-md hover:border-primary/30 transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Clinic Portal</p>
              <p className="text-sm text-muted-foreground">Manage referrals for your clinic</p>
            </div>
          </button>

          <button
            onClick={() => handleLogin("internal_admin")}
            className="w-full group flex items-center gap-4 p-5 rounded-xl border border-border bg-card card-shadow hover:card-shadow-md hover:border-accent/30 transition-all text-left"
          >
            <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Shield className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Admin Dashboard</p>
              <p className="text-sm text-muted-foreground">Review and manage all referrals</p>
            </div>
          </button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Mock authentication — no real credentials required
        </p>
      </div>
    </div>
  );
}
