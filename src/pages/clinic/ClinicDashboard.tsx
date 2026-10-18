import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { XCircle, Plus, FileSearch, AlertTriangle, ArrowRight, Store, MessageCircle, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ClinicPABadge } from "@/components/ClinicPABadge";
import { getInitials } from "@/components/CreatedByAvatar";
import { LinkRow } from "@/components/patterns/LinkRow";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { clinicApi, getMyClinic } from "@/lib/api";
import { useTour } from "@/components/tutorials/useTour";
import { useSupportUnread } from "@/components/support/useSupportUnread";
import { OVERVIEW_SEEN_KEY } from "@/components/tutorials/tours";
import { ClinicSettingsModal } from "@/components/ClinicSettingsModal";
import { mapReferralsFromBackend } from "@/lib/dataMapper";
import { getGreeting, formatDateShort } from "@/lib/dateUtils";
import { PageContainer } from "@/components/patterns/PageContainer";

export default function ClinicDashboard() {
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

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold font-editorial text-foreground">{getGreeting()}, {user?.clinic_name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell referrals={referrals} noteField="latest_admin_note_at" actionStatus="rejected" linkBase="/clinic/referrals" />
          <Button asChild><Link to="/clinic/referrals/new"><Plus width={16} height={16} strokeWidth={1.75} />New Referral</Link></Button>
        </div>
      </div>

      {needsDefaultPharmacy && (
        <div className="flex items-center gap-3.5 px-4.5 py-3.5 mb-4 rounded-lg border border-primary/20 bg-primary/5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-card border border-primary/20 text-primary"><Store width={18} height={18} strokeWidth={1.75} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Set your default pharmacy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pick the pharmacy your referrals should default to — you can change it any time in Clinic Settings.</p>
          </div>
          <Button size="sm" onClick={() => setSettingsOpen(true)}><Store width={14} height={14} strokeWidth={1.75} />Set pharmacy</Button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          <div className="h-24 rounded-lg bg-muted animate-pulse" />
          <div className="h-40 rounded-lg bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          {/* Action needed from your office — open tasks + rejected referrals first. */}
          <div data-tour="dashboard-stats" className="mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Action needed from your office</h2>
              {needsAttentionCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-destructive/12 text-destructive px-2 py-0.5 text-[11px] font-bold">{needsAttentionCount}</span>
              )}
            </div>
            {needsAttentionCount === 0 && !supportUnread ? (
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                Nothing needs your attention right now.
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
                {supportUnread && (
                  <Link
                    to="/clinic/support"
                    onClick={() => bumpSupport()}
                    className="flex items-center gap-3 border-l-[3px] border-l-primary px-4 py-3 no-underline hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <MessageCircle width={16} height={16} strokeWidth={1.75} className="text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">Dirxctional replied to your support request</p>
                      <p className="text-xs text-muted-foreground truncate">Open Help &amp; Support to read the reply.</p>
                    </div>
                    <ChevronRight width={16} height={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" />
                  </Link>
                )}
                {rejectedReferrals.map((ref) => (
                  <Link
                    key={ref.id}
                    to={`/clinic/referrals/${ref.id}`}
                    className="flex items-center gap-3 border-l-[3px] border-l-destructive px-4 py-3 no-underline hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <XCircle width={16} height={16} strokeWidth={1.75} className="text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{ref.patient_name} — needs attention</p>
                      <p className="text-xs text-muted-foreground truncate">{ref.drug_requested || ref.drug || "—"} · {ref.rejection_reason ? ref.rejection_reason.slice(0, 90) + "…" : "Review required"}</p>
                    </div>
                    <ChevronRight width={16} height={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" />
                  </Link>
                ))}
                {openTaskCount > 0 && (
                  <Link
                    to="/clinic/referrals?filter=action_needed"
                    className="flex items-center gap-3 border-l-[3px] border-l-warning px-4 py-3 no-underline hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    <AlertTriangle width={16} height={16} strokeWidth={1.75} className="text-[#B45309] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{openTaskCount} request{openTaskCount > 1 ? "s" : ""} from your Dirxctional team</p>
                      <p className="text-xs text-muted-foreground">Open the referral with the "Action needed" card to reply or upload.</p>
                    </div>
                    <ChevronRight width={16} height={16} strokeWidth={1.75} className="text-muted-foreground shrink-0" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* In progress — compact table */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">In progress</h2>
              <span className="text-xs font-medium text-muted-foreground">{inProgressReferrals.length}</span>
            </div>
            {inProgressReferrals.length > 0 ? (
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Patient</TableHead><TableHead>Drug</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {inProgressReferrals.slice(0, 6).map((r) => (
                      <LinkRow key={r.id} to={`/clinic/referrals/${r.id}`}>
                        <TableCell>
                          <Link to={`/clinic/referrals/${r.id}`} className="font-semibold text-foreground no-underline hover:underline focus-visible:outline-none">{r.patient_name}</Link>
                          {r.created_by_name && r.created_by_name !== user?.name && (
                            <span title={`Created by ${r.created_by_name}`} className="ml-2 text-[11px] text-muted-foreground">{getInitials(r.created_by_name)}</span>
                          )}
                        </TableCell>
                        <TableCell>{r.drug || r.drug_requested || "—"}</TableCell>
                        <TableCell><StatusBadge status={r.status} variant="soft" /></TableCell>
                        <TableCell className="text-muted-foreground">{r.created_at ? formatDateShort(r.created_at) : "—"}</TableCell>
                      </LinkRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">Nothing in progress.</div>
            )}
          </div>

          {/* Recent referrals */}
          {referrals.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Recent</h2>
                <Link to="/clinic/referrals" className="text-sm text-primary font-medium hover:underline">View All →</Link>
              </div>
              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient Name</TableHead><TableHead>Drug</TableHead><TableHead>Status</TableHead>
                      <TableHead>PA Status</TableHead><TableHead>Created</TableHead><TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedRecentReferrals.map((r) => (
                      <LinkRow key={r.id} to={`/clinic/referrals/${r.id}`}>
                        <TableCell>
                          <Link to={`/clinic/referrals/${r.id}`} className="font-semibold text-foreground no-underline hover:underline focus-visible:outline-none">{r.patient_name}</Link>
                          {r.created_by_name && r.created_by_name !== user?.name && (
                            <span title={`Created by ${r.created_by_name}`} className="ml-2 text-[11px] text-muted-foreground">{getInitials(r.created_by_name)}</span>
                          )}
                        </TableCell>
                        <TableCell>{r.drug || r.drug_requested || "—"}</TableCell>
                        <TableCell><StatusBadge status={r.status} variant="soft" /></TableCell>
                        <TableCell><ClinicPABadge status={r.pa_status} appealOutcome={r.appeal_outcome} /></TableCell>
                        <TableCell className="text-muted-foreground">{r.created_at ? formatDateShort(r.created_at) : "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.updated_at ? formatDateShort(r.updated_at) : "—"}</TableCell>
                      </LinkRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground"><FileSearch width={26} height={26} strokeWidth={1.75} /></span>
              <h3 className="text-base font-semibold text-foreground">No referrals yet</h3>
              <p className="text-sm text-muted-foreground">Create your first referral to get started</p>
              <Button asChild><Link to="/clinic/referrals/new"><Plus width={16} height={16} strokeWidth={1.75} />New Referral</Link></Button>
            </div>
          )}
        </>
      )}
      <ClinicSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </PageContainer>
  );
}
