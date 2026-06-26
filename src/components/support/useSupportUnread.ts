/**
 * useSupportUnread — drives the unread dot on the Help button.
 *
 * Mirrors the NotificationBell pattern: fetch the lightweight /support/summary,
 * compare its latest_admin_at against the localStorage support_last_viewed
 * timestamp. Unread when an admin reply is newer than the last time the clinic
 * opened the thread. `bump` is called when the thread opens to clear the dot.
 */
import { useState, useEffect, useCallback } from "react";
import { supportApi } from "@/lib/api";
import { SUPPORT_LAST_VIEWED_KEY } from "./useSupportThread";

// Re-check periodically so a reply that lands while the app is open surfaces.
const POLL_MS = 60_000;

export function useSupportUnread() {
  const [latestAdminAt, setLatestAdminAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await supportApi.getSummary();
      setLatestAdminAt(res.latest_admin_at ?? null);
    } catch {
      // Soft-fail: no dot if the summary can't be fetched (e.g. backend not live yet).
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const lastViewed = (() => {
    try {
      return localStorage.getItem(SUPPORT_LAST_VIEWED_KEY);
    } catch {
      return null;
    }
  })();

  const hasUnread =
    !!latestAdminAt && (!lastViewed || new Date(latestAdminAt) > new Date(lastViewed));

  // Call when the thread is opened: record now + drop the dot immediately.
  const bump = useCallback(() => {
    try {
      localStorage.setItem(SUPPORT_LAST_VIEWED_KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setLatestAdminAt(null);
  }, []);

  return { hasUnread, bump, refresh };
}
