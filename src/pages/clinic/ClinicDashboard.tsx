import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Clock, XCircle, Plus,
  CalendarDays, FileSearch, AlertTriangle, ArrowRight, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReferralTable } from "@/components/ReferralTable";
import { useAuth } from "@/contexts/AuthContext";
import { clinicApi } from "@/lib/api";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { getGreeting, getFormattedDate } from "@/lib/dateUtils";

export default function ClinicDashboard() {
  const { user } = useAuth();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      clinicApi.getReferrals(),
      clinicApi.getPatients(),
    ])
      .then(([refData, patData]) => {
        setReferrals(mapReferralsFromBackend(refData.items || []));
        setPatients(patData.items || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const processingCount = referrals.filter((r) =>
    ["processing", "ready_for_review", "uploaded"].includes(r.status)
  ).length;

  const approvedCount = referrals.filter((r) =>
    r.status === "approved_to_send"
  ).length;

  const sentCount = referrals.filter((r) =>
    r.status === "approved_to_send"
  ).length;

  const paExpiringSoonCount = patients.filter((p) => {
    if (!p.pa_expiration_date) return false;
    const expDate = new Date(p.pa_expiration_date);
    const today = new Date();
    const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  }).length;

  const needsAttentionCount = referrals.filter((r) =>
    r.status === "rejected"
  ).length;

  const patientsExpiringPA = patients.filter((p) => {
    if (!p.pa_expiration_date) return false;
    const expDate = new Date(p.pa_expiration_date);
    const today = new Date();
    const daysUntil = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  });

  const rejectedReferrals = referrals.filter((r) => r.status === "rejected");

  const urgencyOrder: Record<string, number> = {
    rejected: 0,
    needs_info: 1,
    ready_for_review: 2,
    processing: 3,
    approved_to_send: 4,
    uploaded: 5,
  };

  const sortedRecentReferrals = [...referrals]
    .sort((a, b) => (urgencyOrder[a.status] ?? 99) - (urgencyOrder[b.status] ?? 99))
    .slice(0, 5);

  const stats = [
    {
      label: "In Review",
      value: processingCount,
      icon: Clock,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      subtitle: "Being reviewed",
      link: "/clinic/referrals?filter=processing",
    },
    {
      label: "Sent to Pharmacy",
      value: sentCount,
      icon: Send,
      colorClass: "text-primary",
      bgClass: "bg-primary/10",
      subtitle: "At pharmacy",
      link: "/clinic/referrals?filter=sent",
    },
    {
      label: "Needs Attention",
      value: needsAttentionCount,
      icon: XCircle,
      colorClass: "text-destructive",
      bgClass: "bg-destructive/10",
      subtitle: "Action required",
      link: "/clinic/referrals?filter=rejected",
    },
    {
      label: "PA Expiring Soon",
      value: paExpiringSoonCount,
      icon: AlertTriangle,
      colorClass: "text-warning",
      bgClass: "bg-warning/10",
      subtitle: "Within 30 days",
      link: "/clinic/patients?filter=expiring",
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
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="group rounded-xl border border-border bg-card p-5 card-shadow transition-all duration-200 hover:scale-[1.02] hover:card-shadow-md block"
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
            </Link>
          ))}
        </div>
      )}

      {/* Alerts */}
      {!loading && (patientsExpiringPA.length > 0 || rejectedReferrals.length > 0) && (
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
                  {patientsExpiringPA.map((p) => p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()).join(", ")}
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
                  {ref.drug_requested || ref.drug || '—'} · {ref.rejection_reason ? ref.rejection_reason.slice(0, 80) + "..." : "Review required"}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      )}

      {/* Recent referrals */}
      {loading ? (
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-[200px] rounded-xl" />
        </div>
      ) : referrals.length > 0 ? (
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
