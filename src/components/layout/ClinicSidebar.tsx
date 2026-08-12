import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Plus, FileText, LogOut, Users, Settings, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ClinicSettingsModal } from "@/components/ClinicSettingsModal";
import { useSupportUnread } from "@/components/support/useSupportUnread";
import { clinicApi } from "@/lib/api";
import logo from "@/assets/logo.png";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/clinic/dashboard", tour: "nav-dashboard" },
  { label: "Patients", icon: Users, path: "/clinic/patients", tour: "nav-patients" },
  { label: "New Referral", icon: Plus, path: "/clinic/referrals/new", tour: "nav-new-referral" },
  { label: "My Referrals", icon: FileText, path: "/clinic/referrals", tour: "nav-referrals" },
  // Services hidden until add-ons exist — re-add when there are services to offer.
  // { label: "Services", icon: Sparkles, path: "/clinic/services" },
];

export function ClinicSidebar() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { hasUnread } = useSupportUnread();
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Open tasks from the Dirxctional team → amber pill on My Referrals.
  const [actionCount, setActionCount] = useState(0);
  useEffect(() => {
    const refresh = () =>
      clinicApi.getActionNeededCount()
        .then((r) => setActionCount(r.count || 0))
        .catch(() => { /* pill just won't show */ });
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [location.pathname]);

  return (
    <>
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center justify-center px-5 py-5 bg-white border-b border-sidebar-border">
        <img src={logo} alt="Dirxctional" className="w-auto h-auto max-w-[185px]" />
      </div>

      {/* Clinic name + settings */}
      <div className="px-5 py-3 border-b border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">Clinic</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-sidebar-accent-foreground truncate flex-1">{user?.clinic_name}</p>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Clinic settings"
            aria-label="Clinic settings"
            className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-1" data-tour="clinic-nav">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path === "/clinic/referrals" && location.pathname.startsWith("/clinic/referrals/") && !location.pathname.includes("new"));
          return (
            <Link
              key={item.path}
              to={item.path}
              data-tour={item.tour}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.label === "New Referral" && (
                <span className="ml-auto h-5 w-5 rounded bg-sidebar-primary/15 text-sidebar-primary flex items-center justify-center text-xs">+</span>
              )}
              {item.label === "My Referrals" && actionCount > 0 && (
                <span className="ml-auto rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950" title="Your Dirxctional team needs something on a referral">
                  {actionCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help & Support */}
      <div className="px-3 pt-2">
        <Link
          to="/clinic/support"
          data-tour="help-button"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            location.pathname.startsWith("/clinic/support")
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : hasUnread
                ? "bg-teal-500/15 text-teal-300 hover:bg-teal-500/25"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="flex-1">Help &amp; Support</span>
          {hasUnread && (
            <span className="animate-pulse rounded-full bg-teal-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-950">
              New
            </span>
          )}
        </Link>
      </div>

      {/* User / Logout */}
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
    <ClinicSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
