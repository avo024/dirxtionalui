import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface QueueListProps {
  children: ReactNode;
  className?: string;
}

/**
 * Card container for a list of QueueRow items.
 * Rules: bg-card, border, rounded-lg, shadow-sm, overflow-hidden so each
 * row's border-b sits flush inside the rounded corners. role="list" for a11y
 * — pair with QueueRow (which should carry role="listitem").
 */
export function QueueList({ children, className }: QueueListProps) {
  return (
    <div className={cn("bg-card border border-border rounded-lg shadow-sm overflow-hidden", className)} role="list">
      {children}
    </div>
  );
}
