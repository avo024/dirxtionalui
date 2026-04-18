import { useQuery } from "@tanstack/react-query";
import { getMyProfile, type MyProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export const PROFILE_QUERY_KEY = ["profile", "me"] as const;

/**
 * useProfile — fetches the authenticated clinic user's profile.
 * Only enabled for clinic_user role.
 */
export function useProfile() {
  const { isAuthenticated, user } = useAuth();
  return useQuery<MyProfile>({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getMyProfile,
    enabled: isAuthenticated && user?.role === "clinic_user",
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
