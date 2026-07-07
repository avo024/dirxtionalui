import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X } from "lucide-react";
import { signUp, signIn } from "@/lib/cognito";
import { toast } from "@/hooks/use-toast";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";
import logo from "@/assets/logo.png";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type PageState = "loading" | "valid" | "not_found" | "expired" | "error";

interface InviteResponse {
  clinic_name?: string;
  clinic_id?: string;
}

interface PolicyVersions {
  tos_version: string;
  privacy_version: string;
}


const NPI = /^\d{10}$/;

function formatPhoneInput(value: string) {
  // Strip non-digits, drop leading 1 country code if present, cap at 10 digits
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length > 10) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return new AsYouType("US").input(digits);
}

function toE164US(value: string): string | null {
  const parsed = parsePhoneNumberFromString(value, "US");
  if (parsed && parsed.isValid() && parsed.country === "US") {
    return parsed.number; // E.164, e.g. +12141234567
  }
  return null;
}

function checkPasswordPolicy(pw: string) {
  return {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("loading");
  const [clinicName, setClinicName] = useState("");
  const [clinicId, setClinicId] = useState("");

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [npi, setNpi] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [policyVersions, setPolicyVersions] = useState<PolicyVersions | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);

  const policy = useMemo(() => checkPasswordPolicy(password), [password]);

  useEffect(() => {
    if (!token) {
      setState("not_found");
      return;
    }
    fetch(`${API_BASE_URL}/invites/${token}`)
      .then(async (res) => {
        if (res.ok) {
          const data: InviteResponse = await res.json();
          setClinicName(data.clinic_name || "");
          setClinicId(data.clinic_id || "");
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

  useEffect(() => {
    fetch(`${API_BASE_URL}/policies/current`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data: PolicyVersions) => setPolicyVersions(data))
      .catch(() => {
        // Non-fatal; button stays disabled until policies load.
      });
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      e.email = "Enter a valid email address.";

    if (!firstName.trim()) e.firstName = "First name is required.";
    if (!lastName.trim()) e.lastName = "Last name is required.";

    if (!phone.trim()) e.phone = "Phone number is required.";
    else if (!toE164US(phone))
      e.phone = "Enter a valid US phone number, e.g. (214) 123-4567.";

    if (npi.trim() && !NPI.test(npi.trim()))
      e.npi = "NPI must be exactly 10 digits.";

    if (!password) e.password = "Password is required.";
    else if (
      !policy.length ||
      !policy.upper ||
      !policy.lower ||
      !policy.number ||
      !policy.symbol
    )
      e.password = "Password does not meet the requirements below.";

    if (confirmPassword !== password)
      e.confirmPassword = "Passwords do not match.";

    if (!clinicId) e.form = "Missing clinic information. Refresh and try again.";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate() || !token) return;
    if (!policyVersions) {
      setErrors((prev) => ({ ...prev, form: "Loading policy versions, please wait a moment." }));
      return;
    }
    if (!tosAccepted || !privacyAcknowledged) {
      setErrors((prev) => ({
        ...prev,
        form: "Please review and accept the Terms of Service and Privacy Policy to continue.",
      }));
      return;
    }

    setSubmitting(true);
    try {
      await signUp({
        username: email.trim(),
        password,
        options: {
          userAttributes: {
            email: email.trim(),
            given_name: firstName.trim(),
            family_name: lastName.trim(),
            phone_number: toE164US(phone) || "",
            "custom:role": "clinic_user",
            "custom:clinic_id": clinicId,
            "custom:npi": npi.trim(),
          },
          // Pre-SignUp Lambda reads validationData to verify the invite token.
          validationData: {
            invite_token: token,
          },
        },
      });

      // Pre-SignUp Lambda auto-confirms; sign in immediately.
      try {
        await signIn({
          username: email.trim(),
          password,
        });
        sessionStorage.setItem("pendingInviteToken", token);
        sessionStorage.setItem(
          "pendingInviteConsent",
          JSON.stringify({
            tos_accepted: true,
            tos_version: policyVersions.tos_version,
            privacy_acknowledged: true,
            privacy_version: policyVersions.privacy_version,
          })
        );
        navigate("/", { replace: true });
      } catch (signInErr) {
        console.error("Auto sign-in failed after signup", signInErr);
        toast({
          title: "Account created",
          description: "Please log in to continue.",
        });
        navigate("/login", { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { name?: string; message?: string };
      let message = error.message || "Sign-up failed. Please try again.";
      if (error.name === "UsernameExistsException") {
        message = "An account with this email already exists. Try logging in.";
      } else if (error.name === "InvalidPasswordException") {
        message = "Password does not meet the policy. See requirements below.";
      } else if (error.name === "InvalidParameterException") {
        message = error.message || "One of the fields is invalid.";
      } else if (error.name === "UserLambdaValidationException") {
        message =
          "This invite could not be verified. It may have expired or already been used.";
      }
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="card-shadow">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <img src={logo} alt="Dirxctional" className="h-24 w-auto mx-auto mb-4" />
            </div>

            {state === "loading" && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Validating invite…</p>
              </div>
            )}

            {state === "valid" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center">
                  <h1 className="text-xl font-semibold text-foreground">
                    You've been invited to join {clinicName || "your clinic"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create your account to manage specialty referrals.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-first">
                      First name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invite-first"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      aria-invalid={!!errors.firstName}
                    />
                    {errors.firstName && (
                      <p className="text-xs text-destructive">{errors.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="invite-last">
                      Last name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="invite-last"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      aria-invalid={!!errors.lastName}
                    />
                    {errors.lastName && (
                      <p className="text-xs text-destructive">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-phone">
                    Phone number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invite-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                    placeholder="(214) 123-4567"
                    aria-invalid={!!errors.phone}
                  />
                  <p
                    className={`text-xs ${errors.phone ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {errors.phone || "US phone number"}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-npi">
                    NPI (optional — physicians and NPs only)
                  </Label>
                  <Input
                    id="invite-npi"
                    inputMode="numeric"
                    value={npi}
                    onChange={(e) => setNpi(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit NPI"
                    aria-invalid={!!errors.npi}
                  />
                  {errors.npi && (
                    <p className="text-xs text-destructive">{errors.npi}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-password">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invite-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={!!errors.password}
                  />
                  <ul className="text-xs space-y-0.5 mt-1">
                    <PolicyItem ok={policy.length} label="At least 12 characters" />
                    <PolicyItem ok={policy.upper} label="One uppercase letter" />
                    <PolicyItem ok={policy.lower} label="One lowercase letter" />
                    <PolicyItem ok={policy.number} label="One number" />
                    <PolicyItem ok={policy.symbol} label="One symbol" />
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invite-confirm">
                    Confirm password <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="invite-confirm"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    aria-invalid={!!errors.confirmPassword}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                  )}
                </div>

                {errors.form && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                    <p className="text-sm text-destructive">{errors.form}</p>
                  </div>
                )}

                <div className="space-y-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tosAccepted}
                      onChange={(e) => setTosAccepted(e.target.checked)}
                      className="mt-1 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-700">
                      I have read and agree to the{" "}
                      <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline font-medium"
                      >
                        Terms of Service
                      </a>
                      {policyVersions && ` (version ${policyVersions.tos_version})`}
                      , including the limitations of liability, mass arbitration procedures, and
                      the disclaimer regarding AI-extracted data.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privacyAcknowledged}
                      onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
                      className="mt-1 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-700">
                      I have read and acknowledge the{" "}
                      <a
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline font-medium"
                      >
                        Privacy Policy
                      </a>
                      {policyVersions && ` (version ${policyVersions.privacy_version})`}{" "}
                      and understand how Dirxctional handles personal information and PHI.
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={
                    submitting ||
                    !policyVersions ||
                    !tosAccepted ||
                    !privacyAcknowledged
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>

                {!policyVersions && (
                  <p className="text-xs text-muted-foreground text-center">
                    Loading policy versions…
                  </p>
                )}
                {policyVersions && (!tosAccepted || !privacyAcknowledged) && (
                  <p className="text-xs text-muted-foreground text-center">
                    Please review and accept the Terms of Service and Privacy Policy to continue.
                  </p>
                )}

                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-primary hover:underline font-medium"
                  >
                    Log in
                  </button>
                </p>
              </form>
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

function PolicyItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 ${ok ? "text-foreground" : "text-muted-foreground"}`}>
      {ok ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
    </li>
  );
}
