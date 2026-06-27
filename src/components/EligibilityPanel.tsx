import { useState } from "react";
import { ShieldCheck, AlertTriangle, XCircle, HelpCircle, ChevronDown } from "lucide-react";
import { getRelativeTime } from "@/lib/dateUtils";
// arr-card styling lives with the admin review page; this panel only renders there.
import "@/pages/admin/admin-referral-review.css";

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
const TONE_STYLE: Record<ChipTone, { fg: string; bg: string }> = {
  green: { fg: "var(--color-success)", bg: "color-mix(in srgb, var(--color-success) 13%, transparent)" },
  amber: { fg: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 15%, transparent)" },
  red: { fg: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 12%, transparent)" },
  grey: { fg: "var(--text-muted)", bg: "color-mix(in srgb, var(--text-muted) 12%, transparent)" },
};

/**
 * Insurance Eligibility panel for the admin referral-review screen.
 * Displays the Availity eligibility check run during AI extraction — coverage
 * status + any field mismatches between the extracted insurance and the payer
 * record. Degrades gracefully: feature-flagged off → status null → "Not checked".
 * Display only; reads eligibility_* fields off the referral object.
 */
export function EligibilityPanel({ referral }: { referral: EligibilityData }) {
  const [showPayload, setShowPayload] = useState(false);

  const status = referral?.eligibility_status ?? null;

  // Feature dormant (flag off) or eligibility hasn't run for this referral yet →
  // render nothing, so the admin screen is unchanged until there's a real result.
  if (status == null) return null;

  const mismatches = referral?.eligibility_mismatches ?? [];
  const checkedAt = referral?.eligibility_checked_at ?? null;
  const active = referral?.eligibility_active;

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
      tone = "grey"; chipLabel = "Payer not matched — not checked"; ChipIcon = HelpCircle; break;
    case "error":
    case "skipped":
      tone = "grey"; chipLabel = "Not verified"; ChipIcon = HelpCircle; break;
    default:
      tone = "grey"; chipLabel = "Not checked yet"; ChipIcon = HelpCircle; break;
  }

  const t = TONE_STYLE[tone];
  const isNull = status == null;

  return (
    <div className="arr-card" style={isNull ? { opacity: 0.6 } : undefined}>
      <div className="arr-card-head">
        <span className="hi"><ShieldCheck size={15} /></span>
        <h3>Insurance Eligibility</h3>
        <span className="he" style={{ marginLeft: "auto" }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "2px 9px", borderRadius: 9999,
              fontSize: "var(--text-xs)", fontWeight: 600,
              color: t.fg, background: t.bg,
            }}
          >
            <ChipIcon size={12} />{chipLabel}
          </span>
        </span>
      </div>

      {/* Coverage active / inactive */}
      {!isNull && typeof active === "boolean" && (
        <div className="arr-srow">
          <span className="arr-sk">Coverage</span>
          <span className="arr-sv" style={{ fontWeight: 600, color: active ? "var(--color-success)" : "var(--color-error)" }}>
            {active ? "Active" : "Inactive"}
          </span>
        </div>
      )}

      {/* THE KEY PART — field mismatches between extracted insurance and payer record */}
      {mismatches.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {mismatches.map((m, i) => (
            <div
              key={`${m.field}-${i}`}
              style={{
                padding: "8px 10px", borderRadius: "var(--radius-md)",
                background: "color-mix(in srgb, var(--color-warning) 9%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-warning) 35%, transparent)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                <AlertTriangle size={13} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                {fieldLabel(m.field)}
              </div>
              <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>
                extracted: <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.extracted || "—"}</span>
                {"  ·  "}payer has: <span style={{ fontWeight: 600, color: "var(--color-warning)" }}>{m.payer || "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checked timestamp */}
      {checkedAt && (
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "10px 0 0" }}>
          Checked {getRelativeTime(checkedAt)}
        </p>
      )}

      {/* Optional collapsible raw payer details (debug/reference; collapsed by default) */}
      {!isNull && referral?.eligibility_payload && (
        <div style={{ marginTop: 8 }}>
          <button
            type="button"
            onClick={() => setShowPayload((v) => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: "var(--text-xs)", color: "var(--text-muted)",
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <ChevronDown size={13} style={{ transform: showPayload ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
            Payer details
          </button>
          {showPayload && (
            <pre
              style={{
                marginTop: 6, maxHeight: 220, overflow: "auto",
                fontSize: 11, lineHeight: 1.5, padding: 10,
                background: "var(--color-gray-100, #f1f5f9)", borderRadius: "var(--radius-md)",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}
            >
              {JSON.stringify(referral.eligibility_payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
