import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

export interface ClinicOfficeManagerStatus {
  /** True if any accepted team member for this clinic has role office_manager. */
  hasOfficeManager: boolean;
  /** True if any pending (not used/revoked/expired) invite for this clinic has role office_manager. */
  hasPendingOfficeManagerInvite: boolean;
  loading: boolean;
}

/**
 * Shared "does this clinic already have an office manager" check — backs the
 * soft "invite the office manager first" guard on both invite surfaces
 * (NewInviteModal, ClinicDetail's quick-invite box). Uses the same query
 * keys as TeamMembersPanel/TeamInvitesPanel (`["admin","clinic-team",id]`,
 * `["admin","invites"]`) so the cache is shared, not duplicated.
 */
export function useClinicHasOfficeManager(clinicId: string | undefined): ClinicOfficeManagerStatus {
  const teamQuery = useQuery({
    queryKey: ["admin", "clinic-team", clinicId],
    queryFn: () => adminApi.getClinicTeam(clinicId as string),
    enabled: !!clinicId,
  });

  const invitesQuery = useQuery({
    queryKey: ["admin", "invites"],
    queryFn: () => adminApi.listInvites(),
    enabled: !!clinicId,
  });

  const hasOfficeManager = (teamQuery.data?.items ?? []).some((m) => m.role === "office_manager");

  const hasPendingOfficeManagerInvite = (invitesQuery.data?.items ?? []).some((iv) => {
    if (iv.clinic_id !== clinicId || iv.role !== "office_manager") return false;
    if (iv.used_at || iv.revoked_at) return false;
    try {
      return new Date(iv.expires_at).getTime() > Date.now();
    } catch {
      return true;
    }
  });

  return {
    hasOfficeManager,
    hasPendingOfficeManagerInvite,
    loading: !!clinicId && (teamQuery.isLoading || invitesQuery.isLoading),
  };
}
