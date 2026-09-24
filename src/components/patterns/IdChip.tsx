import { cn } from "@/lib/utils";

interface IdChipProps {
  id: string;
  className?: string;
}

/**
 * Short id chip for tables and detail headers that otherwise show a full
 * UUID — first 8 chars, mono, uppercase, full id on hover/title
 * (Alex, phase 6a live-walk fix).
 */
export function IdChip({ id, className }: IdChipProps) {
  const short = (id || "").slice(0, 8).toUpperCase();
  return (
    <span
      title={id}
      className={cn(
        "inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-muted-foreground",
        className,
      )}
    >
      {short || "—"}
    </span>
  );
}
