/** Small helpers shared by the workflow patterns in this folder. */

/** "Amanda Foster" -> "AF". Falls back gracefully for single-word names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Tailwind classes for the 3px urgency edge used on QueueRow. */
export function urgencyEdgeClass(urgency?: "overdue" | "attention"): string {
  if (urgency === "overdue") return "bg-destructive";
  if (urgency === "attention") return "bg-warning";
  return "bg-transparent";
}
