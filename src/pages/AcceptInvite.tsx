import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import logo from "@/assets/logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type PageState = "loading" | "valid" | "not_found" | "expired" | "error";

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { loginWithRedirect } = useAuth0();

  const [state, setState] = useState<PageState>("loading");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setState("not_found");
      return;
    }
    fetch(`${API_BASE_URL}/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setClinicName(data.clinic_name || "");
          setEmail(data.email || "");
          setState("valid");
        } else if (res.status === 404) {
          setState("not_found");
        } else if (res.status === 410) {
          setState("expired");
        } else {
          setState("error");
        }
      })
      .catch(() => setState("error"));
  }, [token]);

  const handleCreateAccount = () => {
    loginWithRedirect({
      authorizationParams: { screen_hint: "signup", login_hint: email, invite_token: token },
      appState: { inviteToken: token, returnTo: "/" },
    });
  };

  const handleLogIn = () => {
    loginWithRedirect({
      authorizationParams: { screen_hint: "login", login_hint: email },
      appState: { inviteToken: token, returnTo: "/" },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="card-shadow">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <img src={logo} alt="DiRxctional" className="h-24 w-auto mx-auto mb-4" />
            </div>

            {state === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validating invite…</p>
              </div>
            )}

            {state === "valid" && (
              <div className="text-center space-y-5">
                <div>
                  <h1 className="text-xl font-semibold text-foreground">You're invited to DiRxctional</h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Join <span className="font-semibold text-foreground">{clinicName}</span> to manage specialty referrals
                  </p>
                </div>
                {email && (
                  <p className="text-sm text-muted-foreground">
                    This invite is for: <span className="font-medium text-foreground">{email}</span>
                  </p>
                )}
                <Button onClick={handleCreateAccount} className="w-full" size="lg">
                  Create Account
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={handleLogIn} className="text-primary hover:underline font-medium">
                    Log in
                  </button>
                </p>
              </div>
            )}

            {state === "not_found" && (
              <div className="text-center space-y-5">
                <h1 className="text-xl font-semibold text-foreground">Invite not found</h1>
                <p className="text-sm text-muted-foreground">
                  We couldn't find this invite. Please check the link and try again.
                </p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              </div>
            )}

            {state === "expired" && (
              <div className="text-center space-y-5">
                <h1 className="text-xl font-semibold text-foreground">
                  This invite has expired or been used. Please ask your admin for a new one.
                </h1>
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              </div>
            )}

            {state === "error" && (
              <div className="text-center space-y-5">
                <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
                <p className="text-sm text-muted-foreground">Please try again later.</p>
                <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                  Go to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
