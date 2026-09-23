import type { ReactNode } from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DefinitionRow {
  label: string;
  value?: ReactNode;
  /** Render the value in font-mono (IDs, dates, dollar amounts, etc). */
  mono?: boolean;
  /** Show a copy-to-clipboard button; only meaningful when value is a string. */
  copy?: boolean;
  /** 0-1 extraction confidence; renders as a colored dot with a tooltip. */
  confidence?: number;
  /** Amber flag beside the label for a field that needs a human look. */
  flag?: boolean;
}

interface DefinitionListProps {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  /** Count shown as an amber "n to fix" chip beside the title. */
  flagged?: number;
  /** "rail" = compact two-column sidebar layout instead of the normal card rows. */
  density?: "rail";
  rows: DefinitionRow[];
  className?: string;
}

function confidenceClass(confidence: number): string {
  if (confidence >= 0.85) return "bg-success";
  if (confidence >= 0.5) return "bg-warning";
  return "bg-destructive";
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Clipboard API can be unavailable (permissions, non-secure context) — fail silently.
  }
}

/**
 * Card of label/value pairs for extracted or structured fields (patient
 * info, insurance, drug details). `density="rail"` renders a compact
 * sidebar variant instead of the default full-width card rows.
 */
export function DefinitionList({ title, icon, action, flagged, density, rows, className }: DefinitionListProps) {
  const rail = density === "rail";

  return (
    <div className={cn("bg-card border border-border rounded-lg", rail ? "p-3" : "p-[var(--density-card-pad)]", className)}>
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">
            {icon}
          </span>
        )}
        <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">{title}</h3>
        {typeof flagged === "number" && flagged > 0 && (
          <span className="inline-flex items-center rounded-full bg-warning/15 text-[#B45309] px-2 py-0.5 text-[11px] font-medium">
            {flagged} to fix
          </span>
        )}
        {action && <div className="ml-auto">{action}</div>}
      </div>

      <div>
        {rows.map((row, i) => (
          <div
            key={row.label + i}
            className={cn(
              "grid gap-4 border-b border-border last:border-0",
              rail ? "grid-cols-[auto_1fr] py-1.5" : "grid-cols-[190px_1fr] py-2.5",
            )}
          >
            <div className={cn("flex items-center gap-1.5 text-muted-foreground", rail ? "text-xs" : "text-sm")}>
              {row.flag && (
                <AlertTriangle width={14} height={14} strokeWidth={1.75} className="text-warning shrink-0" aria-hidden="true" />
              )}
              <span className="truncate">{row.label}</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-1.5 font-semibold text-foreground min-w-0",
                rail ? "text-xs justify-end text-right" : "text-sm",
                row.mono && "font-mono",
              )}
            >
              {typeof row.confidence === "number" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn("h-2 w-2 rounded-full shrink-0", confidenceClass(row.confidence))}
                      aria-label={`Confidence ${Math.round(row.confidence * 100)}%`}
                    />
                  </TooltipTrigger>
                  <TooltipContent>{Math.round(row.confidence * 100)}% confidence</TooltipContent>
                </Tooltip>
              )}
              <span className="truncate">
                {row.value === undefined || row.value === null || row.value === "" ? (
                  <span className="font-normal text-muted-foreground">—</span>
                ) : (
                  row.value
                )}
              </span>
              {row.copy && typeof row.value === "string" && row.value.length > 0 && (
                <button
                  type="button"
                  aria-label={`Copy ${row.label}`}
                  onClick={() => copyToClipboard(row.value as string)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <Copy width={14} height={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
