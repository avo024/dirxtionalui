import type { IconConceptId } from "@/lib/icon-aliases";

/**
 * Domain concept -> glyph id in the Dirxctional icon set. Use this instead of
 * hard-coding glyph ids so the same concept always renders the same glyph
 * across clinic and admin surfaces. Render with `<Icon name={ICONS.referral} />`
 * from `@/components/ui/icon`.
 */
export const ICONS = {
  referral: "document",
  patient: "patient",
  clinic: "clinic",
  pharmacy: "pharmacy",
  drug: "medication",
  prescriber: "prescriber",
  insurance: "insurance",
  priorAuth: "prior-auth",
  appeal: "appeal",
  enrollment: "clipboard-check",
  bridge: "bolt",
  task: "clipboard-list",
  note: "message",
  document: "document",
  fax: "print",
  sent: "send",
  approve: "check-circle",
  reject: "x-circle",
  due: "clock",
  overdue: "alert-triangle",
  waiting: "hourglass",
  archive: "archive",
  search: "search",
  more: "menu-more",
  pin: "pin",
  attach: "attach",
  upload: "upload",
  download: "download",
  edit: "edit",
  settings: "settings",
  support: "support",
  insights: "chart",
  aiQuality: "sparkles",
} as const satisfies Record<string, IconConceptId>;

export type IconConcept = keyof typeof ICONS;
