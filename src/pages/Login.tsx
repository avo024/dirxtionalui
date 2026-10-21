import { Navigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { hostedUiSignIn } from "@/lib/cognito";
import { AuthShell } from "@/components/AuthShell";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Icon name="spinner" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthShell>
      <h1 className="au-h">Sign in</h1>
      <Button
        size="lg"
        className="au-cta"
        onClick={() => {
          void hostedUiSignIn();
        }}
      >
        Continue to sign in <span className="arr" aria-hidden="true">&rarr;</span>
      </Button>
      <p className="au-mono">Secure sign-in · AWS Cognito · MFA</p>
    </AuthShell>
  );
}
