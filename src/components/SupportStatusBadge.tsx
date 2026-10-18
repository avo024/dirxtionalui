import { Icon } from "@/components/ui/icon";

// Status pill for clinic support cases: open -> in_progress -> resolved.
const MAP: Record<string, { label: string; bg: string; fg: string; icon: string }> = {
  open: {
    label: "Open",
    bg: "color-mix(in srgb, var(--color-warning, #d97706) 15%, transparent)",
    fg: "#92610B",
    icon: "circle-dot",
  },
  in_progress: {
    label: "In progress",
    bg: "var(--color-teal-50)",
    fg: "var(--color-teal-700)",
    icon: "clock",
  },
  resolved: {
    label: "Resolved",
    bg: "color-mix(in srgb, var(--status-approved-fg, #16a34a) 14%, transparent)",
    fg: "var(--status-approved-fg, #16a34a)",
    icon: "check-circle",
  },
};

export function SupportStatusBadge({ status }: { status: string }) {
  const s = MAP[status] || MAP.open;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: "var(--text-xs)", fontWeight: 600, padding: "2px 9px",
        borderRadius: 9999, background: s.bg, color: s.fg, whiteSpace: "nowrap",
      }}
    >
      <Icon name={s.icon} size={14} />{s.label}
    </span>
  );
}
