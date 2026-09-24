import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  FileText, Clock, CheckCircle, XCircle, Send, Loader2, CalendarDays,
  ArrowRight, ClipboardCheck, AlertTriangle, Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { NotificationBell } from "@/components/NotificationBell";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateShort, getFormattedDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

type Tone = "warning" | "primary" | "destructive";
const TONE_STYLE: Record<Tone, string> = {
  warning: "bg-warning/12 text-warning",
  primary: "bg-primary/10 text-primary",
  destructive: "bg-destructive/10 text-destructive",
};
function StatIcon({ tone, icon: Icon, size = 18 }: { tone: Tone; icon: any; size?: number }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center rounded-md", TONE_STYLE[tone])} style={{ width: size + 16, height: size + 16 }}>
      <Icon width={size} height={size} strokeWidth={1.75} />
    </span>
  );
}
const ExpiredTag = () => (
  <span className="inline-flex items-center gap-1 rounded-full bg-warning/16 text-[#92610B] px-1.5 py-0.5 text-[10px] font-semibold">
    <AlertTriangle width={10} height={10} strokeWidth={1.75} />Ins. Expired
  </span>
);

function ActionCard({ tone, icon, value, label, sub, to, onClick }: { tone: Tone; icon: any; value: number | string; label: string; sub: string; to: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card p-4 no-underline transition-colors hover:bg-muted/40",
        tone === "destructive" ? "border-destructive/30" : tone === "warning" ? "border-warning/30" : "border-border",
      )}
    >
      <StatIcon tone={tone} icon={icon} size={20} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-foreground">{value}</span>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <ArrowRight width={16} height={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" />
    </Link>
  );
}

