import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ClinicSettingsModal } from "@/components/ClinicSettingsModal";
import { useSupportUnread } from "@/components/support/useSupportUnread";
import { clinicApi } from "@/lib/api";
import logo from "@/assets/logo-white.svg";

const navItems = [
  { label: "Dashboard", icon: "dashboard", path: "/clinic/dashboard", tour: "nav-dashboard" },
  { label: "Patients", icon: "patients", path: "/clinic/patients", tour: "nav-patients" },
  { label: "New Referral", icon: "add", path: "/clinic/referrals/new", tour: "nav-new-referral" },
  { label: "My Referrals", icon: "document", path: "/clinic/referrals", tour: "nav-referrals" },
  // Services hidden until add-ons exist — re-add when there are services to offer.
  // { label: "Services", icon: Sparkles, path: "/clinic/services" },
];

export function ClinicSidebar() {
  const location = useLocation();
  const { user } = useAuth();
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
      <div className="flex items-center px-5 pt-[22px] pb-[18px]">
        <img src={logo} alt="Dirxctional" className="w-auto h-auto max-w-[168px]" />
      </div>

      {/* Clinic name + settings */}
      <div className="px-5 py-3 border-y border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/60">Clinic</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-sidebar-accent-foreground truncate flex-1">{user?.clinic_name}</p>
          <button
            onClick={() => setSettingsOpen(true)}
            title="Clinic settings"
            aria-label="Clinic settings"
            className="shrink-0 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground transition-colors"
          >
            <Icon name="settings" />
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
              data-active={isActive ? "" : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "sb4-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon name={item.icon} />
              {item.label}
              {item.label === "My Referrals" && actionCount > 0 && (
                <span className="sb3-n" title="Your Dirxctional team needs something on a referral">{actionCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help & Support */}
      <div className="px-3 pt-2 pb-4">
        <Link
          to="/clinic/support"
          data-tour="help-button"
          data-active={location.pathname.startsWith("/clinic/support") ? "" : undefined}
          aria-current={location.pathname.startsWith("/clinic/support") ? "page" : undefined}
          className={cn(
            "sb4-item flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            location.pathname.startsWith("/clinic/support")
              ? "text-white"
              : hasUnread
                ? "bg-teal-500/15 text-teal-300 hover:bg-teal-500/25"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
          )}
        >
          <Icon name="help" />
          <span className="flex-1">Help &amp; Support</span>
        </Link>
      </div>
    </aside>
    <ClinicSettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
