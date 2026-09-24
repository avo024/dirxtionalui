import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/data/mockData";
import { statusLabels } from "@/data/mockData";
import { Upload, Loader2, CheckCircle, Send, XCircle } from "lucide-react";

// Clinic labels are the existing mockData.statusLabels, unchanged.
// Admin labels are a distinct, shorter vocabulary for the internal queue —
// intentionally not mockData.adminStatusLabels (that map predates this spec).
const adminLabels: Record<ReferralStatus, string> = {
  uploaded: "Uploaded",
  processing: "Processing",
  ready_for_review: "Needs review",
  approved: "Ready to send",
  approved_to_send: "Ready to send",
  sent_to_pharmacy: "Sent",
  rejected: "Rejected",
  closed: "Closed",
};

const statusStyles: Record<string, string> = {
  uploaded: "bg-status-uploaded-bg text-status-uploaded-fg",
  processing: "bg-status-processing-bg text-status-processing-fg",
  ready_for_review: "bg-status-review-bg text-status-review-fg",
  approved: "bg-status-approved-bg text-status-approved-fg",
  approved_to_send: "bg-status-approved-bg text-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-bg text-status-sent-fg",
  rejected: "bg-status-rejected-bg text-status-rejected-fg",
  closed: "bg-muted text-muted-foreground",
};

const dotStyles: Record<string, string> = {
  uploaded: "bg-status-uploaded-fg",
  processing: "bg-status-processing-fg",
  ready_for_review: "bg-status-review-fg",
  approved: "bg-status-approved-fg",
  approved_to_send: "bg-status-approved-fg",
  sent_to_pharmacy: "bg-status-sent-fg",
  rejected: "bg-status-rejected-fg",
  closed: "bg-muted-foreground",
};

const textFgStyles: Record<string, string> = {
  uploaded: "text-status-uploaded-fg",
  processing: "text-status-processing-fg",
  ready_for_review: "text-status-review-fg",
  approved: "text-status-approved-fg",
  approved_to_send: "text-status-approved-fg",
  sent_to_pharmacy: "text-status-sent-fg",
  rejected: "text-status-rejected-fg",
  closed: "text-muted-foreground",
};

const statusIcons: Record<string, React.ElementType> = {
  uploaded: Upload,
  processing: Loader2,
  ready_for_review: Loader2,
  approved: CheckCircle,
  approved_to_send: CheckCircle,
  sent_to_pharmacy: Send,
  rejected: XCircle,
  closed: XCircle,
};

interface StatusBadgeProps {
  status: ReferralStatus;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  /** Visual weight. "text" (default) = dot + plain label, no chrome.
   *  "outline" = 1px bordered pill. "soft" = today's tinted pill (unchanged
   *  look). Clinic pages keep passing no variant (or "soft") through Phase 5. */
  variant?: "text" | "outline" | "soft";
  context?: "clinic" | "admin";
}

export function StatusBadge({
  status,
  size = "sm",
  showIcon = false,
  className,
  variant = "text",
  context = "clinic",
}: StatusBadgeProps) {
  const Icon = statusIcons[status];
  const known = Boolean(statusStyles[status]);

  if (!known) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-xs bg-secondary text-muted-foreground",
          className,
        )}
      >
        {status}
      </span>
    );
  }

  const labels = context === "admin" ? adminLabels : statusLabels;
  const label = labels[status];

  const marker = showIcon ? (
    <Icon className={cn("h-3.5 w-3.5", textFgStyles[status])} />
  ) : (
    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", dotStyles[status])} />
  );

  if (variant === "soft") {
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
          className,
        )}
      >
        {marker}
        {label}
      </span>
    );
  }

  if (variant === "outline") {
    const sizeClasses = {
      sm: "px-2.5 py-0.5 text-xs gap-1.5",
      md: "px-3 py-1 text-sm gap-2",
      lg: "px-4 py-1.5 text-sm gap-2 font-semibold",
    };
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-transparent font-medium text-foreground",
          sizeClasses[size],
          className,
        )}
      >
        {marker}
        {label}
      </span>
    );
  }

  // variant === "text"
  const sizeClasses = {
    sm: "text-xs gap-1.5",
    md: "text-sm gap-2",
    lg: "text-sm gap-2 font-semibold",
  };
  return (
    <span className={cn("inline-flex items-center font-medium text-foreground", sizeClasses[size], className)}>
      {marker}
      {label}
    </span>
  );
}
