import { useAuth0 } from "@auth0/auth0-react";
import { Navigate } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

export default function Login() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <img src={logo} alt="DiRxctional" className="h-40 w-auto mx-auto mb-4" />
          <p className="text-muted-foreground mt-1">Clinical Referral Automation Platform</p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border border-border bg-card p-8 card-shadow space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your DiRxctional account
            </p>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              loginWithRedirect({
                authorizationParams: { screen_hint: "login" },
                appState: { returnTo: "/" },
              })
            }
          >
            <LogIn className="h-4 w-4 mr-2" />
            Log In
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Secure authentication powered by Auth0
        </p>
      </div>
    </div>
  );
}
