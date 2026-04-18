import { useAuth0 } from "@auth0/auth0-react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";

export function UserMenu() {
  const { user: auth0User, logout } = useAuth0();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  if (!auth0User) return null;

  const isClinicUser = user?.role === "clinic_user";
  const fullName =
    isClinicUser && profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : null;

  // Display label: clinic user → full name (or email placeholder while loading);
  // admin → email.
  const displayLabel = isClinicUser
    ? fullName ?? auth0User.email ?? "Account"
    : auth0User.email ?? auth0User.name ?? "Account";

  // Avatar initials: clinic with profile → first+last; otherwise email/name fallback
  const initials =
    isClinicUser && profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
      : (auth0User.name || auth0User.email || "U")
          .split(" ")
          .map((s) => s[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 h-9 px-2">
          <Avatar className="h-7 w-7">
            {auth0User.picture && <AvatarImage src={auth0User.picture} alt={displayLabel} />}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:inline">
            {displayLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{displayLabel}</span>
          {auth0User.email && displayLabel !== auth0User.email && (
            <span className="text-xs text-muted-foreground font-normal">
              {auth0User.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            logout({ logoutParams: { returnTo: window.location.origin } })
          }
          className="cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
