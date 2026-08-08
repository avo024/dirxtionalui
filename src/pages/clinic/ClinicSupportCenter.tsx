import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, BookOpen, GraduationCap, Plus, ChevronRight, Send,
  CircleCheck, ShieldCheck, Lock, LifeBuoy, MessageSquareHeart, Loader2, ExternalLink,
  ChevronsUpDown, Check, FileText,
} from "lucide-react";
import { supportApi, type SupportCaseSummary, type SupportCaseDetail } from "@/lib/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { formatDateShort } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { getRelativeTime, formatDateTime } from "@/lib/dateUtils";
import { SupportStatusBadge } from "@/components/SupportStatusBadge";
import { TutorialsMenu } from "@/components/tutorials/TutorialsMenu";
import { useTour } from "@/components/tutorials/useTour";
import "./wizard.css";
import "./dashboard.css";
import "./referral-detail.css";
import "./clinic-support.css";

type View = { name: "panel" } | { name: "tutorials" } | { name: "form" } | { name: "case"; id: string };

const CAT_OPTIONS = [
  { value: "support", label: "Support", Icon: LifeBuoy, sub: "Something isn't working or you need a hand." },
  { value: "feedback", label: "Feedback", Icon: MessageSquareHeart, sub: "An idea or thought to make Dirxctional better." },
];

