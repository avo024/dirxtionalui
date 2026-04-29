import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getRelativeTime } from "@/lib/dateUtils";
import type { AIQualityCorrection } from "@/lib/aiQualityApi";

interface Props {
  correction: AIQualityCorrection;
}

function formatVal(v: string | null): string {
  if (v === null || v === undefined || v === "") return "(empty)";
  return `"${v}"`;
}

function changeArrow(c: AIQualityCorrection): string {
  if (c.change_type === "added") return `(added ${formatVal(c.final_value)})`;
  if (c.change_type === "cleared") return `(cleared ${formatVal(c.model_value)})`;
  return `${formatVal(c.model_value)} → ${formatVal(c.final_value)}`;
}

export function CorrectionRow({ correction: c }: Props) {
  const highConf = (c.model_confidence ?? 0) >= 0.85;
  const conf =
    c.model_confidence !== null && c.model_confidence !== undefined
      ? `conf ${c.model_confidence.toFixed(2)}`
      : "conf —";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm",
        highConf && "border-l-4 border-l-warning",
      )}
    >
      <span className="w-20 shrink-0 text-xs text-muted-foreground">
        {getRelativeTime(c.edited_at)}
      </span>
      <code className="w-56 shrink-0 truncate text-xs text-foreground">
        {c.field_path}
      </code>
      <span className="flex-1 truncate text-foreground">{changeArrow(c)}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {conf}
        {c.prompt_version ? ` · prompt ${c.prompt_version}` : ""}
      </span>
      <Link
        to={`/admin/ai-quality/referral/${c.referral_id}`}
        className="shrink-0 text-xs font-medium text-primary hover:underline"
      >
        View referral →
      </Link>
    </div>
  );
}
