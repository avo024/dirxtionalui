import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import "@/auth.css";
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#121D3E]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-reaccept-title"
    >
      <div className="au-modal">
        <h2 id="consent-reaccept-title">
          We've updated our terms
        </h2>
        <p className="lede">
          {isPreClickwrap
            ? "Welcome back! To continue using Dirxctional, please take a moment to review and accept our Terms of Service and Privacy Policy."
            : "Since your last sign-in, we've updated our Terms of Service and Privacy Policy. Please review and accept the latest versions to continue using Dirxctional."}
        </p>

        <div className="au-consent mt-5">
          <label htmlFor="consent-tos">
            <Checkbox
              id="consent-tos"
              checked={tosAccepted}
              onCheckedChange={(v) => setTosAccepted(v === true)}
            />
            <span>
              I have read and agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{" "}
              (version {tos_version}).
            </span>
          </label>
          <label htmlFor="consent-privacy">
            <Checkbox
              id="consent-privacy"
              checked={privacyAcknowledged}
              onCheckedChange={(v) => setPrivacyAcknowledged(v === true)}
            />
            <span>
              I have read and acknowledge the{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">
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
                <Icon name="spinner" className="mr-2 animate-spin" />
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
