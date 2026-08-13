import { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import {
  FileText, Clock, CheckCircle, XCircle, Send, Loader2, CalendarDays, RefreshCw,
  ArrowRight, ClipboardCheck, AlertTriangle, Zap, Inbox,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { NotificationBell } from "@/components/NotificationBell";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatDateShort, getFormattedDate } from "@/lib/dateUtils";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, subDays } from "date-fns";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "./admin-dashboard.css";

type Tone = "warning" | "primary" | "destructive";
const TONE_STYLE: Record<Tone, { fg: string; bg: string }> = {
  warning: { fg: "var(--color-warning)", bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)" },
  primary: { fg: "var(--color-navy)", bg: "color-mix(in srgb, var(--color-navy) 10%, transparent)" },
  destructive: { fg: "var(--color-error)", bg: "color-mix(in srgb, var(--color-error) 10%, transparent)" },
};
function StatIcon({ tone, icon: Icon, size = 18 }: { tone: Tone; icon: any; size?: number }) {
  const t = TONE_STYLE[tone];
  return <span className="dh-stat-ic" style={{ background: t.bg, color: t.fg }}><Icon size={size} /></span>;
}
const ExpiredTag = () => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999, background: "color-mix(in srgb, var(--color-warning) 16%, transparent)", color: "#92610B" }}><AlertTriangle size={10} />Ins. Expired</span>
);

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
    return <div className="rw-page" style={{ display: "flex", justifyContent: "center", padding: 64 }}><span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span></div>;
  }

  // Filed/in-appeal PAs live in their own tabs — not "needs review" anymore.
  const needsReview = referrals.filter((r) => r.status === "ready_for_review" && !["submitted", "appeal"].includes(r.pa_status));
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
  const STAT: Record<string, any> = {
    total: { label: "Total Referrals", value: referrals.length, icon: FileText, tone: "primary", sub: "All clinics", link: "/admin/referrals?filter=all" },
    needs_review: { label: "Needs Review", value: needsReview.length, icon: Clock, tone: "warning", sub: "Awaiting review", link: "/admin/referrals?filter=needs_review" },
    rejected: { label: "Rejected Today", value: countToday("rejected"), icon: XCircle, tone: "destructive", sub: "Today", link: "/admin/referrals?filter=rejected" },
    approved: { label: "Approved Today", value: countToday("approved_to_send"), icon: CheckCircle, tone: "primary", sub: "Today", link: "/admin/referrals?filter=approved_to_send" },
    sent: { label: "Sent Today", value: countToday("sent_to_pharmacy"), icon: Send, tone: "primary", sub: "Today", link: "/admin/referrals?filter=sent_to_pharmacy" },
  };
  const actionStats = [STAT.needs_review, STAT.rejected];
  const mutedStats = [STAT.total, STAT.approved, STAT.sent];

  const pieData = [
    { name: "Needs Review", value: referrals.filter((r) => r.status === "ready_for_review").length, color: "#9A4A1E" },
    { name: "Approved", value: referrals.filter((r) => r.status === "approved_to_send").length, color: "#15803D" },
    { name: "Sent", value: referrals.filter((r) => r.status === "sent_to_pharmacy").length, color: "#0F766E" },
    { name: "Rejected", value: referrals.filter((r) => r.status === "rejected").length, color: "#B91C1C" },
    { name: "Uploaded", value: referrals.filter((r) => r.status === "uploaded").length, color: "#57534E" },
  ].filter((d) => d.value > 0);

  const lineData = (() => {
    const days: { date: string; referrals: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      days.push({ date: format(day, "MMM d"), referrals: referrals.filter((r) => r.created_at && new Date(r.created_at).toDateString() === day.toDateString()).length });
    }
    return days;
  })();
  const hasData = referrals.length > 0;

  return (
    <div className="rw-page dh-page rw-fade">
      {/* Header */}
      <div className="dh-header">
        <div className="dh-greet">
          <h1 className="dh-h1 serif">Admin Dashboard</h1>
          <p className="dh-sub">Overview of all referral activity</p>
        </div>
        <div className="dh-header-right">
          <NotificationBell referrals={referrals} noteField="latest_clinic_note_at" actionStatus={null} linkBase="/admin/referrals" />
          <div className="dh-date"><CalendarDays size={15} /><span>{getFormattedDate()}</span></div>
        </div>
      </div>

      {/* PA checks due — the 72h follow-up discipline, front and center */}
      {((paCounts.pa_followup_due ?? 0) + (paCounts.appeal_followup_due ?? 0)) > 0 && (
        <Link to="/admin/referrals?filter=pa_pending" className="dh-action-card destructive" style={{ marginBottom: 14 }}>
          <StatIcon tone="destructive" icon={AlertTriangle} size={20} />
          <div className="dh-action-meta">
            <div className="dh-action-head">
              <span className="dh-action-val num">{(paCounts.pa_followup_due ?? 0) + (paCounts.appeal_followup_due ?? 0)}</span>
              <span className="dh-action-lbl">PA checks due</span>
            </div>
            <span className="dh-action-sub">
              {paCounts.pa_followup_due ?? 0} PA{(paCounts.pa_followup_due ?? 0) === 1 ? "" : "s"} past the 72h follow-up
              {(paCounts.appeal_followup_due ?? 0) > 0 && ` · ${paCounts.appeal_followup_due} appeal${paCounts.appeal_followup_due === 1 ? "" : "s"}`} — check CoverMyMeds and record the decision
            </span>
          </div>
          <span className="dh-action-arrow"><ArrowRight size={16} /></span>
        </Link>
      )}

      {/* Task replies to review — the clinic answered; an admin needs to
          review the reply/upload and mark the task complete. */}
      {(paCounts.tasks_awaiting_review ?? 0) > 0 && (
        <Link to="/admin/referrals?filter=all" className="dh-action-card warning" style={{ marginBottom: 14 }}>
          <StatIcon tone="warning" icon={ClipboardCheck} size={20} />
          <div className="dh-action-meta">
            <div className="dh-action-head">
              <span className="dh-action-val num">{paCounts.tasks_awaiting_review}</span>
              <span className="dh-action-lbl">Task {paCounts.tasks_awaiting_review === 1 ? "reply" : "replies"} to review</span>
            </div>
            <span className="dh-action-sub">
              The clinic answered — open the referral (task tag on the row), review the reply or upload, and mark it complete
            </span>
          </div>
          <span className="dh-action-arrow"><ArrowRight size={16} /></span>
        </Link>
      )}

      {/* Action-split stats */}
      <div className="ad-split">
        <div className="ad-split-action">
          {actionStats.map((s) => (
            <Link key={s.label} to={s.link} className={`dh-action-card ${s.tone === "warning" ? "warning" : "destructive"}`}>
              <StatIcon tone={s.tone} icon={s.icon} size={20} />
              <div className="dh-action-meta">
                <div className="dh-action-head"><span className="dh-action-val num">{s.value}</span><span className="dh-action-lbl">{s.label}</span></div>
                <span className="dh-action-sub">{s.sub}</span>
              </div>
              <span className="dh-action-arrow"><ArrowRight size={16} /></span>
            </Link>
          ))}
        </div>
        <div className="ad-split-muted">
          {mutedStats.map((s) => (
            <Link key={s.label} to={s.link} className="dh-muted-card">
              <div className="dh-muted-top"><span className="dh-muted-lbl">{s.label}</span><StatIcon tone={s.tone} icon={s.icon} size={15} /></div>
              <span className="dh-muted-val num">{s.value}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="ad-charts-2up">
        <div className="ad-chart-card">
          <div className="ad-chart-head"><div><h3 className="ad-chart-title">Referrals by Status</h3><p className="ad-chart-sub">All-time distribution</p></div></div>
          <div className="ad-chart-body">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="ad-chart-na"><Inbox size={26} />No referrals yet</div>}
          </div>
        </div>

        <div className="ad-chart-card">
          <div className="ad-chart-head"><div><h3 className="ad-chart-title">Referrals Over Time</h3><p className="ad-chart-sub">Last 7 days</p></div></div>
          <div className="ad-chart-body">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#78716C" />
                <YAxis tick={{ fontSize: 12 }} stroke="#78716C" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="referrals" stroke="#14B8A6" strokeWidth={2} dot={{ fill: "#14B8A6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      <div>
        <div className="dh-sec-head">
          <h2>Needs Attention {needsAttention.length > 0 && <span className="ad-sec-count">{needsAttention.length}</span>}</h2>
          <Link to="/admin/referrals" className="dh-viewall">View all →</Link>
        </div>
        {needsAttention.length > 0 ? (
          <div className="dh-table-wrap">
            <table className="dh-table">
              <thead><tr><th>ID</th><th>Patient</th><th>Clinic</th><th>Drug</th><th>PA Status</th><th>Status</th><th>Created</th><th className="r">Actions</th></tr></thead>
              <tbody>
                {needsAttention.slice(0, 25).map((r: any) => (
                  <tr key={r.id} onClick={() => navigate(`/admin/referrals/${r.id}`)}>
                    <td><span className="dh-id">{(r.id || "").toUpperCase()}</span></td>
                    <td><span className="dh-pt"><span className="dh-pt-nm">{r.patient_name}</span></span></td>
                    <td className="dh-muted-cell">{r.clinic_name || "—"}</td>
                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>{r.drug || r.drug_requested || "—"}{r.is_bridge_program && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 9999, background: "var(--color-teal-50)", color: "var(--color-teal-700)" }}><Zap size={10} />Bridge</span>}</span></td>
                    <td><ClinicPABadge status={r.pa_status} /></td>
                    <td><span style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}><StatusBadge status={r.status} />{r.insurance_expired && <ExpiredTag />}</span></td>
                    <td className="dh-muted-cell">{r.created_at ? formatDateShort(r.created_at) : "—"}</td>
                    <td className="r" onClick={(e) => e.stopPropagation()}><button className="rw-btn primary sm" onClick={() => navigate(`/admin/referrals/${r.id}`)}><ClipboardCheck size={14} />Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dh-empty"><div className="dh-empty-ic"><CheckCircle size={26} /></div><h3>All caught up</h3><p>No referrals need attention right now.</p></div>
        )}
      </div>
    </div>
  );
}
