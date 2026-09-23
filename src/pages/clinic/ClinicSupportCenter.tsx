import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BookOpen, GraduationCap, Plus, ExternalLink, Loader2, ChevronsUpDown, Check, FileText, ShieldCheck,
  LifeBuoy, MessageSquareHeart,
} from "lucide-react";
import { supportApi, type SupportCaseSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MessageThread } from "@/components/patterns/MessageThread";
import { formatDateShort, getRelativeTime } from "@/lib/dateUtils";
import { toast } from "@/hooks/use-toast";
import { SupportStatusBadge } from "@/components/SupportStatusBadge";
import { TutorialsMenu } from "@/components/tutorials/TutorialsMenu";
import { useTour } from "@/components/tutorials/useTour";
import { useSupportUnread } from "@/components/support/useSupportUnread";
import { cn } from "@/lib/utils";
import "./wizard.css";

const CAT_OPTIONS = [
  { value: "support", label: "Support", Icon: LifeBuoy, sub: "Something isn't working or you need a hand." },
  { value: "feedback", label: "Feedback", Icon: MessageSquareHeart, sub: "An idea or thought to make Dirxctional better." },
];

const REF_STATUS_LABEL: Record<string, string> = {
  uploaded: "Uploaded", processing: "Processing", ready_for_review: "In review",
  approved_to_send: "Approved", sent_to_pharmacy: "Sent", rejected: "Needs attention",
};

