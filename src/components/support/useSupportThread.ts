/**
 * useSupportThread — loads + sends the clinic's "Contact us" support thread.
 * Backed by supportApi (see SUPPORT_API_CONTRACT.md). General/account/how-to
 * support only — patient-specific conversation stays in referral Notes.
 */
import { useState, useEffect, useCallback } from "react";
import { supportApi, type SupportMessage } from "@/lib/api";

export const SUPPORT_LAST_VIEWED_KEY = "support_last_viewed";

export function useSupportThread(enabled: boolean) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [latestAdminAt, setLatestAdminAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await supportApi.getMessages();
      setMessages(res.items || []);
      setLatestAdminAt(res.latest_admin_at ?? null);
    } catch (e: any) {
      setError(e?.message || "Couldn't load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load when the thread becomes visible; mark as viewed so the unread dot clears.
  useEffect(() => {
    if (!enabled) return;
    load();
    localStorage.setItem(SUPPORT_LAST_VIEWED_KEY, new Date().toISOString());
  }, [enabled, load]);

  const send = useCallback(
    async (body: string, category: "support" | "feedback") => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      setSending(true);
      setError(null);
      try {
        const msg = await supportApi.postMessage(trimmed, category);
        // POST response omits created_at — stamp it for optimistic display.
        setMessages((prev) => [
          ...prev,
          { ...msg, created_at: msg.created_at || new Date().toISOString() },
        ]);
        return true;
      } catch (e: any) {
        setError(e?.message || "Couldn't send your message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [],
  );

  return { messages, latestAdminAt, loading, sending, error, send, reload: load };
}
