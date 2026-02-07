import { Check, AlertTriangle, AlertCircle } from "lucide-react";
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
            <Check className="h-4 w-4" />
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
            <AlertTriangle className="h-4 w-4" />
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
          <AlertCircle className="h-4 w-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>Low confidence: {percentage}% — Manual review required</TooltipContent>
    </Tooltip>
  );
}
