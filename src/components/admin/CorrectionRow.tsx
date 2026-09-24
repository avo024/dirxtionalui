import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, ArrowUpRight, EyeOff, RotateCcw } from "lucide-react";
import { getRelativeTime } from "@/lib/dateUtils";
import { renderFieldValue } from "@/lib/aiQualityFormat";
import type { AIQualityCorrection } from "@/lib/aiQualityApi";
import { cn } from "@/lib/utils";

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
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 border-b last:border-0 border-border no-underline hover:bg-muted/50 transition-colors",
        high && "bg-warning/5",
        dismissable && dismissed && "opacity-50",
      )}
    >
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">{getRelativeTime(c.edited_at)}</span>
      <span className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground shrink-0">{c.field_path}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
          {c.change_type === "added" ? (
            <span className="font-semibold text-foreground">added {renderFieldValue(c.final_value)}</span>
          ) : c.change_type === "cleared" ? (
            <span className="line-through">cleared {renderFieldValue(c.model_value)}</span>
          ) : (
            <>
              <span className="line-through">{renderFieldValue(c.model_value)}</span>
              <ArrowRight width={14} height={14} strokeWidth={1.75} className="shrink-0" />
              <span className="font-semibold text-foreground">{renderFieldValue(c.final_value)}</span>
            </>
          )}
        </span>
      </span>
      <span className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          {dismissable && dismissed && (
            <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">Ignored</span>
          )}
          {high && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-[#92610B] px-1.5 py-0.5 text-[10px] font-bold">
              <AlertTriangle width={10} height={10} strokeWidth={1.75} />high
            </span>
          )}
          conf {conf}{c.prompt_version ? ` · ${c.prompt_version}` : ""}
        </span>
        <span className="inline-flex items-center gap-2.5">
          {dismissable && c.id && (
            dismissed ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                disabled={busy}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRestore?.(c.id!); }}
              >
                <RotateCcw width={12} height={12} strokeWidth={1.75} />Undo
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                title="Exclude from quality stats — test or intentional edit"
                disabled={busy}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss?.(c.id!); }}
              >
                <EyeOff width={12} height={12} strokeWidth={1.75} />Ignore
              </button>
            )
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">View referral<ArrowUpRight width={12} height={12} strokeWidth={1.75} /></span>
        </span>
      </span>
    </Link>
  );
}
