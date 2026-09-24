import { useState } from "react";
import { RefreshCw, ShieldCheck, AlertTriangle, XCircle, HelpCircle, ChevronDown } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime } from "@/lib/dateUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EligibilityStatus =
  | "verified" | "mismatch" | "inactive" | "payer_unmatched" | "error" | "skipped" | null;

interface Mismatch {
  field: "member_id" | "first_name" | "last_name" | "dob" | string;
  extracted: string | null;
  payer: string | null;
}

interface EligibilityData {
  eligibility_status?: EligibilityStatus;
  eligibility_active?: boolean | null;
  eligibility_payer_id?: string | null;
  eligibility_mismatches?: Mismatch[] | null;
  eligibility_checked_at?: string | null;
  eligibility_payload?: Record<string, any> | null;
}

const FIELD_LABELS: Record<string, string> = {
  member_id: "Member ID",
  first_name: "First name",
  last_name: "Last name",
  dob: "Date of birth",
};

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] || field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ChipTone = "green" | "amber" | "red" | "grey";
const TONE_CLASS: Record<ChipTone, string> = {
  green: "bg-success/13 text-success",
  amber: "bg-warning/15 text-warning",
  red: "bg-destructive/12 text-destructive",
  grey: "bg-muted-foreground/12 text-muted-foreground",
};

/**
 * Insurance Eligibility panel for the admin referral workstation. Displays
 * the Availity eligibility check run during AI extraction — coverage status
 * + any field mismatches between the extracted insurance and the payer
 * record. Degrades gracefully: feature-flagged off → status null → renders
 * nothing. Display only; reads eligibility_* fields off the referral object.
 */
export function EligibilityPanel({ referral, referralId }: { referral: EligibilityData; referralId?: string }) {
  const [showPayload, setShowPayload] = useState(false);
  // Manual re-check (after fixing a mismatch/false reading) — response
  // overrides the referral props in place, no page reload needed.
  const [override, setOverride] = useState<EligibilityData | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const eff: EligibilityData = override ?? referral;

  const recheck = async () => {
    if (!referralId) return;
    setRechecking(true);
    try {
      const res = await adminApi.recheckEligibility(referralId);
      setOverride(res);
      toast({ title: "Eligibility re-checked", description: `Result: ${String(res.eligibility_status || "").replace(/_/g, " ")}` });
    } catch (e: any) {
      toast({ title: "Re-check failed", description: e.message, variant: "destructive" });
    } finally {
      setRechecking(false);
    }
  };

  const status = eff?.eligibility_status ?? null;

  // Render nothing when there's nothing for the admin to act on:
  //  - null     → feature dormant / not run yet
  //  - skipped  → deliberately not checked (bridge program, or no insurance on file)
  // Keeps the workstation clean — the panel only appears with a real signal.
  if (status == null || status === "skipped") return null;

  const mismatches = eff?.eligibility_mismatches ?? [];
  const checkedAt = eff?.eligibility_checked_at ?? null;
  const active = eff?.eligibility_active;

  let tone: ChipTone;
  let chipLabel: string;
  let ChipIcon = HelpCircle;

  switch (status) {
    case "verified":
      tone = "green"; chipLabel = "Verified vs payer ✓"; ChipIcon = ShieldCheck; break;
    case "mismatch": {
      const n = mismatches.length;
      tone = "amber"; chipLabel = `Needs review — ${n} mismatch${n === 1 ? "" : "es"}`; ChipIcon = AlertTriangle; break;
    }
    case "inactive":
      tone = "red"; chipLabel = "Coverage inactive"; ChipIcon = XCircle; break;
    case "payer_unmatched":
    case "error":
      // We had insurance data and tried, but got no usable signal — one quiet
      // grey chip so the admin knows to check the insurance manually.
      // (skipped is handled by the early return above — it renders nothing.)
      tone = "grey"; chipLabel = "Not verified"; ChipIcon = HelpCircle; break;
    default:
      tone = "grey"; chipLabel = "Not checked yet"; ChipIcon = HelpCircle; break;
  }

  return (
    <Card className="p-[var(--density-card-pad)]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">
          <ShieldCheck width={15} height={15} strokeWidth={1.75} />
        </span>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">Insurance Eligibility</h3>
        {referralId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={recheck}
            disabled={rechecking}
            title="Re-run the insurance check (use after correcting a mismatch)"
            className="ml-auto h-7 gap-1.5 px-2.5 text-xs"
          >
            <RefreshCw width={12} height={12} className={rechecking ? "animate-spin" : undefined} />
            Re-check
          </Button>
        )}
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", TONE_CLASS[tone], !referralId && "ml-auto")}>
          <ChipIcon width={12} height={12} />
          {chipLabel}
        </span>
      </div>

      {/* Coverage active / inactive */}
      {typeof active === "boolean" && (
        <div className="mt-3 flex items-center justify-between gap-4 border-t border-border pt-2.5 text-sm">
          <span className="text-xs text-muted-foreground">Coverage</span>
          <span className={cn("font-semibold", active ? "text-success" : "text-destructive")}>
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      )}

      {/* THE KEY PART — field mismatches between extracted insurance and payer record */}
      {mismatches.length > 0 && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {mismatches.map((m, i) => (
            <div
              key={`${m.field}-${i}`}
              className="rounded-md border border-warning/35 bg-warning/[0.09] px-2.5 py-2"
            >
              <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <AlertTriangle width={13} height={13} className="shrink-0 text-warning" />
                {fieldLabel(m.field)}
              </div>
              <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                extracted: <span className="font-semibold text-foreground">{m.extracted || "—"}</span>
                {"  ·  "}payer has: <span className="font-semibold text-warning">{m.payer || "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checked timestamp */}
      {checkedAt && (
        <p className="mt-2.5 text-xs text-muted-foreground">
          Checked {override ? "just now" : getRelativeTime(checkedAt)}
        </p>
      )}

      {/* Optional collapsible raw payer details (debug/reference; collapsed by default) */}
      {eff?.eligibility_payload && (
        <div className="mt-2.5">
          <button
            type="button"
            onClick={() => setShowPayload((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ChevronDown width={13} height={13} className={cn("transition-transform", showPayload && "rotate-180")} />
            Payer details
          </button>
          {showPayload && (
            <pre className="mt-1.5 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-2.5 text-[11px] leading-relaxed">
              {JSON.stringify(eff.eligibility_payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}
