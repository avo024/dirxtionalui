import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getIdToken } from "@/lib/cognito";
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function InviteAccepter() {
  const { isAuthenticated } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || processedRef.current) return;
    const token = sessionStorage.getItem("pendingInviteToken");
    if (!token) return;
    processedRef.current = true;

    (async () => {
      try {
        const accessToken = await getIdToken();
        if (!accessToken) {
          console.error("No Cognito ID token available for invite accept");
          return;
        }
        const res = await fetch(`${API_BASE_URL}/invites/${token}/accept`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          let clinicName = "";
          try {
            const data = await res.json();
            clinicName = data?.clinic_name || "";
          } catch {
            // ignore json parse failures
          }
          toast({
            title: clinicName ? `Welcome to ${clinicName}` : "Welcome!",
          });
        } else {
          console.error("Failed to accept invite", await res.text());
        }
      } catch (e) {
        console.error("Invite accept error", e);
      } finally {
        sessionStorage.removeItem("pendingInviteToken");
      }
    })();
  }, [isAuthenticated]);

  return null;
}
