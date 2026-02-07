import { Shield, AlertTriangle, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { PAStatus } from "@/data/mockData";

const paConfig: Record<PAStatus, { label: string; className: string; icon: React.ElementType }> = {
  active: { label: "PA Active", className: "bg-success/10 text-success", icon: Shield },
  expiring: { label: "PA Expiring Soon", className: "bg-warning/10 text-warning", icon: AlertTriangle },
  expired: { label: "PA Expired", className: "bg-destructive/10 text-destructive", icon: XCircle },
  none: { label: "No PA", className: "bg-muted text-muted-foreground", icon: Shield },
};

interface PAStatusBadgeProps {
  status: PAStatus;
  expirationDate?: string;
  className?: string;
}

export function PAStatusBadge({ status, expirationDate, className }: PAStatusBadgeProps) {
  const config = paConfig[status];
  const Icon = config.icon;

  const tooltipText = expirationDate
    ? `${config.label} — Expires: ${new Date(expirationDate).toLocaleDateString()}`
    : config.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            config.className,
            className
          )}
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
