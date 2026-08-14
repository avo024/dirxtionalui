/**
 * WorkstationCard — collapsible shell for the admin referral workstation.
 *
 * Collapsed: one header line that still tells the story (title + status
 * summary + optional tone dot). Expanded: the card's normal content.
 * The stage brain (workstationStage.ts) decides what opens on load;
 * clicking a header always wins after that.
 */

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import "./workstation.css";

export type WorkstationTone = "neutral" | "active" | "warn" | "urgent" | "done";

export function WorkstationCard({
  title,
  summary,
  tone = "neutral",
  open,
  onToggle,
  children,
  id,
}: {
  title: string;
  summary?: ReactNode;       // collapsed one-liner — carries the card's status
  tone?: WorkstationTone;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  id?: string;
  bare?: boolean;            // child brings its own card chrome (e.g. PAManagementCard)
}) {
  return (
    <div className={`ws-card ws-${tone} ${open ? "ws-open" : ""}`} id={id}>
      <button
        type="button"
        className="ws-head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className={`ws-dot ws-dot-${tone}`} aria-hidden="true" />
        <span className="ws-title">{title}</span>
        {!open && summary ? <span className="ws-summary">{summary}</span> : null}
        <ChevronDown size={16} className="ws-chevron" aria-hidden="true" />
      </button>
      {open && <div className={bare ? "ws-body-bare" : "ws-body"}>{children}</div>}
    </div>
  );
}
