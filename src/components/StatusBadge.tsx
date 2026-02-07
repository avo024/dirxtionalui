import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/data/mockData";
import { statusLabels } from "@/data/mockData";

const statusStyles: Record<ReferralStatus, string> = {
  uploaded: "bg-status-uploaded-bg text-status-uploaded-fg",
  processing: "bg-status-processing-bg text-status-processing-fg",
  ready_for_review: "bg-status-review-bg text-status-review-fg",
  approved_to_send: "bg-status-approved-bg text-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-bg text-status-sent-fg",
  rejected: "bg-status-rejected-bg text-status-rejected-fg",
};

const dotStyles: Record<ReferralStatus, string> = {
  uploaded: "bg-status-uploaded-fg",
  processing: "bg-status-processing-fg",
  ready_for_review: "bg-status-review-fg",
  approved_to_send: "bg-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-fg",
  rejected: "bg-status-rejected-fg",
};

interface StatusBadgeProps {
  status: ReferralStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[status])} />
      {statusLabels[status]}
    </span>
  );
}
