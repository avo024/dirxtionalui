import { Icon } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  confidence: number;
  className?: string;
}

export function ConfidenceIndicator({ confidence, className }: ConfidenceIndicatorProps) {
  const percentage = Math.round(confidence * 100);

  if (confidence >= 0.85) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center text-success", className)}>
            <Icon name="check" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Confidence: {percentage}%</TooltipContent>
      </Tooltip>
    );
  }

  if (confidence >= 0.5) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex items-center text-warning", className)}>
            <Icon name="alert-triangle" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Confidence: {percentage}% — Please verify</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center text-destructive", className)}>
          <Icon name="alert-circle" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Low confidence: {percentage}% — Manual review required</TooltipContent>
    </Tooltip>
  );
}
