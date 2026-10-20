import { Link } from "react-router-dom";

export interface TodayItem {
  text: string;
  note?: string;
  /** Link target; items without one render as plain bold text. */
  to?: string;
  onClick?: () => void;
}
export interface TodayLine {
  key: "needs" | "reply" | "processing";
  label: string;
  count?: number;
  items: TodayItem[];
  action?: { label: string; to: string; onClick?: () => void };
}

interface TodayStripProps {
  lines: TodayLine[];
  emptyText?: string;
  emptyNote?: string;
  "data-tour"?: string;
}

/**
 * The clinic dashboard's one calm summary. Up to three lines on one left edge:
 * what needs the office (the only accent), what Dirxctional replied, what is
 * processing. Empty -> "Nothing needs you today."
 */
export function TodayStrip({ lines, emptyText = "Nothing needs you today.", emptyNote, ...rest }: TodayStripProps) {
  if (lines.length === 0) {
    return (
      <div className="ts" {...rest}>
        <div className="ts-row">
          <span className="ts-k">Today</span>
          <span className="ts-v"><b>{emptyText}</b>{emptyNote && <span className="q"> {emptyNote}</span>}</span>
          <span />
        </div>
      </div>
    );
  }
  return (
    <div className="ts" {...rest}>
      {lines.slice(0, 3).map((l) => (
        <div key={l.key} className="ts-row" data-accent={l.key === "needs" ? "" : undefined}>
          <span className="ts-k">{l.label}{!!l.count && l.count > 0 && <span className="n">{l.count}</span>}</span>
          <span className="ts-v">
            {l.items.map((it, i) => (
              <span key={i} className="it">
                {it.to ? <Link to={it.to} onClick={it.onClick}>{it.text}</Link> : <b>{it.text}</b>}
                {it.note && <span className="q"> {it.note}</span>}
              </span>
            ))}
          </span>
          {l.action ? <Link className="p3-link" to={l.action.to} onClick={l.action.onClick}>{l.action.label}</Link> : <span />}
        </div>
      ))}
    </div>
  );
}
