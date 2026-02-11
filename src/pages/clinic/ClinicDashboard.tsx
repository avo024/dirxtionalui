import { Link } from "react-router-dom";
import {
  Clock, CheckCircle, XCircle, Plus, ArrowUpRight,
  CalendarDays, FileSearch, AlertTriangle, ArrowRight, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReferralTable } from "@/components/ReferralTable";
import { useAuth } from "@/contexts/AuthContext";
import { mockReferrals, mockPatients } from "@/data/mockData";
import { getGreeting, getFormattedDate } from "@/lib/dateUtils";

const clinicReferrals = mockReferrals.filter(
  (r) => r.clinic_name === "Dallas Dermatology Clinic"
);

const processingCount = clinicReferrals.filter((r) =>
  r.status === "processing"
).length;

const approvedCount = clinicReferrals.filter((r) =>
  ["approved", "sent_to_pharmacy"].includes(r.status)
).length;

const needsAttentionCount = clinicReferrals.filter(
  (r) => r.status === "rejected"
).length;

const sentCount = clinicReferrals.filter(
  (r) => r.status === "sent_to_pharmacy"
).length;

const patientsExpiringPA = mockPatients.filter((p) => p.pa_status === "expiring");
const rejectedReferrals = clinicReferrals.filter((r) => r.status === "rejected");

// Sort referrals by urgency: rejected > processing > approved > sent
const urgencyOrder: Record<string, number> = {
  rejected: 0,
  processing: 1,
  approved: 2,
  uploaded: 3,
  sent_to_pharmacy: 4,
};

const sortedRecentReferrals = [...clinicReferrals]
  .sort((a, b) => (urgencyOrder[a.status] ?? 99) - (urgencyOrder[b.status] ?? 99))
  .slice(0, 5);

export default function ClinicDashboard() {
  const { user } = useAuth();

  const stats = [
    {
      label: "In Review",
      value: processingCount,
      icon: Clock,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      subtitle: "Being reviewed",
    },
    {
      label: "Approved",
      value: approvedCount,
      icon: CheckCircle,
      colorClass: "text-success",
      bgClass: "bg-success/10",
      subtitle: "Ready or sent",
    },
    {
      label: "Sent to Pharmacy",
      value: sentCount,
      icon: Send,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      subtitle: "At pharmacy",
    },
    {
      label: "Needs Attention",
      value: needsAttentionCount,
      icon: XCircle,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      subtitle: "Action required",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {user?.clinic_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your referrals today
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {getFormattedDate()}
            </div>
          </div>
          <Button asChild size="lg">
            <Link to="/clinic/referrals/new">
              <Plus className="h-4 w-4 mr-2" />
              New Referral
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group rounded-xl border border-border bg-card p-5 card-shadow transition-all duration-200 hover:scale-[1.02] hover:card-shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <div
                className={`h-9 w-9 rounded-lg ${stat.bgClass} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
              >
                <stat.icon className={`h-4.5 w-4.5 ${stat.colorClass}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1.5">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(patientsExpiringPA.length > 0 || rejectedReferrals.length > 0) && (
        <div className="space-y-3">
          {patientsExpiringPA.length > 0 && (
            <Link
              to="/clinic/patients?filter=expiring"
              className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {patientsExpiringPA.length} patient{patientsExpiringPA.length > 1 ? "s" : ""} with PA expiring in the next 30 days
                </p>
                <p className="text-xs text-muted-foreground">
                  {patientsExpiringPA.map((p) => `${p.first_name} ${p.last_name}`).join(", ")}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          {rejectedReferrals.map((ref) => (
            <Link
              key={ref.id}
              to={`/clinic/referrals/${ref.id}`}
              className="flex items-center gap-3 p-4 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors group"
            >
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <XCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {ref.patient_name} — Needs Attention
                </p>
                <p className="text-xs text-muted-foreground">
                  {ref.drug} · {ref.rejection_reason ? ref.rejection_reason.slice(0, 80) + "..." : "Review required"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      )}

      {/* Recent referrals */}
      {clinicReferrals.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Recent Referrals
            </h2>
            <Button variant="ghost" size="sm" asChild className="text-primary">
              <Link to="/clinic/referrals">View All →</Link>
            </Button>
          </div>
          <ReferralTable
            referrals={sortedRecentReferrals}
            userType="clinic"
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <FileSearch className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            No referrals yet
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first referral to get started
          </p>
          <Button asChild>
            <Link to="/clinic/referrals/new">
              <Plus className="h-4 w-4 mr-2" />
              New Referral
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
