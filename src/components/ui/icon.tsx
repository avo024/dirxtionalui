import * as React from "react";
import {
  ICON_ALIASES,
  resolveIconId,
  type IconConceptId,
  type LegacyIconName,
} from "@/lib/icon-aliases";
import { cn } from "@/lib/utils";
import sprite from "@/assets/icons.svg?raw";
import spriteExtra from "@/assets/icons-extra.svg?raw";

export type IconName = IconConceptId | LegacyIconName;

export interface IconProps
  extends Omit<React.SVGAttributes<SVGSVGElement>, "width" | "height" | "name"> {
  /** Concept id ("prior-auth") or legacy Lucide name ("ShieldCheck"). */
  name: IconName | (string & {});
  size?: 14 | 16 | 20 | 24;
  className?: string;
  strokeWidth?: number;
  /** When set the icon is announced (role="img"); otherwise it is aria-hidden. */
  title?: string;
}

/**
 * The glyph sheet is inlined once (display:none) so `<use href="#id">` resolves
 * in every build (prod, demo with base "./", file previews) without an extra request.
 */
export function IconSprite() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      dangerouslySetInnerHTML={{ __html: sprite + spriteExtra }}
    />
  );
}

/**
 * Single entry point for icons: Dirxctional's own 1.75-stroke set, sizes
 * 14/16/20/24, `aria-hidden` unless a `title` is given.
 */
export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.75,
  title,
  ...rest
}: IconProps) {
  const id = resolveIconId(name) ?? "box";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      data-icon={id}
      className={cn("shrink-0", id === "spinner" && "animate-spin", className)}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <use href={`#${id}`} />
    </svg>
  );
}

export { ICON_ALIASES };
