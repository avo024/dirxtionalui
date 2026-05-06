import * as LucideIcons from "lucide-react";
import { Box, type LucideIcon } from "lucide-react";

interface DynamicIconProps {
  name: string | null | undefined;
  className?: string;
}

export const DynamicIcon = ({ name, className }: DynamicIconProps) => {
  const Icon =
    (name && (LucideIcons as unknown as Record<string, LucideIcon>)[name]) ||
    Box;
  return <Icon className={className} />;
};
