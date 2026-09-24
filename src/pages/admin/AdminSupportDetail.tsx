import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Check, RotateCcw,
  LifeBuoy, MessageSquareHeart, AlertTriangle, UserCheck,
} from "lucide-react";
import { adminApi, type SupportCaseSummary, type SupportMessage } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime, formatDateTime } from "@/lib/dateUtils";
import { SupportStatusBadge } from "@/components/SupportStatusBadge";
import { Button } from "@/components/ui/button";
import { MessageThread } from "@/components/patterns/MessageThread";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/patterns/PageContainer";

type CaseData = { case: SupportCaseSummary; messages: SupportMessage[] };

export default function AdminSupportDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

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
    return (
      <PageContainer fade={false} className="flex justify-center py-16">
        <Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" />
      </PageContainer>
    );
  }
  if (!data) return <PageContainer fade={false} className="py-10 text-sm text-muted-foreground">Case not found.</PageContainer>;

  const c = data.case;
  const status = c.status;
  const resolved = status === "resolved";

  const threadMessages = [
    ...data.messages.map((m) => ({
      side: (m.author_type === "admin" ? "ours" : "clinic") as "ours" | "clinic",
      name: m.author_name,
      time: formatDateTime(m.created_at),
      body: m.body,
    })),
    ...(resolved ? [{ system: "Case resolved" }] : []),
  ];

  return (
    <PageContainer>
      <div className="flex items-start gap-3 mb-4">
        <Button variant="ghost" size="icon" className="mt-0.5" onClick={() => navigate("/admin/support")} title="Back to cases">
          <ArrowLeft width={17} height={17} strokeWidth={1.75} />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-foreground">{c.subject}</h1>
            <SupportStatusBadge status={status} />
            <span className="font-mono text-xs text-muted-foreground">#{c.short_id}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mt-1">
            <b className="text-foreground font-semibold">{c.clinic_name}</b>
            <span>·</span>
            <span className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              c.category === "delivery_issue" ? "bg-destructive/10 text-destructive"
                : c.category === "feedback" ? "bg-teal-600/10 text-teal-700" : "bg-primary/10 text-primary",
            )}>
              {c.category === "delivery_issue" ? <AlertTriangle width={12} height={12} strokeWidth={1.75} /> : c.category === "feedback" ? <MessageSquareHeart width={12} height={12} strokeWidth={1.75} /> : <LifeBuoy width={12} height={12} strokeWidth={1.75} />}
              {c.category === "delivery_issue" ? "Delivery issue" : c.category === "feedback" ? "Feedback" : "Support"}
            </span>
            <span>·</span>
            <span>Opened {getRelativeTime(c.created_at)}</span>
            <span>·</span>
            {c.assigned_admin_name
              ? <span><b className="text-foreground font-semibold">{c.assigned_admin_name}</b> is handling this</span>
              : <span className="text-warning font-semibold">Unclaimed</span>}
            {c.referral_id && (
              <>
                <span>·</span>
                <Link to={`/admin/referrals/${c.referral_id}`} state={{ fromCaseId: c.id }} className="text-teal-700 font-semibold hover:underline">
                  Open referral #{c.referral_short} →
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!c.assigned_admin_id ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await adminApi.claimSupportCase(caseId!); const full = await adminApi.getSupportCase(caseId!); setData(full); }
              catch (e: any) { toast({ title: "Couldn't claim", description: e.message, variant: "destructive" }); }
              finally { setBusy(false); }
            }}><UserCheck width={14} height={14} strokeWidth={1.75} />Claim</Button>
          ) : (
            <Button variant="outline" size="sm" disabled={busy} title="Release your claim so a teammate can take it"
              onClick={async () => {
                setBusy(true);
                try { const u = await adminApi.releaseSupportCase(caseId!); setData((d) => d ? { ...d, case: u } : d); }
                catch (e: any) { toast({ title: "Couldn't release", description: e.message, variant: "destructive" }); }
                finally { setBusy(false); }
              }}><UserCheck width={14} height={14} strokeWidth={1.75} />Release</Button>
          )}
          {/* Claim moves open -> in_progress automatically, so there's no
              'Mark In progress' button — claimed cases only need Resolve. */}
          {!c.assigned_admin_id ? (
            <Button variant="outline" size="sm" disabled title="Claim this case first" className="opacity-45">
              <Check width={14} height={14} strokeWidth={1.75} />Mark Resolved
            </Button>
          ) : resolved ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setStatus("open")}><RotateCcw width={14} height={14} strokeWidth={1.75} />Reopen</Button>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => setStatus("resolved")}><Check width={14} height={14} strokeWidth={1.75} />Mark Resolved</Button>
          )}
        </div>
      </div>

      <MessageThread
        messages={threadMessages}
        value={draft}
        onChange={setDraft}
        onSend={send}
        placeholder="Reply to the clinic…"
        hint="Replies are visible to the clinic in their portal."
        locked={resolved ? {
          message: "This case is resolved. Reopen it to reply.",
          actionLabel: "Reopen",
          actionDisabled: busy,
          onAction: () => setStatus("open"),
        } : undefined}
      />
      {sending && <div className="sr-only">Sending…</div>}
    </PageContainer>
  );
}
