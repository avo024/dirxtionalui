import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "queue.brief.expanded";

function loadExpanded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveExpanded(v: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    // ignore — per-viewer convenience only
  }
}

export interface QueueBriefClinicCount {
  clinic: string;
  count: number;
}

export interface QueueBriefProps {
  overdueCount: number;
  attentionCount: number;
  waitingOnUsCount: number;
  sentThisWeekCount: number;
  /** Waiting-on-us rows grouped by clinic, sorted desc, top 5 already applied by the caller. */
  byClinic: QueueBriefClinicCount[];
  onOverdueClick: () => void;
  onAttentionClick: () => void;
  onWaitingOnUsClick: () => void;
  onSentThisWeekClick: () => void;
  onClinicClick: (clinic: string) => void;
  /**
   * Demo-only: fixes the initial expand state and skips the localStorage
   * read/write, so two instances (e.g. the design-system page) can show the
   * collapsed and expanded states side by side without fighting over the
   * same persisted key. Real usage (the queue page) omits this.
   */
  demoExpanded?: boolean;
}

/**
 * One-line morning brief above the admin queue (replaces the retired admin
 * dashboard). Collapsed by default: a single muted line with bold counts,
 * each clickable to jump into the relevant filtered view. Expands into four
 * compact tiles. Hidden entirely when every count is zero.
 */
export function QueueBrief({
  overdueCount,
  attentionCount,
  waitingOnUsCount,
  sentThisWeekCount,
  byClinic,
  onOverdueClick,
  onAttentionClick,
  onWaitingOnUsClick,
  onSentThisWeekClick,
  onClinicClick,
  demoExpanded,
}: QueueBriefProps) {
  const isDemo = demoExpanded !== undefined;
  const [expanded, setExpanded] = useState(() => (isDemo ? demoExpanded : loadExpanded()));

  useEffect(() => {
    if (!isDemo) saveExpanded(expanded);
  }, [expanded, isDemo]);

  if (overdueCount === 0 && attentionCount === 0 && waitingOnUsCount === 0 && sentThisWeekCount === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex flex-1 flex-wrap items-center gap-1 text-[13px] text-muted-foreground">
          <button type="button" onClick={onOverdueClick} className="hover:underline underline-offset-2">
            <span className="font-semibold text-destructive">{overdueCount}</span> overdue
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={onAttentionClick} className="hover:underline underline-offset-2">
            <span className="font-semibold text-foreground">{attentionCount}</span> need attention
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={onWaitingOnUsClick} className="hover:underline underline-offset-2">
            <span className="font-semibold text-foreground">{waitingOnUsCount}</span> waiting on us
          </button>
          <span aria-hidden="true">·</span>
          <button type="button" onClick={onSentThisWeekClick} className="hover:underline underline-offset-2">
            <span className="font-semibold text-foreground">{sentThisWeekCount}</span> sent this week
          </button>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Details
          {expanded ? (
            <ChevronUp width={14} height={14} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ChevronDown width={14} height={14} strokeWidth={1.75} aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 border-t border-border p-3">
          <button
            type="button"
            onClick={onOverdueClick}
            className="rounded-md border border-border bg-background p-3 text-left hover:bg-muted/40"
          >
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="mt-1 text-xl font-semibold text-destructive tabular-nums">{overdueCount}</p>
          </button>

          <button
            type="button"
            onClick={onAttentionClick}
            className="rounded-md border border-border bg-background p-3 text-left hover:bg-muted/40"
          >
            <p className="text-xs text-muted-foreground">Needs attention</p>
            <p className="mt-1 text-xl font-semibold text-amber-600 tabular-nums">{attentionCount}</p>
          </button>

          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">Waiting on us, by clinic</p>
            {byClinic.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {byClinic.map((c) => (
                  <li key={c.clinic}>
                    <button
                      type="button"
                      onClick={() => onClinicClick(c.clinic)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded px-1 -mx-1 text-left text-sm hover:bg-muted/60",
                      )}
                    >
                      <span className="truncate text-foreground">{c.clinic}</span>
                      <span className="font-semibold text-muted-foreground tabular-nums">{c.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={onSentThisWeekClick}
            className="rounded-md border border-border bg-background p-3 text-left hover:bg-muted/40"
          >
            <p className="text-xs text-muted-foreground">Sent this week</p>
            <p className="mt-1 text-xl font-semibold text-muted-foreground tabular-nums">{sentThisWeekCount}</p>
          </button>
        </div>
      )}
    </div>
  );
}
