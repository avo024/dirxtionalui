import { useState, useEffect } from "react";
import { FileText, Clock, CheckCircle, XCircle, Send, Loader2 } from "lucide-react";
import { ReferralTable } from "@/components/ReferralTable";
import { adminApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { format, parseISO, subDays } from "date-fns";

export default function AdminDashboard() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getReferrals();
        const mapped = (response.items || []).map((r: any) => ({
          ...r,
          drug: r.drug_requested,
          blocked: r.preferred_pharmacy_blocked,
          dob: r.patient_dob,
        }));
        setReferrals(mapped);
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || "Failed to load referrals",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const needsReview = referrals.filter((r) => r.status === "ready_for_review");
  const today = new Date().toDateString();
  const approvedToday = referrals.filter((r) => r.status === "approved_to_send" && r.updated_at && new Date(r.updated_at).toDateString() === today).length;
  const rejectedToday = referrals.filter((r) => r.status === "rejected" && r.updated_at && new Date(r.updated_at).toDateString() === today).length;
  const sentToday = referrals.filter((r) => r.status === "sent_to_pharmacy" && r.updated_at && new Date(r.updated_at).toDateString() === today).length;

  const stats = [
    { label: "Total Referrals", value: referrals.length, icon: FileText, color: "text-primary" },
    { label: "Needs Review", value: needsReview.length, icon: Clock, color: "text-warning", badge: true },
    { label: "Approved Today", value: approvedToday, icon: CheckCircle, color: "text-success" },
    { label: "Rejected Today", value: rejectedToday, icon: XCircle, color: "text-destructive" },
    { label: "Sent Today", value: sentToday, icon: Send, color: "text-primary" },
  ];

  const statusPieData = [
    { name: "Needs Review", value: referrals.filter((r) => r.status === "ready_for_review").length, color: "hsl(210, 80%, 55%)" },
    { name: "Approved", value: referrals.filter((r) => r.status === "approved_to_send").length, color: "hsl(148, 48%, 48%)" },
    { name: "Sent", value: referrals.filter((r) => r.status === "sent_to_pharmacy").length, color: "hsl(174, 58%, 56%)" },
    { name: "Rejected", value: referrals.filter((r) => r.status === "rejected").length, color: "hsl(0, 89%, 68%)" },
    { name: "Uploaded", value: referrals.filter((r) => r.status === "uploaded").length, color: "hsl(40, 80%, 55%)" },
  ].filter((d) => d.value > 0);

  // Build line chart from actual created_at dates (last 7 days)
  const lineData = (() => {
    const days: { date: string; referrals: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = day.toDateString();
      const label = format(day, "MMM d");
      const count = referrals.filter((r) => r.created_at && new Date(r.created_at).toDateString() === dayStr).length;
      days.push({ date: label, referrals: count });
    }
    return days;
  })();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of all referral activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              {stat.badge && stat.value > 0 && (
                <span className="h-5 min-w-[20px] rounded-full bg-warning text-warning-foreground flex items-center justify-center text-xs px-1.5 font-medium">
                  !
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-semibold text-foreground mb-4">Referrals by Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value">
                {statusPieData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <h3 className="font-semibold text-foreground mb-4">Referrals Over Time (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="referrals" stroke="hsl(174, 58%, 56%)" strokeWidth={2} dot={{ fill: "hsl(174, 58%, 56%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Referrals needing review */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Referrals Needing Review {needsReview.length > 0 && <span className="text-warning">({needsReview.length})</span>}
        </h2>
        <ReferralTable referrals={needsReview} userType="admin" showClinic />
      </div>
    </div>
  );
}
