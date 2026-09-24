import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Inbox, BarChart3 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, subDays } from "date-fns";

/**
 * Insights — the analytical view, separated from the operational dashboard.
 * The daily dashboard answers "what do I work on next"; this page answers
 * "how is the pipeline doing". When per-seat roles land, THIS is the page
 * that gets gated — workers never needed clinic volumes and trend lines.
 */
export default function AdminInsights() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    adminApi.getReferrals()
      .then((response) => setReferrals(response.items || []))
      .catch((err: any) => toast({ title: "Error", description: err.message || "Failed to load referrals", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [location.key]);

  const stats = useMemo(() => {
    const now = Date.now();
    const days30 = referrals.filter((r) => r.created_at && now - new Date(r.created_at).getTime() < 30 * 86400000);
    const decided = referrals.filter((r) => ["approved_to_send", "sent_to_pharmacy", "rejected"].includes(r.status));
    const approvedish = decided.filter((r) => r.status !== "rejected").length;
    const paRequired = referrals.filter((r) => r.pa_required && !r.is_bridge_program);
    const paCount = (s: string) => paRequired.filter((r) => r.pa_status === s).length;
    const byClinic: Record<string, number> = {};
    referrals.forEach((r) => { const c = r.clinic_name || "—"; byClinic[c] = (byClinic[c] || 0) + 1; });
    return {
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
  }, [referrals]);

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
      days.push({ date: format(day, "MMM d"), referrals: referrals.filter((r) => r.created_at && new Date(r.created_at).toDateString() === day.toDateString()).length });
    }
    return days;
  }, [referrals]);

  if (loading) {
    return (
      <div className="rw-page flex justify-center py-16">
        <Loader2 width={26} height={26} strokeWidth={1.75} className="animate-spin text-primary" />
      </div>
    );
  }

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="bg-card border border-border rounded-lg p-3.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="text-2xl font-semibold text-foreground mt-1">{value}</div>
      {sub && <span className="text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );

  return (
    <div className="rw-page rw-fade">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold serif text-foreground">Insights</h1>
        <p className="text-sm text-muted-foreground mt-1">Pipeline analytics — volumes, ratios, and trends across all clinics</p>
      </div>

      {/* Headline tiles */}
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <Tile label="Total referrals" value={stats.total} sub="all time" />
        <Tile label="Last 30 days" value={stats.last30} sub={`~${stats.avgPerDay}/day`} />
        <Tile label="Sent to pharmacy" value={stats.sent} sub="all time" />
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
            <p className="text-xs text-muted-foreground">All-time distribution</p>
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
                <Inbox width={26} height={26} strokeWidth={1.75} />No referrals yet
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
          <p className="text-xs text-muted-foreground">All-time referral count</p>
        </div>
        <div className="px-[var(--density-card-pad)] pb-[var(--density-card-pad)] pt-1.5">
          {stats.clinics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clinics yet.</p>
          ) : stats.clinics.map(([name, count]) => (
            <div key={name} className="flex items-center gap-2.5 py-1.5">
              <BarChart3 width={14} height={14} strokeWidth={1.75} className="text-primary shrink-0" />
              <span className="text-sm text-foreground flex-1">{name}</span>
              <span className="text-sm font-semibold text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
