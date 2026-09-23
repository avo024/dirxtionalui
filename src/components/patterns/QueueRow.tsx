import { useState, type ReactNode } from "react";
import { AlertTriangle, MoreHorizontal, User, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { StageChip } from "@/components/StageChip";
import { initials, urgencyEdgeClass } from "./_shared";

interface QueueRowExtra {
  verb: string;
  due?: string;
  signal?: string;
}

interface QueueRowProps {
  verb: string;
  due?: string;
  urgency?: "overdue" | "attention";
  patient: string;
  drug: string;
  bridge?: boolean;
  clinic?: string;
  stage?: string;
  stageTone?: "teal";
  signal?: string;
  /** A second live track (e.g. PA + enrollment); rendered behind a "+1" chip. */
  extra?: QueueRowExtra;
  assignee?: string | null;
  onClick?: () => void;
  onMore?: () => void;
  /** Overrides the default overflow button with a caller-supplied menu trigger (e.g. a DropdownMenu), still hover-revealed. */
  menu?: ReactNode;
  className?: string;
}

/**
 * One row of the admin queue: two-column layout (ACTION | REFERRAL) plus a
 * right-hand overflow/assignee slot. Never renders a StatusBadge — status is
 * implied by the verb/stage/urgency, not restated as a pill. The only pill
 * allowed on this row is the small teal "Bridge" tag.
 */
export function QueueRow({
  verb,
  due,
  urgency,
  patient,
  drug,
  bridge,
  clinic,
  stage,
  stageTone,
  signal,
  extra,
  assignee,
  onClick,
  onMore,
  menu,
  className,
}: QueueRowProps) {
  const [expanded, setExpanded] = useState(false);
  const overdue = urgency === "overdue";

  return (
    <div
      role="listitem"
      onClick={onClick}
      className={cn(
        "group relative grid grid-cols-[220px_minmax(0,1fr)_auto] gap-6 py-3 pl-[calc(1rem+3px)] pr-4 min-h-[56px] border-b last:border-b-0 border-border cursor-pointer hover:bg-primary/[0.03]",
        className,
      )}
    >
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", urgencyEdgeClass(urgency))} aria-hidden="true" />

      {/* ACTION */}
      <div className="min-w-0 flex flex-col justify-center gap-0.5">
        <span className="text-sm font-semibold text-foreground truncate">{verb}</span>
        {due && (
          <span
            className={cn(
              "font-mono text-xs tabular-nums inline-flex items-center gap-1",
              overdue ? "text-destructive font-semibold" : "text-muted-foreground",
            )}
          >
            {overdue && <AlertTriangle width={14} height={14} strokeWidth={1.75} aria-hidden="true" />}
            {due}
          </span>
        )}
        {expanded && extra && (
          <div className="mt-1.5 pt-1.5 border-t border-dashed border-border flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground truncate">{extra.verb}</span>
            {extra.due && (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">{extra.due}</span>
            )}
          </div>
        )}
      </div>

      {/* REFERRAL */}
      <div className="min-w-0 flex flex-col justify-center gap-0.5">
        <span className="text-sm font-semibold text-foreground truncate">{patient}</span>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span className="truncate">{drug}</span>
          {bridge && (
            <span className="inline-flex items-center gap-0.5 shrink-0 rounded-full bg-teal-50 text-teal-700 px-1.5 py-0.5 text-[10px] font-medium">
              <Zap width={10} height={10} strokeWidth={1.75} aria-hidden="true" />
              Bridge
            </span>
          )}
          {clinic && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{clinic}</span>
            </>
          )}
          {stage && (
            <>
              <span aria-hidden="true">·</span>
              <StageChip label={stage} variant="text" tone={stageTone} size="sm" className="shrink-0" />
            </>
          )}
          {signal && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{signal}</span>
            </>
          )}
          {extra && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="ml-auto shrink-0 font-mono text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground hover:bg-muted/70"
            >
              +1
            </button>
          )}
        </div>
        {expanded && extra?.signal && (
          <div className="text-xs text-muted-foreground truncate">{extra.signal}</div>
        )}
      </div>

      {/* RIGHT: overflow + assignee */}
      <div className="flex items-center gap-2 justify-self-end self-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          {menu ?? (
            <button
              type="button"
              aria-label="More options"
              onClick={() => onMore?.()}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <MoreHorizontal width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
        {assignee ? (
          <span
            title={assignee}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 text-[10px] font-semibold"
          >
            {initials(assignee)}
          </span>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
            <User width={14} height={14} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
