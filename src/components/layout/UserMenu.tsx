import { useState } from "react";
import { Icon } from "@/components/ui/icon";
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
import { roleLabel } from "@/lib/roles";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { data: clinicProfile } = useProfile();
  const { data: adminProfile } = useAdminProfile();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  if (!user) return null;

  const isClinicUser = user.role === "clinic_user";
  const isAdmin = user.role === "internal_admin";

  // Pick the right profile based on role; each hook only fires for its role.
  const activeProfile = isClinicUser ? clinicProfile : isAdmin ? adminProfile : null;
  const profileFullName =
    activeProfile?.first_name && activeProfile?.last_name
      ? `${activeProfile.first_name} ${activeProfile.last_name}`
      : null;
  const legalFullName =
    user.given_name && user.family_name
      ? `${user.given_name} ${user.family_name}`
      : null;

  // Prefer legal name from Cognito claims, then backend profile, then auth name/email.
  const displayLabel =
    legalFullName ||
    profileFullName ||
    user.name ||
    user.email ||
    "Account";

  // Avatar initials follow the same priority chain.
  const initialsSource =
    legalFullName ||
    profileFullName ||
    user.name ||
    user.email ||
    "U";
  const words = initialsSource.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  const initials = (
    words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "U").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2)
  ).toUpperCase();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="gap-2 h-9 px-2" data-tour="user-menu">
            <Avatar className="h-7 w-7">
              {user.picture && <AvatarImage src={user.picture} alt={displayLabel} />}
              <AvatarFallback
                className={cn(
                  "text-[11px] font-semibold tracking-wide text-white",
                  isAdmin ? "bg-teal-700" : "bg-[#1B2B5B]",
                )}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline">
              {displayLabel}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">{displayLabel}</span>
            {isClinicUser && (
              <span className="text-xs text-muted-foreground font-normal">
                {roleLabel(clinicProfile?.role)}
              </span>
            )}
            {user.email && displayLabel !== user.email && (
              <span className="text-xs text-muted-foreground font-normal break-all">
                {user.email}
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
                <Icon name="user-cog" className="mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => logout()}
            className="cursor-pointer"
          >
            <Icon name="sign-out" className="mr-2" />
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