function initials(name?: string) {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

export default function ClinicSupportCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseParam = searchParams.get("case");
  const [view, setView] = useState<View>(() => caseParam ? { name: "case", id: caseParam } : { name: "panel" });
  const { runTour } = useTour();

  // Keep the case view in the URL (?case=...) so browser back/forward — e.g.
  // case -> open referral -> back — restores exactly where you were.
  useEffect(() => {
    if (caseParam && (view.name !== "case" || view.id !== caseParam)) {
      setView({ name: "case", id: caseParam });
    } else if (!caseParam && view.name === "case") {
      setView({ name: "panel" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseParam]);

  const openCaseView = (id: string) => setSearchParams({ case: id });
  const closeCaseView = () => setSearchParams({});

  if (view.name === "tutorials") {
    return (
      <div className="cs-case rw-fade">
        <div className="cs-case-head">
          <button className="cs-back" onClick={() => setView({ name: "panel" })} title="Back to Help & Support"><ArrowLeft size={17} /></button>
          <div className="cs-case-head-main">
            <div className="cs-case-titlerow"><h1 className="cs-case-subj">Tutorials</h1></div>
            <div className="cs-case-meta"><span>Replay any interactive walkthrough anytime.</span></div>
          </div>
        </div>
        <div className="cs-thread-card" style={{ padding: 10 }}>
          <TutorialsMenu onRun={(key) => { setView({ name: "panel" }); window.setTimeout(() => runTour(key), 80); }} />
        </div>
      </div>
    );
  }
  if (view.name === "form") {
    return <NewRequest onCancel={() => setView({ name: "panel" })} onCreated={() => setView({ name: "panel" })} />;
  }
  if (view.name === "case") {
    return <CaseView caseId={view.id} onBack={closeCaseView} />;
  }
  return <Panel onOpen={openCaseView} onNew={() => setView({ name: "form" })} onTutorials={() => setView({ name: "tutorials" })} />;
}

const caseMonth = (c: SupportCaseSummary) => (c.updated_at || c.created_at || "").slice(0, 7);

function Panel({ onOpen, onNew, onTutorials }: { onOpen: (id: string) => void; onNew: () => void; onTutorials: () => void }) {
  const [allCases, setAllCases] = useState<SupportCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState("all");

  useEffect(() => {
    supportApi.getCases("all").then((r) => {
      const items: SupportCaseSummary[] = r.items || [];
      setAllCases(items);
      const cur = new Date();
      const curKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
      if (items.some((c) => caseMonth(c) === curKey)) setMonth(curKey);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const monthOpts = (() => {
    const cur = new Date();
    const curKey = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`;
    const keys = [...new Set(allCases.map(caseMonth).filter(Boolean))].sort().reverse();
    const opts = keys.map((k) => {
      const d = new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1);
      const label = d.toLocaleString("default", { month: "long", year: "numeric" });
      return { value: k, label: k === curKey ? `${label} · this month` : label };
    });
    return [...opts, { value: "all", label: "All time" }];
  })();

  const [statusView, setStatusView] = useState("active");  // active | resolved | all
  const cases = allCases
    .filter((c) => statusView === "all" ? true : statusView === "resolved" ? c.status === "resolved" : c.status !== "resolved")
    .filter((c) => month === "all" || caseMonth(c) === month);

  return (
    <div className="cs-page rw-fade">
      <div className="cs-header">
        <h1 className="cs-h1">Help &amp; Support</h1>
        <p className="cs-sub">Have a question, run into an issue, or want to share an idea? We're here to help — most messages get a reply the same day.</p>
      </div>

      <section className="cs-cards2" data-tour="support-cards">
        <a href="/manual.pdf" target="_blank" rel="noopener noreferrer" className="cs-guide">
          <div className="cs-guide-top">
            <div className="cs-guide-ic"><BookOpen size={22} /></div>
            <div className="cs-guide-meta">
              <p className="cs-guide-t">User Guide</p>
              <p className="cs-guide-s">Step-by-step articles on submitting referrals, tracking prior authorizations, and managing your clinic.</p>
            </div>
            <span className="cs-guide-arrow"><ExternalLink size={18} /></span>
          </div>
        </a>
        <button type="button" className="cs-guide" onClick={onTutorials}>
          <div className="cs-guide-top">
            <div className="cs-guide-ic"><GraduationCap size={22} /></div>
            <div className="cs-guide-meta">
              <p className="cs-guide-t">Tutorials</p>
              <p className="cs-guide-s">Replay any interactive walkthrough — submitting a referral, tracking a PA, and more.</p>
            </div>
            <span className="cs-guide-arrow"><ArrowRight size={18} /></span>
          </div>
        </button>
      </section>

      <section>
        <div className="cs-sec-head">
          <h2>My requests</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="rw-select" style={{ width: "auto", height: 36 }} value={statusView} onChange={(e) => setStatusView(e.target.value)}>
              <option value="active">Active requests</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
            {monthOpts.length > 2 && (
              <select className="rw-select" style={{ width: "auto", height: 36 }} value={month} onChange={(e) => setMonth(e.target.value)}>
                {monthOpts.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
            <button className="rw-btn primary" data-tour="support-new-request" onClick={onNew}><Plus size={15} />New request</button>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: "flex", justifyContent: "center" }}>
            <span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={22} /></span>
          </div>
        ) : cases.length > 0 ? (
          <div className="cs-reqs" data-tour="support-requests">
            {cases.map((c) => (
              <button key={c.id} className="cs-req" onClick={() => onOpen(c.id)}>
                <div className="cs-req-main">
                  <div className="cs-req-subj">
                    <span className="t">{c.subject}</span>
                    {c.last_author_type === "admin" && c.status !== "resolved" && (
                      <span className="cs-newreply"><span className="d" />New reply</span>
                    )}
                  </div>
                  <div className="cs-req-meta">
                    <span>{c.category === "delivery_issue" ? "Delivery issue" : c.category === "feedback" ? "Feedback" : "Support"}</span>
                    <span className="sep">·</span><span>#{c.short_id}</span>
                    {c.referral_id && (<><span className="sep">·</span><span style={{ color: "var(--color-teal-700)", fontWeight: 600 }}>Ref #{c.referral_short}</span></>)}
                    <span className="sep">·</span><span>Updated {getRelativeTime(c.last_message_at || c.updated_at)}</span>
                  </div>
                </div>
                <div className="cs-req-right">
                  <SupportStatusBadge status={c.status} />
                  <span className="cs-req-chev"><ChevronRight size={18} /></span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="cs-reqs" style={{ padding: "28px 18px", textAlign: "center" }}>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)", margin: 0 }}>
              {allCases.length === 0
                ? <>No requests yet. Click <b>New request</b> to ask us anything.</>
                : <>Nothing here — try the dropdown above to see {statusView === "active" ? "resolved" : "active"} requests.</>}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function NewRequest({ onCancel, onCreated }: { onCancel: () => void; onCreated: (id: string) => void }) {
  const [category, setCategory] = useState("support");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralId, setReferralId] = useState("");
  const sub = CAT_OPTIONS.find((o) => o.value === category)?.sub;

  useEffect(() => {
    // Optional referral link — lets the clinic say "this is about referral X".
    import("@/lib/api").then(({ clinicApi }) =>
      clinicApi.getReferrals()
        .then((r: any) => setReferrals(r.items || []))
        .catch(() => {})
    );
  }, []);

  const submit = async () => {
    const body = message.trim();
    if (!body) return;
    setSending(true);
    try {
      await supportApi.openCase({ category: category as "support" | "feedback", body, referral_id: referralId || null });
      toast({
        title: "Request sent — we'll reply shortly",
        description: referralId
          ? "It's linked to the referral and tracked below. We'll email you when we respond."
          : "You can track it below. We'll email you when we respond.",
      });
      onCreated("");
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e.message || "Failed to send request", variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <div className="cs-case rw-fade">
      <div className="cs-case-head">
        <button className="cs-back" onClick={onCancel} title="Back to Help & Support"><ArrowLeft size={17} /></button>
        <div className="cs-case-head-main">
          <div className="cs-case-titlerow"><h1 className="cs-case-subj">New request</h1></div>
          <div className="cs-case-meta"><span>Tell us what's going on — we'll get back to you, usually the same day.</span></div>
        </div>
      </div>

      <div className="cs-form-card" style={{ marginTop: 24 }}>
        <div>
          <p className="cs-form-label">What's this about?</p>
          <div className="cs-seg">
            {CAT_OPTIONS.map((o) => {
              const Icon = o.Icon;
              return (
                <button key={o.value} type="button" className={`cs-catbtn${category === o.value ? " on" : ""}`} onClick={() => setCategory(o.value)}>
                  <span className="ci"><Icon size={15} /></span>{o.label}
                </button>
              );
            })}
          </div>
          <p className="cs-catbtn-sub">{sub}</p>
        </div>

        <div>
          <p className="cs-form-label">About a specific referral? <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></p>
          <ReferralCombobox referrals={referrals} value={referralId} onChange={setReferralId} />
          {referralId && (
            <p className="cs-catbtn-sub">
              Your message will be saved to this referral's secure notes, so our team sees the full
              patient context — and this request will link straight to it.
            </p>
          )}
        </div>

        {referralId ? (
          <div className="cs-phi" style={{ borderColor: "var(--color-teal-100)", background: "var(--color-teal-50)" }}>
            <span className="cs-phi-ic" style={{ color: "var(--color-teal-700)" }}><ShieldCheck size={18} /></span>
            <div>
              <p className="cs-phi-t" style={{ color: "var(--color-teal-700)" }}>Patient details are OK here</p>
              <p className="cs-phi-s" style={{ color: "var(--color-teal-700)" }}>Because this request is linked to a referral, your message is saved to that referral's <b>secure notes</b> — include whatever details about this patient help us resolve it. Please keep other patients out of this message.</p>
            </div>
          </div>
        ) : (
          <div className="cs-phi">
            <span className="cs-phi-ic"><ShieldCheck size={18} /></span>
            <div>
              <p className="cs-phi-t">Please leave out patient details</p>
              <p className="cs-phi-s">To keep patient information safe, don't include names, dates of birth, insurance IDs, or diagnoses here. Asking about a specific patient? <b>Link their referral above</b> — then your message is saved to their secure record and details are fine.</p>
            </div>
          </div>
        )}

        <div>
          <p className="cs-form-label">Your message</p>
          <textarea className="rw-textarea" rows={6}
            placeholder="Tell us how we can help — please leave out any patient information."
            value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>

        <div className="cs-form-actions">
          <span className="left"><Lock size={13} />Sent securely to the Dirxctional team</span>
          <button className="rw-btn outline" onClick={onCancel}>Cancel</button>
          <button className="rw-btn primary" onClick={submit} disabled={!message.trim() || sending}>
            {sending ? <span className="rw-spin" style={{ display: "inline-flex" }}><Loader2 size={15} /></span> : <Send size={15} />}Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function CaseView({ caseId, onBack }: { caseId: string; onBack: () => void }) {
  const [data, setData] = useState<SupportCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supportApi.getCase(caseId)
      .then((r) => { if (!cancelled) setData(r); })
      .catch((e: any) => { if (!cancelled) toast({ title: "Error", description: e.message || "Failed to load request", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !data) return;
    setSending(true);
    try {
      const updated = await supportApi.replyCase(caseId, body);
      setData((d) => d ? {
        case: updated,
        messages: [...d.messages, { id: `tmp-${Date.now()}`, author_type: "clinic_user", author_name: "You", body, created_at: new Date().toISOString() }],
      } : d);
      setDraft("");
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e.message || "Failed to send reply", variant: "destructive" });
    } finally { setSending(false); }
  };

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 64 }}>
      <span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span>
    </div>;
  }
  if (!data) return <div style={{ padding: 40 }}>Request not found.</div>;

  const c = data.case;
  const resolved = c.status === "resolved";

  return (
    <div className="cs-case rw-fade">
      <div className="cs-case-head">
        <button className="cs-back" onClick={onBack} title="Back to Help & Support"><ArrowLeft size={17} /></button>
        <div className="cs-case-head-main">
          <div className="cs-case-titlerow">
            <h1 className="cs-case-subj">{c.subject}</h1>
            <SupportStatusBadge status={c.status} />
            <span className="cs-case-num">#{c.short_id}</span>
          </div>
          <div className="cs-case-meta">
            <span>{c.category === "delivery_issue" ? "Delivery issue" : c.category === "feedback" ? "Feedback" : "Support"}</span>
            <span className="sep">·</span><span>Opened {getRelativeTime(c.created_at)}</span>
            {c.referral_id && (
              <>
                <span className="sep">·</span>
                <Link to={`/clinic/referrals/${c.referral_id}`} style={{ color: "var(--color-teal-700)", fontWeight: 600 }}>
                  Referral #{c.referral_short} →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="cs-thread-card">
        <div className="rd-notes" style={{ maxWidth: "none" }}>
          {data.messages.map((m) => {
            const isAdmin = m.author_type === "admin";
            return (
              <div className={`rd-note ${isAdmin ? "admin" : "clinic"}`} key={m.id}>
                <div className="rd-note-ava">{initials(m.author_name)}</div>
                <div className="rd-note-body">
                  <div className="rd-note-card">
                    <div className="rd-note-head">
                      <span className="rd-note-author">{m.author_name}</span>
                      <span className="rd-note-when">{formatDateTime(m.created_at)}</span>
                    </div>
                    <div className="rd-note-text">{m.body}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {resolved && (
            <div className="cs-resolved-line">
              <span className="bar" /><span className="ri"><CircleCheck size={14} /></span>
              This request is resolved — reply below if you need to reopen it<span className="bar" />
            </div>
          )}

          <div className="rd-composer">
            <textarea className="rw-textarea" rows={2} placeholder="Write a reply…" value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
            <button className="rw-btn primary" onClick={send} disabled={!draft.trim() || sending}>
              {sending ? <span className="rw-spin" style={{ display: "inline-flex" }}><Loader2 size={15} /></span> : <Send size={15} />}Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


const REF_STATUS_LABEL: Record<string, string> = {
  uploaded: "Uploaded", processing: "Processing", ready_for_review: "In review",
  approved_to_send: "Approved", sent_to_pharmacy: "Sent", rejected: "Needs attention",
};

/** Searchable, recent-first referral picker for support requests. */
function ReferralCombobox({ referrals, value, onChange }:
  { referrals: any[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const sorted = [...referrals].sort((a, b) =>
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const selected = referrals.find((r) => r.id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" role="combobox" aria-expanded={open}
          className="rw-select"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", cursor: "pointer" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            {selected ? (
              <>
                <FileText size={14} style={{ color: "var(--color-teal-600)", flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected.patient_name || "Referral"} — #{(selected.id || "").slice(0, 8)}
                </span>
              </>
            ) : (
              <span style={{ color: "var(--text-muted)" }}>No — general question</span>
            )}
          </span>
          <ChevronsUpDown size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by patient name or ID..." />
          <CommandList>
            <CommandEmpty>No referral found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__ general question" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check size={14} className={value === "" ? "opacity-100" : "opacity-0"} style={{ flexShrink: 0 }} />
                <span style={{ marginLeft: 6, color: "var(--text-muted)" }}>No — general question</span>
              </CommandItem>
              {sorted.map((r) => (
                <CommandItem key={r.id}
                  value={`${r.patient_name || ""} ${(r.id || "").slice(0, 8)} ${r.drug_requested || ""}`}
                  onSelect={() => { onChange(r.id); setOpen(false); }}>
                  <Check size={14} className={value === r.id ? "opacity-100" : "opacity-0"} style={{ flexShrink: 0 }} />
                  <span style={{ marginLeft: 6, minWidth: 0, flex: 1 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {r.patient_name || "Referral"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>#{(r.id || "").slice(0, 8)}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-muted)" }}>
                      <span>{REF_STATUS_LABEL[r.status] || r.status}</span>
                      {r.created_at && <span>· {formatDateShort(r.created_at)}</span>}
                      {r.drug_requested && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>· {r.drug_requested}</span>}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
