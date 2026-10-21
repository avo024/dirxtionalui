import { cn } from "@/lib/utils";

/** Soft stone bar with a slow shimmer (see polish-v4.css .sk). Shape it with className. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("sk rounded-md", className)} aria-hidden="true" {...props} />;
}

export { Skeleton };