export default function ClinicSupportCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const caseParam = searchParams.get("case");
  const [cases, setCases] = useState<SupportCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [tutorialsOpen, setTutorialsOpen] = useState(false);
  const { runTour } = useTour();
  const { bump } = useSupportUnread();

  // Visiting Help & Support always clears the unread pill.
  useEffect(() => { bump(); }, [bump]);

  const loadCases = () => {
    setLoading(true);
    supportApi.getCases("all")
      .then((r) => {
        const items: SupportCaseSummary[] = r.items || [];
        setCases(items);
        // Land on the most recently updated request if none is selected.
        if (!caseParam && items.length > 0) {
          const sorted = [...items].sort((a, b) => new Date(b.last_message_at || b.updated_at).getTime() - new Date(a.last_message_at || a.updated_at).getTime());
          setSearchParams({ case: sorted[0].id }, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadCases(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCase = (id: string) => setSearchParams({ case: id });

  return (
    <div className="rw-page rw-fade">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-foreground">Help &amp; Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Have a question, run into an issue, or want to share an idea? We're here to help — most messages get a reply the same day.</p>
      </div>

      <section data-tour="support-cards" className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <a href="/manual.pdf" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 no-underline hover:bg-accent transition-colors">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><BookOpen width={20} height={20} strokeWidth={1.75} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">User Guide</p>
            <p className="text-xs text-muted-foreground mt-0.5">Step-by-step articles on submitting referrals, tracking prior authorizations, and managing your clinic.</p>
          </div>
          <ExternalLink width={16} height={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" />
        </a>
        <button type="button" className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left hover:bg-accent transition-colors" onClick={() => setTutorialsOpen(true)}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary"><GraduationCap width={20} height={20} strokeWidth={1.75} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Tutorials</p>
            <p className="text-xs text-muted-foreground mt-0.5">Replay any interactive walkthrough — submitting a referral, tracking a PA, and more.</p>
          </div>
        </button>
      </section>

      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">My requests</h2>
        <Button data-tour="support-new-request" onClick={() => setNewOpen(true)}><Plus width={16} height={16} strokeWidth={1.75} />New request</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 items-start">
        {/* Case list */}
        <div data-tour="support-requests" className="rounded-lg border border-border bg-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 width={22} height={22} className="animate-spin text-primary" /></div>
          ) : cases.length === 0 ? (
            <div className="p-5 text-center text-sm text-muted-foreground">No requests yet. Click <b>New request</b> to ask us anything.</div>
          ) : (
            <div className="flex flex-col">
              {cases.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCase(c.id)}
                  className={cn(
                    "flex flex-col items-start gap-1 border-b border-border last:border-0 px-4 py-3 text-left transition-colors",
                    caseParam === c.id ? "bg-muted" : "hover:bg-accent",
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-sm font-semibold text-foreground truncate flex-1">{c.subject}</span>
                    {c.last_author_type === "admin" && c.status !== "resolved" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="New reply" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <SupportStatusBadge status={c.status} />
                    <span>· Updated {getRelativeTime(c.last_message_at || c.updated_at)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected case */}
        <div>
          {caseParam ? (
            <CaseView caseId={caseParam} />
          ) : (
            <div className="flex items-center justify-center h-[240px] rounded-lg border border-border bg-card text-sm text-muted-foreground">
              Select a request to view the conversation.
            </div>
          )}
        </div>
      </div>

      <NewRequestDialog open={newOpen} onOpenChange={setNewOpen} onCreated={loadCases} />
      <Dialog open={tutorialsOpen} onOpenChange={setTutorialsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tutorials</DialogTitle></DialogHeader>
          <TutorialsMenu onRun={(key) => { setTutorialsOpen(false); window.setTimeout(() => runTour(key), 80); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaseView({ caseId }: { caseId: string }) {
  const [data, setData] = useState<{ case: any; messages: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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

  if (loading) return <div className="flex justify-center py-16"><Loader2 width={26} height={26} className="animate-spin text-primary" /></div>;
  if (!data) return <div className="p-8 text-sm text-muted-foreground">Request not found.</div>;

  const c = data.case;
  const resolved = c.status === "resolved";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="text-base font-semibold text-foreground">{c.subject}</h3>
        <SupportStatusBadge status={c.status} />
        <span className="text-xs text-muted-foreground font-mono">#{c.short_id}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>{c.category === "delivery_issue" ? "Delivery issue" : c.category === "feedback" ? "Feedback" : "Support"}</span>
        <span>· Opened {getRelativeTime(c.created_at)}</span>
        {c.referral_id && (
          <>
            <span>·</span>
            <Link to={`/clinic/referrals/${c.referral_id}`} className="text-primary font-medium hover:underline">Referral #{c.referral_short} →</Link>
          </>
        )}
      </div>

      <MessageThread
        ours="clinic"
        messages={([
          ...data.messages.map((m: any) => ({
            side: (m.author_type === "admin" ? "ours" : "clinic") as "ours" | "clinic",
            name: m.author_type === "admin" ? `${(m.author_name || "").split(" ")[0]} | Dirxctional Support Team` : m.author_name,
            time: formatDateShort(m.created_at),
            body: m.body,
          })),
          ...(resolved ? [{ system: "This request is resolved — reply below if you need to reopen it" }] : []),
        ])}
        value={draft}
        onChange={setDraft}
        onSend={send}
        placeholder="Write a reply…"
        hint="Sent to your Dirxctional team"
      />
      {sending && <span className="text-xs text-muted-foreground">Sending…</span>}
    </div>
  );
}

function NewRequestDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [category, setCategory] = useState("support");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralId, setReferralId] = useState("");
  const sub = CAT_OPTIONS.find((o) => o.value === category)?.sub;

  useEffect(() => {
    if (!open) return;
    import("@/lib/api").then(({ clinicApi }) =>
      clinicApi.getReferrals().then((r: any) => setReferrals(r.items || [])).catch(() => {}),
    );
  }, [open]);

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
      setMessage(""); setReferralId(""); setCategory("support");
      onOpenChange(false);
      onCreated();
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e.message || "Failed to send request", variant: "destructive" });
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>New request</DialogTitle></DialogHeader>

        <div className="flex flex-col gap-4">
          <div>
            <Label className="text-xs">What's this about?</Label>
            <div className="flex gap-2 mt-1.5">
              {CAT_OPTIONS.map((o) => {
                const Icon = o.Icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setCategory(o.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                      category === o.value ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <Icon width={15} height={15} strokeWidth={1.75} />{o.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>
          </div>

          <div>
            <Label className="text-xs">About a specific referral? <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <div className="mt-1.5">
              <ReferralCombobox referrals={referrals} value={referralId} onChange={setReferralId} />
            </div>
            {referralId && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Your message will be saved to this referral's secure notes, so our team sees the full patient context.
              </p>
            )}
          </div>

          <div className={cn("flex items-start gap-2.5 rounded-lg border p-3", referralId ? "border-primary/20 bg-primary/5" : "border-border bg-muted/40")}>
            <ShieldCheck width={16} height={16} strokeWidth={1.75} className={cn("shrink-0 mt-0.5", referralId ? "text-primary" : "text-muted-foreground")} />
            {referralId ? (
              <div>
                <p className="text-xs font-semibold text-primary">Patient details are OK here</p>
                <p className="text-xs text-muted-foreground mt-0.5">Because this request is linked to a referral, your message is saved to that referral's secure notes. Please keep other patients out of this message.</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-foreground">Please leave out patient details</p>
                <p className="text-xs text-muted-foreground mt-0.5">Don't include names, DOB, insurance IDs, or diagnoses here. Asking about a specific patient? Link their referral above.</p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Your message</Label>
            <Textarea className="mt-1.5" rows={5} placeholder="Tell us how we can help…" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!message.trim() || sending}>
            {sending ? <Loader2 width={15} height={15} className="animate-spin" /> : null}Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Searchable, recent-first referral picker for support requests. */
function ReferralCombobox({ referrals, value, onChange }: { referrals: any[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const sorted = [...referrals].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const selected = referrals.find((r) => r.id === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm"
        >
          <span className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <FileText width={14} height={14} strokeWidth={1.75} className="text-primary shrink-0" />
                <span className="truncate">{selected.patient_name || "Referral"} — #{(selected.id || "").slice(0, 8)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">No — general question</span>
            )}
          </span>
          <ChevronsUpDown width={14} height={14} strokeWidth={1.75} className="opacity-50 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by patient name or ID…" />
          <CommandList>
            <CommandEmpty>No referral found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__ general question" onSelect={() => { onChange(""); setOpen(false); }}>
                <Check width={14} height={14} className={value === "" ? "opacity-100" : "opacity-0"} />
                <span className="ml-1.5 text-muted-foreground">No — general question</span>
              </CommandItem>
              {sorted.map((r) => (
                <CommandItem
                  key={r.id}
                  value={`${r.patient_name || ""} ${(r.id || "").slice(0, 8)} ${r.drug_requested || ""}`}
                  onSelect={() => { onChange(r.id); setOpen(false); }}
                >
                  <Check width={14} height={14} className={value === r.id ? "opacity-100" : "opacity-0"} />
                  <span className="ml-1.5 min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-semibold truncate">{r.patient_name || "Referral"}</span>
                      <span className="text-[11px] text-muted-foreground shrink-0">#{(r.id || "").slice(0, 8)}</span>
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{REF_STATUS_LABEL[r.status] || r.status}</span>
                      {r.created_at && <span>· {formatDateShort(r.created_at)}</span>}
                      {r.drug_requested && <span className="truncate">· {r.drug_requested}</span>}
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
