import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ArrowUpRight, EyeOff, RotateCcw } from "lucide-react";
import { getRelativeTime } from "@/lib/dateUtils";
import { renderFieldValue } from "@/lib/aiQualityFormat";
import type { AIQualityCorrection } from "@/lib/aiQualityApi";
import "@/pages/admin/aiq.css";

interface Props {
  correction: AIQualityCorrection;
  dismissable?: boolean;
  onDismiss?: (id: string) => void;
  onRestore?: (id: string) => void;
  busy?: boolean;
}

export function CorrectionRow({ correction: c, dismissable, onDismiss, onRestore, busy }: Props) {
  const high = (c.model_confidence ?? 0) >= 0.85;
  const conf = c.model_confidence !== null && c.model_confidence !== undefined
    ? c.model_confidence.toFixed(2)
    : "—";
  const dismissed = !!c.dismissed_at;

  return (
    <Link
      to={`/admin/ai-quality/referral/${c.referral_id}`}
      className={`aiq-corr-row${high ? " high" : ""}${dismissable && dismissed ? " aiq-corr-row-dismissed" : ""}`}
    >
      <span className="aiq-corr-time">{getRelativeTime(c.edited_at)}</span>
      <span className="aiq-corr-mid">
        <span className="aiq-corr-field">{c.field_path}</span>
        <span className="aiq-corr-diff">
          {c.change_type === "added" ? (
            <span className="aiq-corr-final">added {renderFieldValue(c.final_value)}</span>
          ) : c.change_type === "cleared" ? (
            <span className="aiq-corr-model">cleared {renderFieldValue(c.model_value)}</span>
          ) : (
            <>
              <span className="aiq-corr-model">{renderFieldValue(c.model_value)}</span>
              <span className="aiq-corr-arrow"><ArrowRight size={14} /></span>
              <span className="aiq-corr-final">{renderFieldValue(c.final_value)}</span>
            </>
          )}
        </span>
      </span>
      <span className="aiq-corr-r">
        <span className="aiq-corr-meta">
          {dismissable && dismissed && <span className="aiq-conf-badge aiq-ignored-badge">Ignored</span>}
          {high && <span className="aiq-conf-badge"><AlertTriangle size={10} />high</span>}
          conf {conf}{c.prompt_version ? ` · ${c.prompt_version}` : ""}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          {dismissable && c.id && (
            dismissed ? (
              <button
                type="button"
                className="aiq-corr-action"
                disabled={busy}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestore?.(c.id!); }}
              >
                <RotateCcw size={12} />Undo
              </button>
            ) : (
              <button
                type="button"
                className="aiq-corr-action"
                title="Exclude from quality stats — test or intentional edit"
                disabled={busy}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss?.(c.id!); }}
              >
                <EyeOff size={12} />Ignore
              </button>
            )
          )}
          <span className="aiq-corr-ref">View referral<ArrowUpRight size={12} /></span>
        </span>
      </span>
    </Link>
  );
}
