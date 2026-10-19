import * as React from "react";
import { useNavigate } from "react-router-dom";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface LinkRowProps extends Omit<React.HTMLAttributes<HTMLTableRowElement>, "onClick"> {
  to: string;
}

/**
 * Table row that navigates as a whole. Keyboard reachable (role=link, tabIndex,
 * Enter/Space). Put a real <Link> in the primary cell too; clicks on inner
 * links/buttons are left to those elements.
 */
export function LinkRow({ to, className, children, ...props }: LinkRowProps) {
  const navigate = useNavigate();
  const fromInner = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest("a,button,input,select,textarea") !== null;
  return (
    <TableRow
      role="link"
      tabIndex={0}
      className={cn("cursor-pointer hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", className)}
      onClick={(e) => { if (!fromInner(e)) navigate(to); }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(to); }
      }}
      {...props}
    >
      {children}
    </TableRow>
  );
}
