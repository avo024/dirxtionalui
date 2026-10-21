import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { formatDateTime } from "@/lib/dateUtils";
import { sectionSpan, type HistorySection } from "@/lib/history";
import "@/history.css";

/**
 * Stage-sectioned history (direction A). Each section: holder glyph + serif stage name
 * + span + collapse chevron. Past sections start collapsed, the current one is open,
 * upcoming ones are ghosted "not yet". Data comes from `groupHistory` (src/lib/history.ts).
 */
export function HistoryTimeline({ sections }: { sections: HistorySection[] }) {
  // Only the user's explicit toggles are stored; the default is derived from the section state.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (s: HistorySection) => (s.key in toggled ? toggled[s.key] : s.state === "current");

  return (
    <div className="ht" role="list">
      {sections.map((s) => {
        const open = isOpen(s);
        const expandable = s.state !== "future" && s.events.length > 0;
        const span = sectionSpan(s);
        const head = (
          <>
            <span className="ht-g" data-h={s.holder} aria-hidden="true"><i /></span>
            <span className="ht-name">{s.name}</span>
            {s.state === "current" && <span className="ht-now">Now</span>}
            <span className="ht-span">{s.state === "future" ? "not yet" : span}</span>
            <span className="ht-chev" data-open={open || undefined} aria-hidden="true">
              {expandable && <Icon name="chevron-down" size={16} />}
            </span>
          </>
        );
        return (
          <section key={s.key} className="ht-sec" data-h={s.holder} data-state={s.state} data-open={open || undefined} role="listitem">
            {expandable ? (
              <button type="button" className="ht-head" aria-expanded={open} onClick={() => setToggled((t) => ({ ...t, [s.key]: !open }))}>
                {head}
              </button>
            ) : (
              <div className="ht-head">{head}</div>
            )}
            {expandable && open && (
              <ol className="ht-body">
                {s.events.map((e, i) => (
                  <li key={`${e.type}-${e.at}-${i}`} className="ht-ev">
                    <span className="ht-tile" aria-hidden="true"><Icon name={e.icon} size={16} /></span>
                    <span className="ht-txt">
                      <span className="ht-label">{e.label}</span>
                      {e.detail && <span className="ht-detail">{e.detail}</span>}
                    </span>
                    {e.who && <span className="ht-who">{e.who}</span>}
                    <span className="ht-at">{formatDateTime(e.at)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
