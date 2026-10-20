import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/api";
import { adminAddonsApi } from "@/lib/servicesApi";
import { useWaitingOnUsCount } from "@/hooks/useWaitingOnUsCount";
import logo from "@/assets/logo-white.svg";

const navItems = [
  // Referrals (the queue) is the default landing surface — Dashboard was
  // retired in phase 6b; /admin and /admin/dashboard now redirect here.
  { label: "Referrals", icon: "document", path: "/admin/referrals" },
  // Analytics live on their own page (gate by role later — workers don't
  // need clinic volumes and trend lines on the daily surface).
  { label: "Insights", icon: "chart", path: "/admin/insights" },
  { label: "AI Quality", icon: "trend", path: "/admin/ai-quality" },
  { label: "Pharmacies", icon: "pharmacy", path: "/admin/pharmacies" },
  { label: "Clinics", icon: "clinic", path: "/admin/clinics" },
  { label: "Support", icon: "message", path: "/admin/support" },
  { label: "Fax Center", icon: "print", path: "/admin/faxes" },
  // Add-on Requests hidden until add-ons exist (Services is hidden on the clinic side too).
  // { label: "Add-on Requests", icon: Inbox, path: "/admin/addon-requests" },
  // Invites retired — folded into Clinic Detail as "Team & Invites" (clinic-scoped).
];

export function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();
  const waitingOnUsCount = useWaitingOnUsCount();

  const { data: pendingRequests } = useQuery({
    queryKey: ["admin", "addon-requests", "pending"],
    queryFn: () => adminAddonsApi.listRequests("pending"),
    staleTime: 60 * 1000,
  });
  const pendingAddonCount = pendingRequests?.requests.length ?? 0;

  const { data: faxes } = useQuery({
    queryKey: ["admin", "faxes", "sidebar-count"],
    queryFn: () => adminApi.getFaxes(),
    staleTime: 60 * 1000,
  });
  const inboundNewFaxCount = faxes?.inbound_new_count ?? 0;

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center px-5 pt-[22px] pb-[18px]">
        <img src={logo} alt="Dirxctional" className="w-auto h-auto max-w-[168px]" />
      </div>

      {/* Role */}
      <div className="px-5 py-3 border-y border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">Role</p>
        <p className="text-sm font-medium text-sidebar-accent-foreground">Internal Admin</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/admin/referrals" && location.pathname.startsWith("/admin/referrals/")) ||
            (item.path === "/admin/clinics" && location.pathname.startsWith("/admin/clinics/")) ||
            (item.path === "/admin/ai-quality" && location.pathname.startsWith("/admin/ai-quality")) ||
            (item.path === "/admin/support" && location.pathname.startsWith("/admin/support/"));
          const badgeCount =
            item.label === "Referrals" ? waitingOnUsCount :
            item.label === "Add-on Requests" ? pendingAddonCount :
            item.label === "Fax Center" ? inboundNewFaxCount :
            0;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon name={item.icon} />
              {item.label}
              {badgeCount > 0 && (
                <span className="sb3-n" data-tone="teal">{badgeCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors w-full"
        >
          <Icon name="sign-out" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
