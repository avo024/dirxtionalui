import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, AlertOctagon, Building2, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { mockReferrals } from "@/data/mockData";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin/dashboard" },
  { label: "All Referrals", icon: FileText, path: "/admin/referrals" },
  { label: "Blocked Referrals", icon: AlertOctagon, path: "/admin/referrals/blocked" },
  { label: "Pharmacies", icon: Building2, path: "/admin/pharmacies" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

export function AdminSidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  const processingCount = mockReferrals.filter((r) => r.status === "processing").length;

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-sidebar-border">
        <img src={logo} alt="DiRxctional" className="h-24 w-auto" />
      </div>

      {/* Role */}
      <div className="px-5 py-3 border-b border-sidebar-border">
        <p className="text-xs text-muted-foreground">Role</p>
        <p className="text-sm font-medium text-foreground">Internal Admin</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/admin/referrals" && location.pathname.startsWith("/admin/referrals/") && !location.pathname.includes("blocked"));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.label === "All Referrals" && processingCount > 0 && (
                <span className="ml-auto h-5 min-w-[20px] rounded-full bg-warning text-warning-foreground flex items-center justify-center text-xs px-1.5">
                  {processingCount}
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
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground transition-colors w-full"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
