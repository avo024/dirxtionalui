import { cn } from "@/lib/utils";

interface StageChipProps {
  label: string;
  /** Visual weight, same three levels as StatusBadge. */
  variant?: "text" | "outline" | "soft";
  /** Neutral stone by default; "teal" flags the enrollment track, "warning"
   *  flags an active interrupt (flow-script §5). */
  tone?: "teal" | "warning";
  size?: "sm" | "md";
  className?: string;
}

/**
 * Small chip for a referral's workflow stage (as distinct from its status —
 * StatusBadge shows status, StageChip shows where in the flow the referral
 * currently sits, e.g. "PA submitted", "Review", "Enrollment").
 */
export function StageChip({ label, variant = "text", tone, size = "sm", className }: StageChipProps) {
  const dotClass = tone === "teal" ? "bg-teal-500" : tone === "warning" ? "bg-warning" : "bg-stone-400";
  const textClass = tone === "teal" ? "text-teal-700" : tone === "warning" ? "text-[#B45309]" : "text-muted-foreground";

  const sizeClasses = {
    sm: "text-xs gap-1.5",
    md: "text-sm gap-2",
  };
  const pillSizeClasses = {
    sm: "px-2.5 py-0.5 text-xs gap-1.5",
    md: "px-3 py-1 text-sm gap-2",
  };

  const dot = <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotClass)} />;

  if (variant === "soft") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium",
          tone === "teal" ? "bg-teal-50 text-teal-700" : "bg-muted text-muted-foreground",
          pillSizeClasses[size],
          className,
        )}
      >
        {dot}
        {label}
      </span>
    );
  }

  if (variant === "outline") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border bg-transparent font-medium",
          tone === "warning" ? "border-warning/40 text-[#B45309]" : "border-border text-foreground",
          pillSizeClasses[size],
          className,
        )}
      >
        {dot}
        {label}
      </span>
    );
  }

  // variant === "text"
  return (
    <span className={cn("inline-flex items-center font-medium", textClass, sizeClasses[size], className)}>
      {dot}
      {label}
    </span>
  );
}
