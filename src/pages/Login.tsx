import { Navigate, useSearchParams } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { hostedUiSignIn } from "@/lib/cognito";
import { AuthShell } from "@/components/AuthShell";
import { clearSignedOutReason, IDLE_MINUTES, readSignedOutReason } from "@/lib/idleTimeout";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [params] = useSearchParams();
  // `?reason=idle` is set by the in-app redirect; the sessionStorage flag covers
  // the full-page Cognito logout round-trip, which lands on "/" without a query.
  const signedOutForIdle = params.get("reason") === "idle" || readSignedOutReason() === "idle";

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
      {signedOutForIdle && (
        <p className="au-lede" role="status">
          You were signed out after {IDLE_MINUTES} minutes of inactivity.
        </p>
      )}
      <Button
        size="lg"
        className="au-cta"
        onClick={() => {
          clearSignedOutReason();
          void hostedUiSignIn();
        }}
      >
        Continue to sign in <span className="arr" aria-hidden="true">&rarr;</span>
      </Button>
      <p className="au-mono">Secure sign-in · AWS Cognito · MFA</p>
    </AuthShell>
  );
}
