import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, Inbox, BarChart3 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, subDays } from "date-fns";
import "../clinic/wizard.css";
import "../clinic/dashboard.css";
import "./admin-dashboard.css";

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
    return <div className="rw-page" style={{ display: "flex", justifyContent: "center", padding: 64 }}><span className="rw-spin" style={{ color: "var(--color-teal)" }}><Loader2 size={26} /></span></div>;
  }

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="dh-muted-card" style={{ cursor: "default" }}>
      <div className="dh-muted-top"><span className="dh-muted-lbl">{label}</span></div>
      <span className="dh-muted-val num">{value}</span>
      {sub && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{sub}</span>}
    </div>
  );

  return (
    <div className="rw-page dh-page rw-fade">
      <div className="dh-header">
        <div className="dh-greet">
          <h1 className="dh-h1 serif">Insights</h1>
          <p className="dh-sub">Pipeline analytics — volumes, ratios, and trends across all clinics</p>
        </div>
      </div>

      {/* Headline tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Tile label="Total referrals" value={stats.total} sub="all time" />
        <Tile label="Last 30 days" value={stats.last30} sub={`~${stats.avgPerDay}/day`} />
        <Tile label="Sent to pharmacy" value={stats.sent} sub="all time" />
        <Tile label="Approval rate" value={stats.approvalRate === null ? "—" : `${stats.approvalRate}%`} sub="of decided referrals" />
        <Tile label="Bridge program" value={stats.bridge} sub="manufacturer-funded" />
      </div>

      {/* PA mix */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        <Tile label="PA required" value={stats.paRequired} sub="excl. bridge" />
        <Tile label="PA approved" value={stats.paApproved} />
        <Tile label="PA denied" value={stats.paDenied} />
        <Tile label="In appeal" value={stats.paInAppeal} />
      </div>

      {/* Charts (moved off the operational dashboard) */}
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
          <div className="ad-chart-head"><div><h3 className="ad-chart-title">Referrals Over Time</h3><p className="ad-chart-sub">Last 30 days</p></div></div>
          <div className="ad-chart-body">
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
      <div className="ad-chart-card" style={{ marginTop: 18 }}>
        <div className="ad-chart-head"><div><h3 className="ad-chart-title">Volume by Clinic</h3><p className="ad-chart-sub">All-time referral count</p></div></div>
        <div style={{ padding: "6px 18px 16px" }}>
          {stats.clinics.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No clinics yet.</p>
          ) : stats.clinics.map(([name, count]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
              <BarChart3 size={13} style={{ color: "var(--color-teal-700)", flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: "var(--text-body)", flex: 1 }}>{name}</span>
              <span className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
