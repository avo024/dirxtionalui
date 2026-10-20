import { HolderMark, type Holder } from "@/components/StatusBadge";

const paStatusConfig: Record<string, { label: string; h: Holder }> = {
  pending: { label: "PA Pending", h: "dx" },
  processing: { label: "PA In Progress", h: "dx" },
  submitted: { label: "PA Submitted", h: "payer" },
  approved: { label: "PA Approved", h: "dx" },
  denied: { label: "PA Denied", h: "dx" },
  appeal: { label: "PA In Appeal", h: "payer" },
};

interface ClinicPABadgeProps {
  status: string | null | undefined;
  /** referral.appeal_outcome — refines a denied PA's label ("PA Level 2" /
   *  "PA Denied — Final") so the badge tells the real situation at a glance. */
  appealOutcome?: string | null;
  className?: string;
}

export function ClinicPABadge({ status, appealOutcome, className }: ClinicPABadgeProps) {
  if (!status) return null;
  let config = paStatusConfig[status];
  if (status === "denied" && appealOutcome === "level2") {
    config = { label: "PA Level 2", h: "payer" };
  } else if (status === "denied" && appealOutcome === "final") {
    config = { label: "PA Final", h: "done" };
  }
  if (!config) return null;
  return <HolderMark h={config.h} label={config.label} className={className} />;
}
