import { useState } from "react";
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
  const { user, logout } = useAuth();
  const { data: clinicProfile } = useProfile();
  const { data: adminProfile } = useAdminProfile();
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  if (!user) return null;

  const isClinicUser = user.role === "clinic_user";
  const isAdmin = user.role === "internal_admin";

  // Pick the right profile based on role; each hook only fires for its role.
  const activeProfile = isClinicUser ? clinicProfile : isAdmin ? adminProfile : null;
  const fullName =
    activeProfile?.first_name && activeProfile?.last_name
      ? `${activeProfile.first_name} ${activeProfile.last_name}`
      : null;

  // Display label: name when available; email/auth name fallback.
  const displayLabel = fullName ?? user.name ?? user.email ?? "Account";

  // Avatar initials: profile first+last; otherwise name/email fallback.
  const initials =
    activeProfile?.first_name && activeProfile?.last_name
      ? `${activeProfile.first_name[0]}${activeProfile.last_name[0]}`.toUpperCase()
      : (user.name || user.email || "U")
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
              {user.picture && <AvatarImage src={user.picture} alt={displayLabel} />}
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
            {user.email && displayLabel !== user.email && (
              <span className="text-xs text-muted-foreground font-normal">
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
                <UserCog className="h-4 w-4 mr-2" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => logout()}
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
