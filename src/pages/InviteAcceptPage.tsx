import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type PageState = "loading" | "valid" | "accepting" | "success" | "error";

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [state, setState] = useState<PageState>("loading");
  const [clinicName, setClinicName] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const acceptedRef = useRef(false);

  // Validate invite on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE_URL}/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setClinicName(data.clinic_name || "");
          setEmail(data.email || "");
          setState("valid");
        } else if (res.status === 404) {
          setErrorMessage("Invite not found. Please check the link and try again.");
          setState("error");
        } else if (res.status === 410) {
          setErrorMessage("This invite has expired or already been used.");
          setState("error");
        } else {
          setErrorMessage("Something went wrong. Please try again later.");
          setState("error");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong. Please try again later.");
        setState("error");
      });
  }, [token]);

  // After mock login, accept the invite
  useEffect(() => {
    if (!isAuthenticated || !token || acceptedRef.current || state === "loading") return;
    if (state === "error" || state === "success") return;
    acceptedRef.current = true;
    setState("accepting");

    fetch(`${API_BASE_URL}/invites/${token}/accept`, {
      method: "POST",
      headers: { "X-DEV-ADMIN": "1" },
    })
      .then(async (res) => {
        if (res.ok) {
          setState("success");
          setTimeout(() => navigate("/clinic/dashboard", { replace: true }), 1500);
        } else if (res.status === 410) {
          setErrorMessage("This invite has already been used.");
          setState("error");
        } else {
          setErrorMessage("Something went wrong. Please contact your administrator.");
          setState("error");
        }
      })
      .catch(() => {
        setErrorMessage("Something went wrong. Please contact your administrator.");
        setState("error");
      });
  }, [isAuthenticated, token, state, navigate]);

  const handleJoin = () => {
    login("clinic_user");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="card-shadow">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <img src={logo} alt="DiRxctional" className="h-24 w-auto mx-auto mb-4" />
            </div>

            {/* Loading */}
            {state === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validating invite…</p>
              </div>
            )}

            {/* Valid invite, not yet authenticated */}
            {state === "valid" && !isAuthenticated && (
              <div className="text-center space-y-5">
                <div>
                  <h1 className="text-xl font-semibold text-foreground">You've been invited to join</h1>
                  <p className="text-lg font-bold text-primary mt-2">{clinicName}</p>
                </div>
                {email && (
                  <p className="text-sm text-muted-foreground">
                    Invitation for: <span className="font-medium text-foreground">{email}</span>
                  </p>
                )}
                <Button onClick={handleJoin} className="w-full" size="lg">
                  Create Account &amp; Join
                </Button>
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button onClick={handleJoin} className="text-primary hover:underline font-medium">
                    Sign in
                  </button>
                </p>
              </div>
            )}

            {/* Accepting */}
            {(state === "accepting" || (state === "valid" && isAuthenticated)) && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Setting up your account…</p>
              </div>
            )}

            {/* Success */}
            {state === "success" && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-foreground">You're all set!</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard…</p>
              </div>
            )}

            {/* Error */}
            {state === "error" && (
              <div className="space-y-5">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
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
