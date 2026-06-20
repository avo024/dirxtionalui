import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { getRelativeTime } from "@/lib/dateUtils";

/**
 * Dashboard note-notification bell. Shows referrals that have a NEW note from the
 * other party (clinic sees admin notes, admin sees clinic notes). A referral stays
 * "unread" until its Notes tab is opened (notes_last_viewed_<id> in localStorage,
 * set by the referral detail pages) — so the badge persists until they actually
 * read it. Clicking an item deep-links to the referral's Notes tab.
 */
export function NoteBell({
  referrals,
  noteField,
  linkBase,
}: {
  referrals: any[];
  noteField: "latest_clinic_note_at" | "latest_admin_note_at";
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

  const unread = (referrals || [])
    .filter((r) => {
      const ts = r?.[noteField];
      if (!ts) return false;
      const seen = localStorage.getItem(`notes_last_viewed_${r.id}`);
      return !seen || new Date(ts) > new Date(seen);
    })
    .sort((a, b) => new Date(b[noteField]).getTime() - new Date(a[noteField]).getTime());
  const count = unread.length;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`New notes${count ? ` (${count})` : ""}`}
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
          }}>{count}</span>
        )}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, maxHeight: 420,
          overflowY: "auto", background: "var(--bg-card)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", zIndex: 60,
        }}>
          <div style={{
            padding: "12px 14px", borderBottom: "1px solid var(--border-default)",
            fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)",
          }}>New notes{count > 0 ? ` (${count})` : ""}</div>
          {count === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              You're all caught up.
            </div>
          ) : (
            unread.map((r) => (
              <Link
                key={r.id}
                to={`${linkBase}/${r.id}?tab=notes`}
                onClick={() => setOpen(false)}
                style={{ display: "flex", gap: 10, padding: "11px 14px", borderTop: "1px solid var(--border-default)", textDecoration: "none", alignItems: "flex-start" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-teal)", flexShrink: 0, marginTop: 5 }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)" }}>
                    {r.patient_name || "Referral"}
                  </span>
                  <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--text-muted)", marginTop: 1 }}>
                    New note · {getRelativeTime(r[noteField])}{r.clinic_name ? ` · ${r.clinic_name}` : ""}
                  </span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
