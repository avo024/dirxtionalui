import type { ReactNode } from "react";
import { ArrowRight, ClipboardList, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionSpec {
  label: string;
  onClick?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  /** Pass "success" to render the primary action as the green confirm button. */
  variant?: string;
}

interface ActionBarProps {
  status?: string;
  tone?: "success" | "warning" | "destructive";
  icon?: ReactNode;
  request?: { openCount?: number; onClick?: () => void } | null;
  secondary?: ActionSpec | null;
  primary?: ActionSpec | null;
  more?: Array<{ label: string; onClick?: () => void } | "-">;
  next?: { label?: string; onClick?: () => void } | null;
  className?: string;
}

const toneClass: Record<NonNullable<ActionBarProps["tone"]>, string> = {
  success: "text-success",
  warning: "text-[#B45309]",
  destructive: "text-destructive",
};

/**
 * Sticky footer that carries the current stage's status line and its action
 * buttons. "Request from clinic" is always present (unless the caller omits
 * `request`) and never competes with the stage's primary action. Button
 * order, left to right: More · Request from clinic · secondary · primary ·
 * Next in queue.
 */
export function ActionBar({ status, tone, icon, request, secondary, primary, more, next, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 bg-card border-t border-border px-[26px] py-3 flex items-center gap-3.5 shadow-[0_-4px_12px_rgba(18,29,62,.04)]",
        className,
      )}
    >
      {(status || icon) && (
        <div className={cn("flex items-center gap-1.5 text-sm", tone ? toneClass[tone] : "text-muted-foreground")}>
          {icon}
          {status && <span>{status}</span>}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {more && more.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {more.map((item, i) =>
                item === "-" ? (
                  <DropdownMenuSeparator key={`sep-${i}`} />
                ) : (
                  <DropdownMenuItem key={item.label} onClick={item.onClick}>
                    {item.label}
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {request && (
          <Button variant="outline" onClick={request.onClick}>
            <ClipboardList width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
            Request from clinic
            {typeof request.openCount === "number" && request.openCount > 0 ? ` · ${request.openCount} open` : ""}
          </Button>
        )}

        {secondary && (
          <Button variant="outline" onClick={secondary.onClick} disabled={secondary.disabled}>
            {secondary.icon}
            {secondary.label}
          </Button>
        )}

        {primary && (
          <Button
            variant={primary.variant === "success" ? undefined : "default"}
            className={primary.variant === "success" ? "bg-success text-success-foreground hover:bg-success/90" : undefined}
            onClick={primary.onClick}
            disabled={primary.disabled}
          >
            {primary.icon}
            {primary.label}
          </Button>
        )}

        {next && (
          <Button variant="outline" onClick={next.onClick}>
            {next.label ?? "Next in queue"}
            <ArrowRight width={16} height={16} strokeWidth={1.75} aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
