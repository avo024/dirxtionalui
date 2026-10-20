import { Icon } from "@/components/ui/icon";

interface DynamicIconProps {
  name: string | null | undefined;
  className?: string;
}

/** Renders an add-on icon whose name comes from the DB (concept id or legacy Lucide name); unknown names fall back to a box. */
export const DynamicIcon = ({ name, className }: DynamicIconProps) => (
  <Icon name={name || "Box"} size={className?.includes("h-5") ? 20 : 16} className={className?.replace(/\b(?:h|w)-\d+(?:\.\d+)?\b/g, "").trim() || undefined} />
);
