import { HolderMark, type Holder } from "@/components/StatusBadge";

interface StageChipProps {
  label: string;
  /** Visual weight, same three levels as StatusBadge. */
  variant?: "text" | "outline" | "soft";
  /** Kept for API compatibility. Hue now comes from the stage's holder; chips are never loud. */
  tone?: "teal" | "warning";
  size?: "sm" | "md";
  className?: string;
}

// Who holds the referral at each stage.
const STAGE_H: Record<string, Holder> = {
  Processing: "dx",
  Review: "dx",
  "PA pending": "dx",
  "PA approved": "dx",
  "PA denied": "dx",
  "Ready to send": "dx",
  Appeal: "payer",
  "PA submitted": "payer",
  "Level 2": "clinic",
  Enrollment: "clinic",
  Rejected: "clinic",
  Sent: "pharm",
  Closed: "done",
};

/**
 * Small chip for a referral's workflow stage (as distinct from its status —
 * StatusBadge shows status, StageChip shows where in the flow the referral
 * currently sits, e.g. "PA submitted", "Review", "Enrollment").
 */
export function StageChip({ label, variant = "text", size = "sm", className }: StageChipProps) {
  return <HolderMark h={STAGE_H[label] ?? "dx"} label={label} variant={variant} size={size} className={className} />;
}
