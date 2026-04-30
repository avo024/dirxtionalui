import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

const ONBOARDED_KEY = "dxctn_onboarded";

/**
 * Decides whether to show the first-login welcome nickname modal.
 *
 * Shown when:
 *   - User is authenticated, AND
 *   - localStorage flag `dxctn_onboarded` is not set, AND
 *   - The Cognito `nickname` attribute is empty.
 */
export function useWelcomeNickname() {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [hasFlag, setHasFlag] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARDED_KEY) !== null;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    // Re-check flag on mount in case it was set elsewhere.
    try {
      setHasFlag(localStorage.getItem(ONBOARDED_KEY) !== null);
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setHasFlag(true);
  }, []);

  const nicknameEmpty = !user?.nickname || !user.nickname.trim();
  const show =
    isAuthenticated && !!user && !hasFlag && !dismissed && nicknameEmpty;

  return { show, dismiss };
}
