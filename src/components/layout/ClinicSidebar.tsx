import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus, FileText, Settings, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/clinic/dashboard" },
  { label: "Patients", icon: Users, path: "/clinic/patients" },
  { label: "New Referral", icon: Plus, path: "/clinic/referrals/new" },
  { label: "My Referrals", icon: FileText, path: "/clinic/referrals" },
  { label: "Settings", icon: Settings, path: "/clinic/settings" },
];

export function ClinicSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center px-5 py-4 border-b border-sidebar-border">
        <img src={logo} alt="DiRxctional" className="h-12 w-auto" />
      </div>

      {/* Clinic name */}
      <div className="px-5 py-3 border-b border-sidebar-border">
        <p className="text-xs text-muted-foreground">Clinic</p>
        <p className="text-sm font-medium text-foreground truncate">{user?.clinic_name}</p>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/clinic/referrals" && location.pathname.startsWith("/clinic/referrals/") && !location.pathname.includes("new"));
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
              {item.label === "New Referral" && (
                <span className="ml-auto h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs">+</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
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
