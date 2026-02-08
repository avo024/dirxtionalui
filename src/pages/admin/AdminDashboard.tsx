import { FileText, Clock, CheckCircle, XCircle, Send } from "lucide-react";
import { ReferralTable } from "@/components/ReferralTable";
import { mockReferrals } from "@/data/mockData";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

const processingReferrals = mockReferrals.filter((r) => r.status === "processing");

const stats = [
  { label: "Total Referrals", value: mockReferrals.length, icon: FileText, color: "text-primary" },
  { label: "Needs Review", value: processingReferrals.length, icon: Clock, color: "text-warning", badge: true },
  { label: "Approved Today", value: 1, icon: CheckCircle, color: "text-success" },
  { label: "Rejected Today", value: 0, icon: XCircle, color: "text-destructive" },
  { label: "Sent Today", value: 0, icon: Send, color: "text-primary" },
];

const statusPieData = [
  { name: "Needs Review", value: mockReferrals.filter((r) => r.status === "processing").length, color: "hsl(210, 80%, 55%)" },
  { name: "Approved", value: mockReferrals.filter((r) => r.status === "approved").length, color: "hsl(148, 48%, 48%)" },
  { name: "Sent", value: mockReferrals.filter((r) => r.status === "sent_to_pharmacy").length, color: "hsl(174, 58%, 56%)" },
  { name: "Rejected", value: mockReferrals.filter((r) => r.status === "rejected").length, color: "hsl(0, 89%, 68%)" },
];

const lineData = [
  { date: "Feb 1", referrals: 2 },
  { date: "Feb 2", referrals: 1 },
  { date: "Feb 3", referrals: 3 },
  { date: "Feb 4", referrals: 1 },
  { date: "Feb 5", referrals: 2 },
  { date: "Feb 6", referrals: 3 },
  { date: "Feb 7", referrals: 4 },
];

export default function AdminDashboard() {
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
          <h3 className="font-semibold text-foreground mb-4">Referrals Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 46%)" />
              <Tooltip />
              <Line type="monotone" dataKey="referrals" stroke="hsl(174, 58%, 56%)" strokeWidth={2} dot={{ fill: "hsl(174, 58%, 56%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Processing referrals */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Referrals Needing Review</h2>
        <ReferralTable referrals={processingReferrals} userType="admin" showClinic />
      </div>
    </div>
  );
}
