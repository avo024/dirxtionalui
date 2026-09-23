import type { ReactNode } from "react";
import { ChevronDown, File, Pencil, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StageChip } from "@/components/StageChip";

interface StageHeaderProps {
  patient: string;
  stage?: string;
  stageTone?: "teal";
  question?: string;
  lastEvent?: string;
  lastTime?: string;
  /** Internal-only note, never shown to the clinic. null/undefined -> empty state. */
  handoff?: string | null;
  onEditHandoff?: () => void;
  docCount?: number;
  onDocuments?: () => void;
  onMore?: () => void;
  /** When given, the More button opens this menu itself (same list the ActionBar uses). */
  moreItems?: Array<{ label: string; onClick?: () => void } | "-">;
  /** Interrupt/context badge shown beside the stage chip, e.g. "Fix delivery issue". */
  badge?: ReactNode;
  className?: string;
}

/**
 * Workstation page header: patient identity, current stage, the question
 * Mari needs answered right now, when the referral last moved, the private
 * handoff note, and the Documents/More affordances.
 */
export function StageHeader({
  patient,
  stage,
  stageTone,
  question,
  lastEvent,
  lastTime,
  handoff,
  onEditHandoff,
  docCount,
  onDocuments,
  onMore,
  moreItems,
  badge,
  className,
}: StageHeaderProps) {
  const hasHandoff = Boolean(handoff && handoff.trim().length > 0);

  return (
    <header className={cn("bg-card border-b border-border px-[26px] py-3.5 flex items-start gap-4", className)}>
      <div className="min-w-0 flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{patient}</h1>
          {stage && <StageChip label={stage} variant="outline" tone={stageTone} />}
          {badge}
        </div>
        {question && <p className="text-sm font-medium text-foreground">{question}</p>}
        {(lastEvent || lastTime) && (
          <p className="text-xs text-muted-foreground">
            Last: {lastEvent}
            {lastEvent && lastTime && " · "}
            {lastTime && <span className="font-mono">{lastTime}</span>}
          </p>
        )}

        <div
          className={cn(
            "mt-1 inline-flex items-start gap-1.5 rounded-md border px-2.5 py-1.5 text-xs max-w-xl",
            hasHandoff ? "bg-muted border-border text-foreground" : "border-dashed border-border text-muted-foreground italic",
          )}
        >
          <Pin width={14} height={14} strokeWidth={1.75} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span className="truncate">{hasHandoff ? handoff : "Add an internal handoff note for the next person"}</span>
          {onEditHandoff && (
            <button
              type="button"
              onClick={onEditHandoff}
              aria-label="Edit handoff note"
              className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Pencil width={14} height={14} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={onDocuments}>
          <File width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
          Documents{typeof docCount === "number" ? ` (${docCount})` : ""}
        </Button>
        {moreItems && moreItems.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">More <ChevronDown width={16} height={16} strokeWidth={1.75} aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {moreItems.map((m, i) => m === "-" ? <DropdownMenuSeparator key={`s${i}`} /> : <DropdownMenuItem key={m.label} onClick={m.onClick}>{m.label}</DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
                  <Button variant="outline" size="sm" onClick={onMore}>
          More
          <ChevronDown width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        )}
      </div>
    </header>
  );
}
