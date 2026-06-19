import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ArrowUpRight } from "lucide-react";
import { getRelativeTime } from "@/lib/dateUtils";
import { renderFieldValue } from "@/lib/aiQualityFormat";
import type { AIQualityCorrection } from "@/lib/aiQualityApi";
import "@/pages/admin/aiq.css";

interface Props {
  correction: AIQualityCorrection;
}

export function CorrectionRow({ correction: c }: Props) {
  const high = (c.model_confidence ?? 0) >= 0.85;
  const conf = c.model_confidence !== null && c.model_confidence !== undefined
    ? c.model_confidence.toFixed(2)
    : "—";

  return (
    <Link to={`/admin/ai-quality/referral/${c.referral_id}`} className={`aiq-corr-row${high ? " high" : ""}`}>
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
          {high && <span className="aiq-conf-badge"><AlertTriangle size={10} />high</span>}
          conf {conf}{c.prompt_version ? ` · ${c.prompt_version}` : ""}
        </span>
        <span className="aiq-corr-ref">View referral<ArrowUpRight size={12} /></span>
      </span>
    </Link>
  );
}
