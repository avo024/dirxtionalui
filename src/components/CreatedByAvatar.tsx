import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CreatedByAvatarProps {
  name?: string | null;
  clinicName?: string | null;
  size?: "sm" | "md";
  /** Navy for clinic users (default), teal for admins. */
  tone?: "navy" | "teal";
}

export function getInitials(name?: string | null): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return "";
}

export function CreatedByAvatar({ name, clinicName, size = "sm", tone = "navy" }: CreatedByAvatarProps) {
  if (!name) {
    return <span className="text-muted-foreground/60 text-sm">—</span>;
  }
  const initials = getInitials(name);
  const tooltip = clinicName ? `Created by ${name} — ${clinicName}` : `Created by ${name}`;
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={dim}>
          <AvatarFallback className={`font-semibold text-[11px] tracking-wide text-white ${tone === "teal" ? "bg-teal-700" : "bg-[#1B2B5B]"}`}>
            {initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
