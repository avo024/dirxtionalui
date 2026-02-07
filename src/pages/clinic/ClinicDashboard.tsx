import { Link } from "react-router-dom";
import { FileText, Clock, CheckCircle, XCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferralTable } from "@/components/ReferralTable";
import { useAuth } from "@/contexts/AuthContext";
import { mockReferrals } from "@/data/mockData";

const clinicReferrals = mockReferrals.filter((r) => r.clinic_name === "Dallas Dermatology Clinic");

const stats = [
  { label: "Total Referrals", value: clinicReferrals.length, icon: FileText, color: "text-primary" },
  { label: "Pending Review", value: clinicReferrals.filter((r) => ["uploaded", "processing", "ready_for_review"].includes(r.status)).length, icon: Clock, color: "text-warning" },
  { label: "Approved", value: clinicReferrals.filter((r) => ["approved_to_send", "sent_to_pharmacy"].includes(r.status)).length, icon: CheckCircle, color: "text-success" },
  { label: "Rejected", value: clinicReferrals.filter((r) => r.status === "rejected").length, icon: XCircle, color: "text-destructive" },
];

export default function ClinicDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.clinic_name}</h1>
          <p className="text-muted-foreground mt-1">Here's an overview of your referrals</p>
        </div>
        <Button asChild size="lg">
          <Link to="/clinic/referrals/new">
            <Plus className="h-4 w-4 mr-2" />
            Create New Referral
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 card-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent referrals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Referrals</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/clinic/referrals">View All →</Link>
          </Button>
        </div>
        <ReferralTable referrals={clinicReferrals.slice(0, 5)} userType="clinic" />
      </div>
    </div>
  );
}