export default function AdminDashboard() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [paCounts, setPaCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getReferrals();
        setReferrals((response.items || []).map((r: any) => ({ ...r, drug: r.drug_requested, dob: r.patient_dob })));
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" });
      } finally { setLoading(false); }
    };
    const fetchCounts = () =>
      adminApi.getReferralCounts().then(setPaCounts).catch(() => { /* widget just shows zeros */ });
    fetchReferrals();
    fetchCounts();
    const handleFocus = () => { fetchReferrals(); fetchCounts(); };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [location.key]);

  if (loading) {
    return (
      <div className="rw-page flex justify-center py-16">
        <Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" />
      </div>
    );
  }

  // Filed/in-appeal PAs live in their own tabs, and handed-off/final appeals
  // are out of our hands — neither is "needs review" anymore.
  const needsReview = referrals.filter((r) =>
    r.status === "ready_for_review"
    && !["submitted", "appeal"].includes(r.pa_status)
    && !(r.pa_status === "denied" && ["level2", "final"].includes(r.appeal_outcome)));
  const hasUnreadClinicNote = (r: any): boolean => {
    const noteTs = r.latest_clinic_note_at;
    if (!noteTs) return false;
    const lastViewed = localStorage.getItem(`notes_last_viewed_${r.id}`);
    return !lastViewed || new Date(noteTs) > new Date(lastViewed);
  };
  const needsAttention = (() => {
    const seen = new Set<string>(); const out: any[] = [];
    for (const r of referrals) if (hasUnreadClinicNote(r) && !seen.has(r.id)) { seen.add(r.id); out.push(r); }
    const review = needsReview.filter((r) => !seen.has(r.id)).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return [...out, ...review];
  })();

  const today = new Date().toDateString();
  const countToday = (status: string) => referrals.filter((r) => r.status === status && r.updated_at && new Date(r.updated_at).toDateString() === today).length;
  // Cards link straight into the v2 queue's tabs/filters (AdminReferralsList
  // reads ?tab= and ?filter= deep links) — the dashboard is retired in 6b.
  const STAT: Record<string, any> = {
    total: { label: "Total Referrals", value: referrals.length, icon: FileText, tone: "primary", sub: "All clinics", link: "/admin/referrals?tab=all" },
    needs_review: { label: "Needs Review", value: needsReview.length, icon: Clock, tone: "warning", sub: "Awaiting review", link: "/admin/referrals?filter=needs_review" },
    rejected: { label: "Rejected Today", value: countToday("rejected"), icon: XCircle, tone: "destructive", sub: "Today", link: "/admin/referrals?filter=rejected" },
    approved: { label: "Approved Today", value: countToday("approved_to_send"), icon: CheckCircle, tone: "primary", sub: "Today", link: "/admin/referrals?filter=approved_to_send" },
    sent: { label: "Sent Today", value: countToday("sent_to_pharmacy"), icon: Send, tone: "primary", sub: "Today", link: "/admin/referrals?filter=sent_to_pharmacy" },
  };
  const actionStats = [STAT.needs_review, STAT.rejected];
  // Inventory/analytics tiles live on Insights — the dashboard stays operational.
  const mutedStats = [STAT.approved, STAT.sent];

  return (
    <div className="rw-page rw-fade">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold serif text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of all referral activity</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell referrals={referrals} noteField="latest_clinic_note_at" actionStatus={null} linkBase="/admin/referrals" />
          <div className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays width={15} height={15} strokeWidth={1.75} /><span>{getFormattedDate()}</span></div>
        </div>
      </div>

      {/* PA checks due — the 72h follow-up discipline, front and center */}
      {((paCounts.pa_followup_due ?? 0) + (paCounts.appeal_followup_due ?? 0)) > 0 && (
        <ActionCard
          tone="destructive"
          icon={AlertTriangle}
          to="/admin/referrals?filter=pa_pending"
          value={(paCounts.pa_followup_due ?? 0) + (paCounts.appeal_followup_due ?? 0)}
          label="PA checks due"
          sub={`${paCounts.pa_followup_due ?? 0} PA${(paCounts.pa_followup_due ?? 0) === 1 ? "" : "s"} past the 72h follow-up${(paCounts.appeal_followup_due ?? 0) > 0 ? ` · ${paCounts.appeal_followup_due} appeal${paCounts.appeal_followup_due === 1 ? "" : "s"}` : ""} — check CoverMyMeds and record the decision`}
        />
      )}

      {/* Delivery issues — the pharmacy says it never arrived; highest urgency */}
      {(paCounts.delivery_issues ?? 0) > 0 && (
        <div className="mt-3.5">
          <ActionCard
            tone="destructive"
            icon={AlertTriangle}
            to="/admin/referrals?filter=delivery_issues"
            value={paCounts.delivery_issues}
            label={`Delivery issue${paCounts.delivery_issues === 1 ? "" : "s"}`}
            sub="The clinic reports the pharmacy never received it — check with the pharmacy, then reset for resend or resolve the case"
          />
        </div>
      )}

      {/* Task replies to review — the clinic answered; an admin needs to
          review the reply/upload and mark the task complete. */}
      {(paCounts.tasks_awaiting_review ?? 0) > 0 && (
        <div className="mt-3.5">
          <ActionCard
            tone="warning"
            icon={ClipboardCheck}
            to="/admin/referrals?filter=task_replies"
            value={paCounts.tasks_awaiting_review}
            label={`Task ${paCounts.tasks_awaiting_review === 1 ? "reply" : "replies"} to review`}
            sub="The clinic answered — review the reply or upload and mark the task complete"
            onClick={async (e) => {
              // Exactly one reply waiting → skip the list, open that referral.
              if (paCounts.tasks_awaiting_review === 1) {
                e.preventDefault();
                try {
                  const res = await adminApi.getReferrals({ view: "task_replies" });
                  const only = (res.items || [])[0];
                  if (only) { navigate(`/admin/referrals/${only.id}`); return; }
                } catch { /* fall through to the filtered list */ }
                navigate("/admin/referrals?filter=task_replies");
              }
            }}
          />
        </div>
      )}

      {/* Action-split stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mt-3.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actionStats.map((s) => (
            <ActionCard key={s.label} tone={s.tone} icon={s.icon} to={s.link} value={s.value} label={s.label} sub={s.sub} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {mutedStats.map((s) => (
            <Link key={s.label} to={s.link} className="rounded-lg border border-border bg-card p-3.5 no-underline hover:bg-muted/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                <StatIcon tone={s.tone} icon={s.icon} size={15} />
              </div>
              <span className="text-xl font-semibold text-foreground">{s.value}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Needs Attention */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground flex items-center gap-2">
            Needs Attention {needsAttention.length > 0 && <span className="text-xs font-medium text-muted-foreground">{needsAttention.length}</span>}
          </h2>
          <Link to="/admin/referrals" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        {needsAttention.length > 0 ? (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Clinic</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>PA Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needsAttention.slice(0, 25).map((r: any) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/referrals/${r.id}`)}>
                    <TableCell><span className="font-mono text-xs text-muted-foreground">{(r.id || "").toUpperCase()}</span></TableCell>
                    <TableCell><span className="font-semibold text-foreground">{r.patient_name}</span></TableCell>
                    <TableCell className="text-muted-foreground">{r.clinic_name || "—"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        {r.drug || r.drug_requested || "—"}
                        {r.is_bridge_program && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-teal-600/10 text-teal-700 px-1.5 py-0.5 text-[10px] font-semibold">
                            <Zap width={10} height={10} strokeWidth={1.75} />Bridge
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell><ClinicPABadge status={r.pa_status} appealOutcome={r.appeal_outcome} /></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={r.status} />
                        {r.insurance_expired && <ExpiredTag />}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.created_at ? formatDateShort(r.created_at) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><CheckCircle width={26} height={26} strokeWidth={1.75} /></span>
            <h3 className="text-base font-semibold text-foreground">All caught up</h3>
            <p className="text-sm text-muted-foreground">No referrals need attention right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
