import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchAuthSession } from "aws-amplify/auth";
import logo from "@/assets/logo.png";

export default function Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    (async () => {
      try {
        // Amplify handles the OAuth code exchange when the page loads via
        // signInWithRedirect's "signInWithRedirect" Hub event. Wait briefly
        // for the session to populate, then route to Index which dispatches
        // by role.
        for (let i = 0; i < 20; i++) {
          const session = await fetchAuthSession();
          if (session.tokens?.idToken) {
            navigate("/", { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
        setError("We couldn't complete sign-in. Please try again.");
      } catch (e) {
        console.error("Callback error", e);
        setError("Something went wrong while signing you in.");
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="card-shadow">
          <CardContent className="p-8 text-center space-y-5">
            <img src={logo} alt="DiRxctional" className="h-20 w-auto mx-auto" />
            {error ? (
              <>
                <h1 className="text-xl font-semibold text-foreground">
                  Sign-in failed
                </h1>
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Back to login
                </Button>
              </>
            ) : (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Signing you in…
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
