import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface CreatedByAvatarProps {
  name?: string | null;
  clinicName?: string | null;
  size?: "sm" | "md";
}

export function getInitials(name?: string | null): string {
  if (!name) return "";
  const words = name.trim().split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return "";
}

export function CreatedByAvatar({ name, clinicName, size = "sm" }: CreatedByAvatarProps) {
  if (!name) {
    return <span className="text-muted-foreground/60 text-sm">—</span>;
  }
  const initials = getInitials(name);
  const tooltip = clinicName ? `Created by ${name} — ${clinicName}` : `Created by ${name}`;
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Avatar className={`${dim} bg-primary/10 ring-1 ring-primary/20`}>
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
