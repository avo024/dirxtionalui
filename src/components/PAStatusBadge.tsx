import { HolderMark, type Holder } from "@/components/StatusBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseLocalDate } from "@/lib/dateUtils";

const paConfig: Record<string, { label: string; h: Holder }> = {
  active: { label: "PA Active", h: "dx" },
  expiring: { label: "PA Expiring Soon", h: "clinic" },
  expired: { label: "PA Expired", h: "clinic" },
  none: { label: "No PA", h: "done" },
  approved: { label: "PA Active", h: "dx" },
  pending: { label: "PA Pending", h: "dx" },
  denied: { label: "PA Denied", h: "dx" },
  appeal: { label: "PA In Appeal", h: "payer" },
};

interface PAStatusBadgeProps {
  status: string;
  expirationDate?: string;
  className?: string;
}

export function PAStatusBadge({ status, expirationDate, className }: PAStatusBadgeProps) {
  const config = paConfig[status];

  if (!config) {
    return <HolderMark h="done" label={status || "No PA"} className={className} />;
  }

  const tooltipText = expirationDate
    ? `${config.label} — Expires: ${parseLocalDate(expirationDate).toLocaleDateString()}`
    : config.label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <HolderMark h={config.h} label={config.label} className={className} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
