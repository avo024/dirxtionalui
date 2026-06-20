import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, MessageSquare, AlertTriangle, ClipboardCheck } from "lucide-react";
import { getRelativeTime } from "@/lib/dateUtils";

/**
 * Unified dashboard notification center. One bell, two kinds of items:
 *  - "note"   — a NEW note from the other party (unread until the referral's Notes
 *               tab is opened; tracked by notes_last_viewed_<id> in localStorage).
 *  - "action" — a referral that needs work: clinic = rejected, admin = ready_for_review.
 *               These persist until the underlying status changes (no read-state).
 * Clicking an item deep-links to the referral (notes → ?tab=notes).
 */
type Kind = "note" | "rejected" | "review";
const META: Record<Kind, { icon: any; color: string; label: string }> = {
  note: { icon: MessageSquare, color: "var(--color-teal)", label: "New note" },
  rejected: { icon: AlertTriangle, color: "var(--color-error)", label: "Rejected — needs attention" },
  review: { icon: ClipboardCheck, color: "var(--color-navy)", label: "Ready for review" },
};
const MAX_LIST = 10;

export function NotificationBell({
  referrals,
  noteField,
  actionStatus,
  linkBase,
}: {
  referrals: any[];
  noteField: "latest_clinic_note_at" | "latest_admin_note_at";
  actionStatus: "rejected" | "ready_for_review" | null;
  linkBase: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items: { key: string; kind: Kind; patient: string; clinic?: string; when: string; link: string }[] = [];
  for (const r of referrals || []) {
    const ts = r?.[noteField];
    if (ts) {
      const seen = localStorage.getItem(`notes_last_viewed_${r.id}`);
      if (!seen || new Date(ts) > new Date(seen)) {
        items.push({ key: `${r.id}-note`, kind: "note", patient: r.patient_name || "Referral", clinic: r.clinic_name, when: ts, link: `${linkBase}/${r.id}?tab=notes` });
      }
    }
    if (actionStatus && r.status === actionStatus) {
      items.push({
        key: `${r.id}-action`,
        kind: actionStatus === "rejected" ? "rejected" : "review",
        patient: r.patient_name || "Referral",
        clinic: r.clinic_name,
        when: r.updated_at || r.created_at || ts || "",
        link: `${linkBase}/${r.id}`,
      });
    }
  }
  items.sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime());
  const count = items.length;
  const shown = items.slice(0, MAX_LIST);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${count ? ` (${count})` : ""}`}
        style={{
          position: "relative", width: 38, height: 38, borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-default)", background: "#fff",
          color: count ? "var(--color-navy)" : "var(--text-muted)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span style={{
            position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 5px",
            borderRadius: 9999, background: "var(--color-error)", color: "#fff", fontSize: 11,
            fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontVariantNumeric: "tabular-nums",
          }}>{count > 9 ? "9+" : count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", width: 340, maxHeight: 440,
          overflowY: "auto", background: "var(--bg-card)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", zIndex: 60,
        }}>
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid var(--border-default)",
            fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)",
          }}>Notifications{count > 0 ? ` (${count})` : ""}</div>
          {count === 0 ? (
            <div style={{ padding: "26px 14px", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              You're all caught up.
            </div>
          ) : (
            <>
              {shown.map((it) => {
                const m = META[it.kind];
                const Icon = m.icon;
                return (
                  <Link
                    key={it.key}
                    to={it.link}
                    onClick={() => setOpen(false)}
                    style={{ display: "flex", gap: 11, padding: "11px 14px", borderTop: "1px solid var(--border-default)", textDecoration: "none", alignItems: "flex-start" }}
                  >
                    <span style={{ color: m.color, display: "inline-flex", marginTop: 1, flexShrink: 0 }}><Icon size={16} /></span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{it.patient}</span>
                      <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>
                        {m.label}{it.when ? ` · ${getRelativeTime(it.when)}` : ""}{it.clinic ? ` · ${it.clinic}` : ""}
                      </span>
                    </span>
                  </Link>
                );
              })}
              {count > MAX_LIST && (
                <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border-default)", fontSize: "var(--text-xs)", color: "var(--text-muted)", textAlign: "center" }}>
                  +{count - MAX_LIST} more
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
