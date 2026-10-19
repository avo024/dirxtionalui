import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, subDays, subMonths } from "date-fns";
import { PageContainer } from "@/components/patterns/PageContainer";
import { Combobox } from "@/components/ui/combobox";

const MONTH_KEY = "admin.insights.month";
const CURRENT = "current";
const ALL = "all";

const monthValue = (d: Date) => format(d, "yyyy-MM");
/** "2026-10" -> "October 2026" (local time; no UTC shift). */
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return format(new Date(y, (m || 1) - 1, 1), "MMMM yyyy");
};

/** This month, the previous 11, and All time. */
function monthOptions() {
  const now = new Date();
  const opts = [{ value: CURRENT, label: "This month" }];
  for (let i = 1; i <= 11; i++) {
    const d = subMonths(now, i);
    opts.push({ value: monthValue(d), label: monthLabel(monthValue(d)) });
  }
  opts.push({ value: ALL, label: "All time" });
  return opts;
}

function readStoredMonth(valid: string[]): string {
  try {
    const v = localStorage.getItem(MONTH_KEY);
    if (v && valid.includes(v)) return v;
  } catch { /* localStorage unavailable — default */ }
  return CURRENT;
}

/**
 * Insights — the analytical view, separated from the operational dashboard.
 * The daily dashboard answers "what do I work on next"; this page answers
 * "how is the pipeline doing". When per-seat roles land, THIS is the page
 * that gets gated — workers never needed clinic volumes and trend lines.
 */
