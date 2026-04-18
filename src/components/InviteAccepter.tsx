import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { toast } from "@/hooks/use-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function InviteAccepter() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const processedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || processedRef.current) return;
    const token = sessionStorage.getItem("pendingInviteToken");
    if (!token) return;
    processedRef.current = true;

    (async () => {
      try {
        const accessToken = await getAccessTokenSilently();
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
  }, [isAuthenticated, getAccessTokenSilently]);

  return null;
}
