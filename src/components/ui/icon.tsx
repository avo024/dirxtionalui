import * as React from "react";
import * as lucide from "lucide-react";

/**
 * All lucide-react exports that render an SVG icon (i.e. every component,
 * excluding non-component helpers like `icons`, `createLucideIcon`, etc.).
 * We type-narrow to keys whose value looks like a React component.
 */
type LucideModule = typeof lucide;
export type IconName = {
  [K in keyof LucideModule]: LucideModule[K] extends React.ComponentType<any> ? K : never;
}[keyof LucideModule];

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "width" | "height"> {
  name: IconName;
  size?: 14 | 16 | 20;
  className?: string;
}

/**
 * Single entry point for lucide icons across the app: fixed stroke weight
 * (1.75), fixed size steps (14/16/20), and `aria-hidden` by default since
 * icons here are always paired with visible text. Use `ICONS` from
 * `@/lib/icons` for concept → icon lookups instead of importing lucide
 * components directly.
 */
export function Icon({ name, size = 16, className, ...rest }: IconProps) {
  const LucideIcon = lucide[name] as React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
  if (!LucideIcon) return null;
  return (
    <LucideIcon
      width={size}
      height={size}
      strokeWidth={1.75}
      aria-hidden="true"
      className={className}
      {...rest}
    />
  );
}
