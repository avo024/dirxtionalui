import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { resolveNextAction } from "@/lib/nextAction";
import { toNextActionInput } from "@/lib/queueRows";

/**
 * "Waiting on us" count for the sidebar's "All Referrals" badge (Phase 3b
 * follow-up). All-time, non-archived referrals whose resolved next action's
 * `tab` is "us" — this is the same population and resolver the Waiting on us
 * tab in AdminReferralsList counts, so the sidebar badge and the tab count
 * match. Replaces the old month-scoped `needs_review` count from
 * `adminApi.getReferralCounts()`.
 */
export function useWaitingOnUsCount(): number {
  const { data } = useQuery({
    queryKey: ["admin", "referrals", "waiting-on-us-count"],
    queryFn: () => adminApi.getReferrals({ month: "all", archived: false }),
    staleTime: 60 * 1000,
  });

  const rows: any[] = data?.items || [];
  return rows.filter((r) => resolveNextAction(toNextActionInput(r)).tab === "us").length;
}
