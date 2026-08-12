import { cn } from "@/lib/utils";

const paStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "PA Pending", className: "bg-muted text-muted-foreground" },
  processing: { label: "PA In Progress", className: "bg-blue-500/10 text-blue-600" },
  submitted: { label: "PA Submitted", className: "bg-warning/10 text-warning" },
  approved: { label: "PA Approved", className: "bg-status-approved-bg text-status-approved-fg" },
  denied: { label: "PA Denied", className: "bg-destructive/10 text-destructive" },
  appeal: { label: "PA In Appeal", className: "bg-destructive/10 text-destructive" },
};

interface ClinicPABadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function ClinicPABadge({ status, className }: ClinicPABadgeProps) {
  if (!status) return null;
  const config = paStatusConfig[status];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
