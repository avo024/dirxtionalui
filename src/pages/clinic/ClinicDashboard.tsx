import { Link, useLocation } from "react-router-dom";
import { ListRowsSkeleton, TodayStripSkeleton } from "@/components/patterns/Skeletons";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { ListRows, ListRow } from "@/components/patterns/ListRow";
import { TodayStrip, type TodayLine } from "@/components/patterns/TodayStrip";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/patterns/EmptyState";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { clinicApi, getMyClinic } from "@/lib/api";
import { useTour } from "@/components/tutorials/useTour";
import { useSupportUnread } from "@/components/support/useSupportUnread";
import { OVERVIEW_SEEN_KEY } from "@/components/tutorials/tours";
import { ClinicSettingsModal } from "@/components/ClinicSettingsModal";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { getGreeting, formatDateShort } from "@/lib/dateUtils";
import { PageContainer } from "@/components/patterns/PageContainer";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ClinicDashboard() {
  usePageTitle("Dashboard");
  const { user } = useAuth();
  const location = useLocation();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: clinic } = useQuery({ queryKey: ["my-clinic"], queryFn: getMyClinic });
  const needsDefaultPharmacy = !!clinic && !clinic.default_pharmacy_id;
  const { runTour } = useTour();
  const { hasUnread: supportUnread, bump: bumpSupport } = useSupportUnread();

  // First-login product tour: fire the Overview walkthrough once, after the
  // dashboard has loaded (so the highlighted action block exists). localStorage
  // only — no backend. Clear dx_tour_overview_seen to replay on next visit.
  useEffect(() => {
    if (loading) return;
    if (localStorage.getItem(OVERVIEW_SEEN_KEY) === "1") return;
    localStorage.setItem(OVERVIEW_SEEN_KEY, "1");
    const t = window.setTimeout(() => runTour("overview"), 600);
    return () => window.clearTimeout(t);
  }, [loading, runTour]);

  const [openTaskCount, setOpenTaskCount] = useState(0);
  useEffect(() => {
    const fetchData = () => {
      clinicApi.getReferrals()
        .then((refData) => setReferrals(mapReferralsFromBackend(refData.items || [])))
        .catch(console.error)
        .finally(() => setLoading(false));
      clinicApi.getActionNeededCount()
        .then((r) => setOpenTaskCount(r.count || 0))
        .catch(() => { /* box just shows rejected-only */ });
    };
    fetchData();
    const handleFocus = () => fetchData();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [location.key]);

  const rejectedReferrals = referrals.filter((r) => r.status === "rejected");
  const inProgressReferrals = referrals.filter((r) => ["processing", "ready_for_review", "uploaded"].includes(r.status));
  const needsAttentionCount = rejectedReferrals.length + openTaskCount;

  const urgencyOrder: Record<string, number> = { rejected: 0, needs_info: 1, ready_for_review: 2, processing: 3, approved_to_send: 4, uploaded: 5 };
  const sortedRecentReferrals = [...referrals].sort((a, b) => (urgencyOrder[a.status] ?? 99) - (urgencyOrder[b.status] ?? 99)).slice(0, 5);

  const processingReferrals = referrals.filter((r) => ["processing", "uploaded"].includes(r.status));
  const lines: TodayLine[] = [];
  if (needsAttentionCount > 0) {
    const items: TodayLine["items"] = rejectedReferrals.map((ref) => ({
      text: ref.patient_name,
      to: `/clinic/referrals/${ref.id}`,
      note: `${ref.drug_requested || ref.drug || "—"} · ${ref.rejection_reason ? ref.rejection_reason.slice(0, 90) + "…" : "Review required"}`,
    }));
    if (openTaskCount > 0) {
      items.push({
        text: `${openTaskCount} request${openTaskCount > 1 ? "s" : ""} from your Dirxctional team`,
        to: "/clinic/referrals?filter=action_needed",
        note: "Open the referral with the \"Action needed\" card to reply or upload.",
      });
    }
    lines.push({ key: "needs", label: "Needs you", count: needsAttentionCount, items });
  }
  if (supportUnread) {
    lines.push({
      key: "reply",
      label: "Dirxctional replied",
      items: [{ text: "Your support request has a reply", to: "/clinic/support", onClick: () => bumpSupport() }],
      action: { label: "Read reply", to: "/clinic/support", onClick: () => bumpSupport() },
    });
  }
  if (lines.length > 0 && processingReferrals.length > 0) {
    lines.push({
      key: "processing",
      label: "Processing",
      count: processingReferrals.length,
      items: processingReferrals.slice(0, 4).map((r) => ({ text: r.patient_name, note: r.drug || r.drug_requested || undefined })),
    });
  }

  const refRow = (r: any) => (
    <ListRow
      key={r.id}
      to={`/clinic/referrals/${r.id}`}
      patient={<Link to={`/clinic/referrals/${r.id}`} className="no-underline hover:underline focus-visible:outline-none" style={{ color: "inherit" }}>{r.patient_name}</Link>}
      sub={
        <>
          <span>{r.drug || r.drug_requested || "—"}</span>
          {r.created_by_name && r.created_by_name !== user?.name && (<><span className="sep">·</span><span>by {r.created_by_name}</span></>)}
        </>
      }
      status={<StatusBadge status={r.status} />}
      extra={<ClinicPABadge status={r.pa_status} appealOutcome={r.appeal_outcome} />}
      when={r.updated_at ? formatDateShort(r.updated_at) : r.created_at ? formatDateShort(r.created_at) : "—"}
    />
  );
  const refHead = ["Patient · drug", "Status", { label: "Updated", r: true }, ""];

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="ty-title">{getGreeting()}, {user?.clinic_name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell referrals={referrals} noteField="latest_admin_note_at" actionStatus="rejected" linkBase="/clinic/referrals" />
          <Button asChild><Link to="/clinic/referrals/new"><Icon name="add" />New Referral</Link></Button>
        </div>
      </div>

      {needsDefaultPharmacy && (
        <div className="flex items-center gap-3.5 px-[18px] py-3.5 mb-4 rounded-lg border border-primary/20 bg-primary/5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card border border-primary/20 text-primary"><Icon name="pharmacy" size={20} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Set your default pharmacy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pick the pharmacy your referrals should default to — you can change it any time in Clinic Settings.</p>
          </div>
          <Button size="sm" onClick={() => setSettingsOpen(true)}><Icon name="pharmacy" size={14} />Set pharmacy</Button>
        </div>
      )}

      {loading ? (
        <>
          <div className="mb-6"><TodayStripSkeleton /></div>
          <div className="mb-6">
            <div className="p3-sec"><Skeleton className="h-4 w-24" /></div>
            <ListRowsSkeleton rows={4} />
          </div>
        </>
      ) : (
        <>
          {/* Today — what needs the office, what Dirxctional replied, what is processing. */}
          <div className="mb-6">
            <TodayStrip
              data-tour="dashboard-stats"
              lines={lines}
              emptyNote="Every referral is with your Dirxctional team or already at the pharmacy."
            />
          </div>

          {/* In progress */}
          <div className="mb-6">
            <div className="p3-sec">
              <h2 className="ty-sec">In progress<span className="n">{inProgressReferrals.length}</span></h2>
            </div>
            {inProgressReferrals.length > 0 ? (
              <ListRows head={refHead}>{inProgressReferrals.slice(0, 6).map(refRow)}</ListRows>
            ) : (
              <div className="lr-list">
                <EmptyState art="caught-up" title="All caught up" text="Nothing is in progress. New referrals you submit will show up here." />
              </div>
            )}
          </div>

          {/* Recent referrals */}
          {referrals.length > 0 ? (
            <div>
              <div className="p3-sec">
                <h2 className="ty-sec">Recent</h2>
                <Link to="/clinic/referrals" className="p3-link">View All →</Link>
              </div>
              <ListRows head={refHead}>{sortedRecentReferrals.map(refRow)}</ListRows>
            </div>
          ) : (
            <div className="lr-list">
              <EmptyState
                art="referrals"
                title="No referrals yet"
                text="Referrals you create will show up here."
                actions={<Button asChild><Link to="/clinic/referrals/new"><Icon name="add" />New Referral</Link></Button>}
              />
            </div>
          )}
        </>
      )}
      <ClinicSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </PageContainer>
  );
}
