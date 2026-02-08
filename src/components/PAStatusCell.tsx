import { Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferralPAStatus, ReferralPAInfo } from "@/data/mockData";

const paStatusConfig: Record<ReferralPAStatus, { label: string; className: string; icon: React.ElementType }> = {
  no_pa: {
    label: "No PA",
    className: "bg-status-approved-bg text-status-approved-fg",
    icon: Shield,
  },
  pa_required: {
    label: "PA Required",
    className: "bg-warning/10 text-warning",
    icon: AlertTriangle,
  },
  pa_approved: {
    label: "PA Approved",
    className: "bg-status-approved-bg text-status-approved-fg",
    icon: CheckCircle,
  },
  pa_expired: {
    label: "PA Expired",
    className: "bg-destructive/10 text-destructive",
    icon: XCircle,
  },
};

interface PAStatusCellProps {
  paInfo: ReferralPAInfo;
}

export function PAStatusCell({ paInfo }: PAStatusCellProps) {
  const config = paStatusConfig[paInfo.status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium w-fit",
          config.className
        )}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </span>
      <span className="text-[11px] text-muted-foreground pl-1">{paInfo.reason}</span>
    </div>
  );
}

/** Sort priority: pa_required first, pa_expired, pa_approved, no_pa last */
export const paSortOrder: Record<ReferralPAStatus, number> = {
  pa_required: 0,
  pa_expired: 1,
  pa_approved: 2,
  no_pa: 3,
};
