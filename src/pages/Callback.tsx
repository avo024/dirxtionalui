import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchAuthSession } from "aws-amplify/auth";
import { AuthShell } from "@/components/AuthShell";

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
    <AuthShell>
      {error ? (
        <>
          <h1 className="au-h" role="alert">We couldn't sign you in.</h1>
          <p className="au-lede">
            Try again or email{" "}
            <a className="au-link" href="mailto:support@dirxctional.com">support@dirxctional.com</a>.
          </p>
          <Button
            className="au-cta"
            onClick={() => navigate("/login", { replace: true })}
          >
            Try again
          </Button>
        </>
      ) : (
        <>
          <h1 className="au-h" role="status">Signing you in</h1>
          <p className="au-lede">Just a moment while we confirm your sign-in.</p>
        </>
      )}
    </AuthShell>
  );
}
