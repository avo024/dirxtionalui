import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, FileText, Building2, Hospital, LogOut, LineChart, MessageSquare, BarChart3, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi } from "@/lib/api";
import { adminAddonsApi } from "@/lib/servicesApi";
import { useWaitingOnUsCount } from "@/hooks/useWaitingOnUsCount";
import logo from "@/assets/logo.png";

const navItems = [
  // Referrals (the queue) is the default landing surface — Dashboard is
  // retired in phase 6b and kept below it for now (Alex, phase 6a).
  { label: "Referrals", icon: FileText, path: "/admin/referrals" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  // Analytics live on their own page (gate by role later — workers don't
  // need clinic volumes and trend lines on the daily surface).
  { label: "Insights", icon: BarChart3, path: "/admin/insights" },
  { label: "AI Quality", icon: LineChart, path: "/admin/ai-quality" },
  { label: "Pharmacies", icon: Building2, path: "/admin/pharmacies" },
  { label: "Clinics", icon: Hospital, path: "/admin/clinics" },
  { label: "Support", icon: MessageSquare, path: "/admin/support" },
  { label: "Fax Center", icon: Printer, path: "/admin/faxes" },
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
      <div className="flex items-center justify-center px-5 py-5 bg-white border-b border-sidebar-border">
        <img src={logo} alt="Dirxctional" className="w-auto h-auto max-w-[185px]" />
      </div>

      {/* Role */}
      <div className="px-5 py-3 border-b border-sidebar-border">
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
              <item.icon className="h-4 w-4" />
              {item.label}
              {badgeCount > 0 && (
                <span className="ml-auto h-5 min-w-[20px] rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs px-1.5 font-semibold">
                  {badgeCount}
                </span>
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
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
