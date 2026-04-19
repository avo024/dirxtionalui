import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { LogOut, UserCog } from "lucide-react";
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
import { useAdminProfile } from "@/hooks/useAdminProfile";
import { EditProfileModal } from "@/components/EditProfileModal";

export function UserMenu() {
  const { user: auth0User, logout } = useAuth0();
  const { user } = useAuth();
  const { data: clinicProfile } = useProfile();
  const { data: adminProfile } = useAdminProfile();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  if (!auth0User) return null;

  const isClinicUser = user?.role === "clinic_user";
  const isAdmin = user?.role === "internal_admin";

  // Pick the right profile based on role; each hook only fires for its role.
  const activeProfile = isClinicUser ? clinicProfile : isAdmin ? adminProfile : null;
  const fullName =
    activeProfile?.first_name && activeProfile?.last_name
      ? `${activeProfile.first_name} ${activeProfile.last_name}`
      : null;

  // Display label: name when available; email placeholder while loading.
  const displayLabel = fullName ?? auth0User.email ?? auth0User.name ?? "Account";

  // Avatar initials: profile first+last; otherwise email/name fallback
  const initials =
    activeProfile?.first_name && activeProfile?.last_name
      ? `${activeProfile.first_name[0]}${activeProfile.last_name[0]}`.toUpperCase()
      : (auth0User.name || auth0User.email || "U")
          .split(" ")
          .map((s) => s[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase();

  return (
    <>
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
          {isClinicUser && (
            <>
              <DropdownMenuItem
                onClick={() => setEditProfileOpen(true)}
                className="cursor-pointer"
              >
                <UserCog className="h-4 w-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
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

      {isClinicUser && (
        <EditProfileModal open={editProfileOpen} onOpenChange={setEditProfileOpen} />
      )}
    </>
  );
}
