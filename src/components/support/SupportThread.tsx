import { useState, useRef, useEffect } from "react";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { useSupportThread } from "./useSupportThread";
import { formatDateTime } from "@/lib/dateUtils";
// Reuse the referral Notes chat bubble styles (rd-note*) for visual consistency.
import "@/pages/clinic/referral-detail.css";

function initials(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Clinic "Contact us" support thread. Reuses the referral Notes chat styling.
 * `active` gates loading (so it only fetches when the panel is shown). Admin
 * replies render on the Dirxctional side; clinic messages on the clinic side.
 */
export function SupportThread({ active, onSent }: { active: boolean; onSent?: () => void }) {
  const { messages, loading, sending, error, send } = useSupportThread(active);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<"support" | "feedback">("support");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loading]);

  const handleSend = async () => {
    if (!body.trim() || sending) return;
    const ok = await send(body, category);
    if (ok) {
      setBody("");
      onSent?.();
    }
  };

  const toggleBtn = (val: "support" | "feedback", label: string) => (
    <button
      type="button"
      onClick={() => setCategory(val)}
      style={{
        flex: 1,
        padding: "5px 0",
        fontSize: "var(--text-xs)",
        fontWeight: 600,
        border: "none",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        color: category === val ? "#fff" : "var(--text-muted)",
        background: category === val ? "var(--color-teal)" : "transparent",
        transition: "background .15s, color .15s",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 420 }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 32, color: "var(--color-teal)" }}>
            <span className="rw-spin"><Loader2 size={22} /></span>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
            <MessageSquare size={26} style={{ opacity: 0.5, marginBottom: 8 }} />
            <p style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              How can we help?
            </p>
            <p style={{ fontSize: "var(--text-xs)", margin: "4px 0 0" }}>
              Ask about your account, billing, or how something works. We'll reply here.
            </p>
          </div>
        ) : (
          <div className="rd-notes" style={{ padding: 0 }}>
            {messages.map((m) => {
              const isAdmin = m.author_type === "admin";
              return (
                <div key={m.id} className={`rd-note ${isAdmin ? "admin" : "clinic"}`}>
                  <span className="rd-note-ava">{initials(m.author_name)}</span>
                  <div className="rd-note-body">
                    <div className="rd-note-card">
                      <div className="rd-note-head">
                        <span className="rd-note-author">
                          {m.author_name}
                          {m.category === "feedback" ? " · Feedback" : ""}
                        </span>
                        <span className="rd-note-when">{m.created_at ? formatDateTime(m.created_at) : ""}</span>
                      </div>
                      <p className="rd-note-text">{m.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div style={{ borderTop: "1px solid var(--border-default)", padding: 10 }}>
        {error && (
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-error)", margin: "0 0 6px" }}>{error}</p>
        )}
        <div
          style={{
            display: "flex",
            gap: 2,
            padding: 2,
            marginBottom: 8,
            background: "var(--color-gray-100, #f1f5f9)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {toggleBtn("support", "Support")}
          {toggleBtn("feedback", "Feedback")}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
            placeholder={category === "feedback" ? "Share your feedback…" : "Type your message…"}
            rows={2}
            style={{
              flex: 1,
              resize: "none",
              fontSize: "var(--text-sm)",
              padding: "8px 10px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              fontFamily: "inherit",
            }}
          />
          <button
            type="button"
            className="rw-btn primary"
            onClick={handleSend}
            disabled={!body.trim() || sending}
            style={{ flexShrink: 0 }}
            aria-label="Send message"
          >
            {sending ? <span className="rw-spin"><Loader2 size={15} /></span> : <Send size={15} />}
          </button>
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", margin: "8px 2px 0", lineHeight: 1.35 }}>
          For anything about a specific patient, use <strong>Notes</strong> on the referral.
        </p>
      </div>
    </div>
  );
}
