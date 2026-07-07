import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHeaders } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface ConsentStatus {
  needs_acceptance: boolean;
  current_versions: {
    tos_version: string;
    privacy_version: string;
  };
  user_versions: {
    tos_version: string | null;
    privacy_version: string | null;
  };
}

async function fetchConsentStatus(): Promise<ConsentStatus> {
  const res = await fetch(`${API_BASE_URL}/clinics/me/consent-status`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function ConsentReacceptModal() {
  const { data, refetch, isLoading } = useQuery({
    queryKey: ["consent-status"],
    queryFn: fetchConsentStatus,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = !isLoading && !!data?.needs_acceptance;

  // Block Escape key while modal is open.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open]);

  if (!open || !data) return null;

  const isPreClickwrap = data.user_versions.tos_version == null;
  const { tos_version, privacy_version } = data.current_versions;

  const handleSubmit = async () => {
    if (!tosAccepted || !privacyAcknowledged) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/clinics/me/consent`, {
        method: "POST",
        headers: await getHeaders(),
        body: JSON.stringify({
          tos_accepted: true,
          tos_version,
          privacy_acknowledged: true,
          privacy_version,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error || `Unable to save consent (HTTP ${res.status}).`;
        console.error("[ConsentReaccept] failed", res.status, body);
        setError(msg);
        return;
      }
      await refetch();
    } catch (err) {
      console.error("[ConsentReaccept] network error", err);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-reaccept-title"
    >
      <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
        <h2
          id="consent-reaccept-title"
          className="text-lg font-semibold text-foreground"
        >
          We've updated our terms
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          {isPreClickwrap
            ? "Welcome back! To continue using Dirxctional, please take a moment to review and accept our Terms of Service and Privacy Policy."
            : "Since your last sign-in, we've updated our Terms of Service and Privacy Policy. Please review and accept the latest versions to continue using Dirxctional."}
        </p>

        <div className="mt-5 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-1 flex-shrink-0"
            />
            <span className="text-sm text-foreground">
              I have read and agree to the{" "}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline font-medium"
              >
                Terms of Service
              </a>{" "}
              (version {tos_version}).
            </span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyAcknowledged}
              onChange={(e) => setPrivacyAcknowledged(e.target.checked)}
              className="mt-1 flex-shrink-0"
            />
            <span className="text-sm text-foreground">
              I have read and acknowledge the{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline font-medium"
              >
                Privacy Policy
              </a>{" "}
              (version {privacy_version}).
            </span>
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !tosAccepted || !privacyAcknowledged}
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
