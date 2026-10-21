import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading shapes that match the patterns they become (ListRow / TodayStrip /
 * DefinitionList / card grids), so content replaces them without a layout jump.
 * The page shell (sidebar + title) renders first; these fill only the content area.
 */

function Busy({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="status" aria-busy="true" className={className} {...rest}>
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}

interface ListRowsSkeletonProps {
  rows?: number;
  /** Render the 38px column-heading strip (default true, like ListRows with a head). */
  head?: boolean;
  className?: string;
}

/** 56px rows: 24px square + two lines, a status chip, a date, a chevron slot. */
export function ListRowsSkeleton({ rows = 5, head = true, className }: ListRowsSkeletonProps) {
  return (
    <Busy className={cn("lr-list", className)}>
      {head && (
        <div className="sk-head">
          <Skeleton className="h-3 w-24" />
        </div>
      )}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk-lr">
          <Skeleton className="h-6 w-6 rounded-[6px]" />
          <div className="two">
            <Skeleton className="h-3.5" style={{ width: `${58 + ((i * 13) % 30)}%` }} />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="hide-sm h-5 w-24 rounded" />
          <Skeleton className="hide-sm h-3 w-16 justify-self-end" />
          <span className="hide-sm" />
        </div>
      ))}
    </Busy>
  );
}

/** The dashboard's "Today" card: three lines of label | sentence | link. */
export function TodayStripSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Busy className={cn("ts", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="sk-ts-row">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5" style={{ width: `${70 - i * 14}%` }} />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </Busy>
  );
}

/** Card of label/value pairs, like DefinitionList. */
export function DefinitionListSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <Busy className={cn("bg-card border border-border rounded-lg p-[var(--density-card-pad)]", className)}>
      <Skeleton className="h-4 w-32 mb-4" />
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="sk-dl-row">
            <Skeleton className="h-3" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <Skeleton className="h-3.5" style={{ width: `${40 + ((i * 23) % 45)}%` }} />
          </div>
        ))}
      </div>
    </Busy>
  );
}

/** Grid of summary cards (Insights tiles, queue cards). */
export function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <Busy className={cn("sk-grid", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-3.5 flex flex-col gap-2.5">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-3 w-3/5" />
        </div>
      ))}
    </Busy>
  );
}
