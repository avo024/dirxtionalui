import { useQuery } from "@tanstack/react-query";
import { getMyAdminProfile, type AdminProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const ADMIN_PROFILE_QUERY_KEY = ["profile", "admin", "me"] as const;

/**
 * useAdminProfile — fetches the authenticated internal admin's profile.
 * Only enabled for internal_admin role.
 */
export function useAdminProfile() {
  const { isAuthenticated, user } = useAuth();
  return useQuery<AdminProfile>({
    queryKey: ADMIN_PROFILE_QUERY_KEY,
    queryFn: getMyAdminProfile,
    enabled: isAuthenticated && user?.role === "internal_admin",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
