import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/data/mockData";
import { statusLabels, adminStatusLabels } from "@/data/mockData";
import { Upload, Loader2, CheckCircle, Send, XCircle } from "lucide-react";

const statusStyles: Record<ReferralStatus, string> = {
  uploaded: "bg-status-uploaded-bg text-status-uploaded-fg",
  processing: "bg-status-processing-bg text-status-processing-fg",
  approved: "bg-status-approved-bg text-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-bg text-status-sent-fg",
  rejected: "bg-status-rejected-bg text-status-rejected-fg",
};

const dotStyles: Record<ReferralStatus, string> = {
  uploaded: "bg-status-uploaded-fg",
  processing: "bg-status-processing-fg",
  approved: "bg-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-fg",
  rejected: "bg-status-rejected-fg",
};

const statusIcons: Record<ReferralStatus, React.ElementType> = {
  uploaded: Upload,
  processing: Loader2,
  approved: CheckCircle,
  sent_to_pharmacy: Send,
  rejected: XCircle,
};

interface StatusBadgeProps {
  status: ReferralStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  context?: "clinic" | "admin";
}

export function StatusBadge({ status, size = "sm", showIcon = false, className, context = "clinic" }: StatusBadgeProps) {
  const Icon = statusIcons[status];
  const isProcessing = status === "processing";
  const labels = context === "admin" ? adminStatusLabels : statusLabels;

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs gap-1.5",
    md: "px-3 py-1 text-sm gap-2",
    lg: "px-4 py-1.5 text-sm gap-2 font-semibold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        statusStyles[status],
        sizeClasses[size],
        className
      )}
    >
      {showIcon ? (
        <Icon className={cn("h-3.5 w-3.5", isProcessing && "animate-spin")} />
      ) : (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dotStyles[status],
            isProcessing && "animate-pulse"
          )}
        />
      )}
      {labels[status]}
    </span>
  );
}