export default function AdminInsights() {
  // allReferrals feeds the widgets that carry their own range (today tiles,
  // last 30 days, the 30-day line); referrals is the month-scoped set.
  const [allReferrals, setAllReferrals] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const options = useMemo(monthOptions, []);
  const [choice, setChoice] = useState<string>(() => readStoredMonth(options.map((o) => o.value)));
  const resolvedMonth = choice === CURRENT ? monthValue(new Date()) : choice; // YYYY-MM | "all"

  const onChoice = (v: string) => {
    setChoice(v);
    try { localStorage.setItem(MONTH_KEY, v); } catch { /* ignore */ }
  };

  useEffect(() => {
    adminApi.getReferrals()
      .then((response) => setAllReferrals(response.items || []))
      .catch((err: any) => toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [location.key]);

  useEffect(() => {
    let live = true;
    setCounts(null);
    adminApi.getReferralCounts(resolvedMonth).then((c) => { if (live) setCounts(c); }).catch(() => {});
    return () => { live = false; };
  }, [resolvedMonth, location.key]);

  // The selected month's referrals, by created_at — the same window the
  // counts endpoint uses (the list endpoint's ?month= is last-activity, not
  // creation, so it is not used here). "All time" is the full list.
  const referrals = useMemo(
    () => (resolvedMonth === ALL ? allReferrals : allReferrals.filter((r) => r.created_at && monthValue(new Date(r.created_at)) === resolvedMonth)),
    [allReferrals, resolvedMonth],
  );
  const period = resolvedMonth === ALL ? "All time" : monthLabel(resolvedMonth);

  const stats = useMemo(() => {
    const now = Date.now();
    const days30 = allReferrals.filter((r) => r.created_at && now - new Date(r.created_at).getTime() < 30 * 86400000);
    const decided = referrals.filter((r) => ["approved_to_send", "sent_to_pharmacy", "rejected"].includes(r.status));
    const approvedish = decided.filter((r) => r.status !== "rejected").length;
    const paRequired = referrals.filter((r) => r.pa_required && !r.is_bridge_program);
    const paCount = (s: string) => paRequired.filter((r) => r.pa_status === s).length;
    const byClinic: Record<string, number> = {};
    referrals.forEach((r) => { const c = r.clinic_name || "—"; byClinic[c] = (byClinic[c] || 0) + 1; });
    // Today counts — moved here from the retired operational dashboard
    // (phase 6b); same referrals call, filtered by updated_at === today.
    const today = new Date().toDateString();
    const countToday = (status: string) => allReferrals.filter((r) => r.status === status && r.updated_at && new Date(r.updated_at).toDateString() === today).length;
    return {
      approvedToday: countToday("approved_to_send"),
      sentToday: countToday("sent_to_pharmacy"),
      rejectedToday: countToday("rejected"),
      total: referrals.length,
      last30: days30.length,
      avgPerDay: (days30.length / 30).toFixed(1),
      approvalRate: decided.length ? Math.round((100 * approvedish) / decided.length) : null,
      sent: referrals.filter((r) => r.status === "sent_to_pharmacy").length,
      paRequired: paRequired.length,
      paApproved: paCount("approved"),
      paDenied: paCount("denied"),
      paInAppeal: paCount("appeal"),
      bridge: referrals.filter((r) => r.is_bridge_program).length,
      clinics: Object.entries(byClinic).sort((a, b) => b[1] - a[1]).slice(0, 6),
    };
  }, [referrals, allReferrals]);

  const pieData = useMemo(() => [
    { name: "Needs Review", value: referrals.filter((r) => r.status === "ready_for_review").length, color: "#9A4A1E" },
    { name: "Approved", value: referrals.filter((r) => r.status === "approved_to_send").length, color: "#15803D" },
    { name: "Sent", value: referrals.filter((r) => r.status === "sent_to_pharmacy").length, color: "#0F766E" },
    { name: "Rejected", value: referrals.filter((r) => r.status === "rejected").length, color: "#B91C1C" },
    { name: "Uploaded", value: referrals.filter((r) => r.status === "uploaded").length, color: "#57534E" },
    { name: "Closed", value: referrals.filter((r) => r.status === "closed").length, color: "#A8A29E" },
  ].filter((d) => d.value > 0), [referrals]);

  const lineData = useMemo(() => {
    const days: { date: string; referrals: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = subDays(new Date(), i);
      days.push({ date: format(day, "MMM d"), referrals: allReferrals.filter((r) => r.created_at && new Date(r.created_at).toDateString() === day.toDateString()).length });
    }
    return days;
  }, [allReferrals]);

  if (loading) {
    return (
      <PageContainer fade={false} className="flex justify-center py-16">
        <Icon name="spinner" size={24} className="animate-spin text-primary" />
      </PageContainer>
    );
  }

  // Resolved month + count come from the counts call; fall back to local figures.
  const shownMonth = counts?.month && counts.month !== ALL ? monthLabel(counts.month) : counts?.month === ALL ? "All time" : period;
  const shownTotal = typeof counts?.all === "number" ? counts.all : stats.total;
  const headerLine = `${shownMonth} · ${shownTotal} referral${shownTotal === 1 ? "" : "s"}`;

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-card border border-border rounded-lg p-3.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );

  return (
    <PageContainer>
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
          <p className="text-sm font-medium text-foreground mt-1" data-testid="insights-period">{headerLine}</p>
          <p className="text-sm text-muted-foreground">Pipeline analytics — volumes, ratios, and trends across all clinics</p>
        </div>
        <Combobox
          size="sm"
          className="w-48"
          searchable={false}
          align="end"
          options={options}
          value={choice}
          onValueChange={onChoice}
        />
      </div>

      {/* Today, at a glance — moved from the retired operational dashboard */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
          <span className="text-xs text-muted-foreground">Approved today</span>
          <div className="text-lg font-semibold text-foreground">{stats.approvedToday}</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
          <span className="text-xs text-muted-foreground">Sent today</span>
          <div className="text-lg font-semibold text-foreground">{stats.sentToday}</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2.5">
          <span className="text-xs text-muted-foreground">Rejected today</span>
          <div className="text-lg font-semibold text-foreground">{stats.rejectedToday}</div>
        </div>
      </div>

      {/* Headline tiles */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Tile label="Total referrals" value={stats.total} sub={period.toLowerCase()} />
        <Tile label="Last 30 days" value={stats.last30} sub={`~${stats.avgPerDay}/day`} />
        <Tile label="Sent to pharmacy" value={stats.sent} sub={period.toLowerCase()} />
        <Tile label="Approval rate" value={stats.approvalRate === null ? "—" : `${stats.approvalRate}%`} sub="of decided referrals" />
        <Tile label="Bridge program" value={stats.bridge} sub="manufacturer-funded" />
      </div>

      {/* PA mix */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Tile label="PA required" value={stats.paRequired} sub="excl. bridge" />
        <Tile label="PA approved" value={stats.paApproved} />
        <Tile label="PA denied" value={stats.paDenied} />
        <Tile label="In appeal" value={stats.paInAppeal} />
      </div>

      {/* Charts (moved off the operational dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg">
          <div className="px-[var(--density-card-pad)] pt-[var(--density-card-pad)]">
            <h3 className="text-sm font-semibold text-foreground">Referrals by Status</h3>
            <p className="text-xs text-muted-foreground">{period}</p>
          </div>
          <div className="p-[var(--density-card-pad)]">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 h-[250px] text-sm text-muted-foreground">
                <Icon name="referrals" size={24} />No referrals yet
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg">
          <div className="px-[var(--density-card-pad)] pt-[var(--density-card-pad)]">
            <h3 className="text-sm font-semibold text-foreground">Referrals Over Time</h3>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <div className="p-[var(--density-card-pad)]">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#78716C" interval={4} />
                <YAxis tick={{ fontSize: 12 }} stroke="#78716C" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="referrals" stroke="#14B8A6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Volume by clinic */}
      <div className="bg-card border border-border rounded-lg mt-4">
        <div className="px-[var(--density-card-pad)] pt-[var(--density-card-pad)]">
          <h3 className="text-sm font-semibold text-foreground">Volume by Clinic</h3>
          <p className="text-xs text-muted-foreground">{period} referral count</p>
        </div>
        <div className="px-[var(--density-card-pad)] pb-[var(--density-card-pad)] pt-1.5">
          {stats.clinics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinics yet.</p>
          ) : stats.clinics.map(([name, count]) => (
            <div key={name} className="flex items-center gap-2.5 py-1.5">
              <Icon name="chart" size={14} className="text-primary shrink-0" />
              <span className="text-sm text-foreground flex-1">{name}</span>
              <span className="text-sm font-semibold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
