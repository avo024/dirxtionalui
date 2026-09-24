import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Fade-and-rise entrance animation, matching the retired `rw-fade`
   * keyframe (UI v2 phase 6b). Defaults to true; pass `false` for loading /
   * empty states that shouldn't animate in on every re-render.
   */
  fade?: boolean;
}

/**
 * Standard top-level page wrapper. Replaces the legacy `rw-page` / `rw-fade`
 * bespoke CSS classes (deleted from `wizard.css` in UI v2 phase 6b) with a
 * plain component plus Tailwind's `animate-in fade-in` (tailwindcss-animate).
 * Intentionally unopinionated about max-width/padding — pass those via
 * `className` per page, same as before.
 */
export function PageContainer({ fade = true, className, children, ...props }: PageContainerProps) {
  return (
    <div
      className={cn(fade && "animate-in fade-in slide-in-from-bottom-1 duration-300", className)}
      {...props}
    >
      {children}
    </div>
  );
}
