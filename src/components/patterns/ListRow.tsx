import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import "@/lists.css";

interface ListRowsProps {
  /** Column headings; `{ label, r: true }` right-aligns. Hidden under 600px. */
  head?: (React.ReactNode | { label: React.ReactNode; r?: boolean })[];
  /** CSS grid-template-columns for head + rows (default: patient · status · date · chevron). */
  cols?: string;
  className?: string;
  children: React.ReactNode;
  "data-tour"?: string;
}

/** Container for ListRow rows (clinic Referrals / Patients / dashboard lists). */
export function ListRows({ head, cols, className, children, ...rest }: ListRowsProps) {
  return (
    <div
      className={cn("lr-list", className)}
      role="list"
      style={cols ? ({ "--lr-cols": cols } as React.CSSProperties) : undefined}
      {...rest}
    >
      {head && (
        <div className="lr-head">
          {head.map((h, i) => {
            const isObj = typeof h === "object" && h !== null && !React.isValidElement(h);
            return (
              <span key={i} className={isObj && (h as { r?: boolean }).r ? "r" : undefined}>
                {isObj ? (h as { label: React.ReactNode }).label : (h as React.ReactNode)}
              </span>
            );
          })}
        </div>
      )}
      {children}
    </div>
  );
}

interface ListRowProps {
  /** Destination for the whole row. Omit for a row with nowhere to go (not clickable, no chevron). */
  to?: string;
  /** Visually quiet row (e.g. a discontinued medication). */
  quiet?: boolean;
  /** Patient name. Pass a real <Link> so the primary cell stays a native link. */
  patient: React.ReactNode;
  /** Second muted line (drug, "by X"...). */
  sub?: React.ReactNode;
  /** Open request — short line under the lead, in the clinic hue. */
  request?: React.ReactNode;
  status?: React.ReactNode;
  extra?: React.ReactNode;
  when?: React.ReactNode;
  /** Replaces the default status column (e.g. Patients' contact / drug / PA columns). */
  children?: React.ReactNode;
  /** Optional trailing control placed before the chevron (e.g. Unarchive). */
  action?: React.ReactNode;
}

/**
 * Whole-row navigation. Keyboard reachable (Enter/Space); clicks on inner
 * links/buttons are left to those elements.
 */
export function ListRow({ to, quiet, patient, sub, request, status, extra, when, children, action }: ListRowProps) {
  const navigate = useNavigate();
  const fromInner = (e: React.SyntheticEvent) =>
    (e.target as HTMLElement).closest("a,button,input,select,textarea") !== null;
  return (
    <div
      className="lr"
      role="listitem"
      tabIndex={to ? 0 : undefined}
      data-static={to ? undefined : ""}
      data-quiet={quiet ? "" : undefined}
      onClick={to ? (e) => { if (!fromInner(e)) navigate(to); } : undefined}
      onKeyDown={to ? (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(to); }
      } : undefined}
    >
      <div className="who">
        <span className="p">{patient}</span>
        {sub && <span className="d">{sub}</span>}
        {request && <span className="req">{request}</span>}
      </div>
      {children !== undefined ? children : <div className="st">{status}{extra}</div>}
      <span className="when">{when}</span>
      {action}
      <span className="chev">{to && <Icon name="chevron-right" />}</span>
    </div>
  );
}
