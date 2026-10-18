import { cn } from "@/lib/utils";
import type { ReferralStatus } from "@/data/mockData";
import { statusLabels } from "@/data/mockData";

/**
 * Status language v3 (direction A — holder glyph). A small mark before the
 * label says who holds the referral: square = Dirxctional, diamond = payer,
 * ring = pharmacy, triangle = clinic, dash = finished. One hue per holder
 * (tokens --st-* in index.css). Needs Attention is the only filled (loud) mark.
 * Labels never change.
 */
export type Holder = "clinic" | "dx" | "payer" | "pharm" | "done";

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

const holderFor: Record<string, { h: Holder; loud?: boolean }> = {
  uploaded: { h: "dx" },
  processing: { h: "dx" },
  ready_for_review: { h: "dx" },
  approved: { h: "dx" },
  approved_to_send: { h: "dx" },
  sent_to_pharmacy: { h: "pharm" },
  rejected: { h: "clinic", loud: true },
  closed: { h: "done" },
};

export interface HolderMarkProps {
  h: Holder;
  label: React.ReactNode;
  variant?: "text" | "outline" | "soft";
  size?: "sm" | "md" | "lg";
  loud?: boolean;
  className?: string;
}

/** Raw holder mark — also used for labels outside the referral/PA sets. */
export function HolderMark({ h, label, variant = "text", size = "sm", loud, className }: HolderMarkProps) {
  return (
    <span
      className={cn("sx", className)}
      data-h={h}
      data-v={variant === "text" ? undefined : variant}
      data-size={size === "sm" ? "sm" : "lg"}
      data-loud={loud ? "" : undefined}
    >
      <span className="g" aria-hidden="true" />
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  status: ReferralStatus;
  size?: "sm" | "md" | "lg";
  /** Kept for API compatibility; the holder glyph replaces icons. */
  showIcon?: boolean;
  className?: string;
  /** "text" (default, table rows) · "outline" (page headers) · "soft" (clinic dashboard chips). */
  variant?: "text" | "outline" | "soft";
  context?: "clinic" | "admin";
}

export function StatusBadge({
  status,
  size = "sm",
  className,
  variant = "text",
  context = "clinic",
}: StatusBadgeProps) {
  const spec = holderFor[status];
  if (!spec) {
    return <HolderMark h="done" label={status} variant={variant} size={size} className={className} />;
  }
  const labels = context === "admin" ? adminLabels : statusLabels;
  return <HolderMark h={spec.h} loud={spec.loud} label={labels[status]} variant={variant} size={size} className={className} />;
}
