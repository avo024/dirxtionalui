import { Shield, AlertTriangle, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReferralPAStatus, ReferralPAInfo } from "@/data/mockData";

const paStatusConfig: Record<ReferralPAStatus, { label: string; className: string; icon: React.ElementType }> = {
  not_required: {
    label: "Not Required",
    className: "bg-muted text-muted-foreground",
    icon: Shield,
  },
  required_processing: {
    label: "Required - Processing",
    className: "bg-warning/10 text-warning",
    icon: Clock,
  },
  required_submitted: {
    label: "Required - Submitted",
    className: "bg-blue-500/10 text-blue-600",
    icon: Send,
  },
  required_approved: {
    label: "Required - Approved",
    className: "bg-status-approved-bg text-status-approved-fg",
    icon: CheckCircle,
  },
  required_denied: {
    label: "Required - Denied",
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
      {paInfo.reason && paInfo.status !== "not_required" && (
        <span className="text-[11px] text-muted-foreground pl-1">{paInfo.reason}</span>
      )}
    </div>
  );
}

/** Sort priority: processing first, denied, submitted, approved, not_required last */
export const paSortOrder: Record<ReferralPAStatus, number> = {
  required_processing: 0,
  required_denied: 1,
  required_submitted: 2,
  required_approved: 3,
  not_required: 4,
};
