import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Send, CircleDot, Check, RotateCcw, CircleCheck, Info,
  LifeBuoy, MessageSquareHeart, AlertTriangle, UserCheck,
} from "lucide-react";
import { adminApi, type SupportCaseSummary, type SupportMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime, formatDateTime } from "@/lib/dateUtils";
import { SupportStatusBadge } from "@/components/SupportStatusBadge";
import "../clinic/wizard.css";
import "./admin-referral-review.css";
import "./admin-support.css";

function initials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

type CaseData = { case: SupportCaseSummary; messages: SupportMessage[] };

export default function AdminSupportDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminApi.getSupportCase(caseId!);
        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) toast({ title: "Error", description: e.message || "Failed to load case", variant: "destructive" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !data) return;
    setSending(true);
    try {
      const updated = await adminApi.replySupportCase(caseId!, body);
      setData((d) => d ? {
        case: updated,
        messages: [...d.messages, { id: `tmp-${Date.now()}`, author_type: "admin", author_name: "You", body, created_at: new Date().toISOString() }],
      } : d);
      setDraft("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send reply", variant: "destructive" });
    } finally { setSending(false); }
  };

  const setStatus = async (status: string) => {
    if (!data) return;
    setBusy(true);
    try {
      const updated = await adminApi.setSupportCaseStatus(caseId!, status);
      setData((d) => d ? { ...d, case: updated } : d);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to update status", variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (loading) {
    return <div className="rw-page" style={{ display: "flex", justifyContent: "center", padding: 64 }}>
      <span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span>
    </div>;
  }
  if (!data) return <div className="rw-page" style={{ padding: 40 }}>Case not found.</div>;

  const c = data.case;
  const status = c.status;

  return (
    <div className="as-detail rw-fade">
      <div className="as-d-head">
        <button className="as-back" onClick={() => navigate("/admin/support")} title="Back to cases"><ArrowLeft size={17} /></button>
        <div className="as-d-main">
          <div className="as-d-titlerow">
            <h1 className="as-d-subject">{c.subject}</h1>
            <SupportStatusBadge status={status} />
            <span className="as-d-casenum">#{c.short_id}</span>
          </div>
          <div className="as-d-meta">
            <b>{c.clinic_name}</b>
            <span className="sepbar">·</span>
            <span className={`as-cat ${c.category}`}>
              <span className="ci">{c.category === "delivery_issue" ? <AlertTriangle size={12} /> : c.category === "feedback" ? <MessageSquareHeart size={12} /> : <LifeBuoy size={12} />}</span>
              {c.category === "delivery_issue" ? "Delivery issue" : c.category === "feedback" ? "Feedback" : "Support"}
            </span>
            <span className="sepbar">·</span>
            <span>Opened {getRelativeTime(c.created_at)}</span>
            <span className="sepbar">·</span>
            {c.assigned_admin_name
              ? <span><b>{c.assigned_admin_name}</b> is handling this</span>
              : <span style={{ color: "var(--color-warning, #b45309)", fontWeight: 600 }}>Unclaimed</span>}
            {c.referral_id && (
              <>
                <span className="sepbar">·</span>
                <Link to={`/admin/referrals/${c.referral_id}`} state={{ fromCaseId: c.id }} style={{ color: "var(--color-teal-700)", fontWeight: 700 }}>
                  Open referral #{c.referral_short} →
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="as-d-actions">
          {!c.assigned_admin_id ? (
            <button className="rw-btn outline sm" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await adminApi.claimSupportCase(caseId!); const full = await adminApi.getSupportCase(caseId!); setData(full); }
              catch (e: any) { toast({ title: "Couldn't claim", description: e.message, variant: "destructive" }); }
              finally { setBusy(false); }
            }}><UserCheck size={14} />Claim</button>
          ) : (
            <button className="rw-btn outline sm" disabled={busy} title="Release your claim so a teammate can take it"
              onClick={async () => {
                setBusy(true);
                try { const u = await adminApi.releaseSupportCase(caseId!); setData((d) => d ? { ...d, case: u } : d); }
                catch (e: any) { toast({ title: "Couldn't release", description: e.message, variant: "destructive" }); }
                finally { setBusy(false); }
              }}><UserCheck size={14} />Release</button>
          )}
          {!c.assigned_admin_id ? (
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)", alignSelf: "center" }}>
              Claim this case to work it
            </span>
          ) : <>
            {status === "open" && <>
              <button className="rw-btn primary sm" disabled={busy} onClick={() => setStatus("in_progress")}><CircleDot size={14} />Mark In progress</button>
              <button className="rw-btn outline sm" disabled={busy} onClick={() => setStatus("resolved")}><Check size={14} />Mark Resolved</button>
            </>}
            {status === "in_progress" && <button className="rw-btn primary sm" disabled={busy} onClick={() => setStatus("resolved")}><Check size={14} />Mark Resolved</button>}
            {status === "resolved" && <button className="rw-btn outline sm" disabled={busy} onClick={() => setStatus("open")}><RotateCcw size={14} />Reopen</button>}
          </>}
        </div>
      </div>

      <div className="as-thread-scroll" ref={scrollRef}>
        <div className="as-thread">
          {data.messages.map((m) => {
            const isAdmin = m.author_type === "admin";
            return (
              <div key={m.id} className={`arr-note ${isAdmin ? "admin" : "clinic"}`}>
                <span className="arr-note-ava">{initials(m.author_name)}</span>
                <div className="arr-note-body">
                  <div className="arr-note-card">
                    <div className="arr-note-head">
                      <span className="arr-note-author">{m.author_name}</span>
                      <span className="arr-note-when">{formatDateTime(m.created_at)}</span>
                    </div>
                    <p className="arr-note-text">{m.body}</p>
                  </div>
                </div>
              </div>
            );
          })}
          {status === "resolved" && (
            <div className="as-resolved-line">
              <span className="rl-bar" /><span className="ri"><CircleCheck size={14} /></span>Case resolved<span className="rl-bar" />
            </div>
          )}
        </div>
      </div>

      <div className="as-composer-wrap">
        {status === "resolved" ? (
          <div className="as-reopen-bar">
            <span className="rt">This case is <b>resolved</b>. Reopen it to reply.</span>
            <button className="rw-btn outline sm" disabled={busy} onClick={() => setStatus("open")}><RotateCcw size={14} />Reopen</button>
          </div>
        ) : (
          <>
            <div className="as-composer">
              <textarea rows={2} placeholder="Reply to the clinic…" value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
              <button className="rw-btn primary" disabled={!draft.trim() || sending} onClick={send}>
                {sending ? <span className="rw-spin" style={{ display: "inline-flex" }}><Loader2 size={15} /></span> : <Send size={15} />}Send
              </button>
            </div>
            <div className="as-composer-hint"><Info size={12} />Replies are visible to the clinic in their portal. ⌘↵ to send.</div>
          </>
        )}
      </div>
    </div>
  );
}
