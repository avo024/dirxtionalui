import { formatDistanceToNow, format } from "date-fns";

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function getRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function getFormattedDate(date: Date = new Date()): string {
  return format(date, "EEEE, MMMM d, yyyy");
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
}

/**
 * Compact, scannable date format intended for table cells.
 * - Same day → time only ("3:45 PM")
 * - Same calendar year → "MMM d" ("Apr 19")
 * - Older → "MMM d, yyyy" ("Apr 19, 2025")
 */
export function formatDateForTable(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const isSameDay =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    if (isSameDay) return format(date, "h:mm a");
    if (date.getFullYear() === now.getFullYear()) return format(date, "MMM d");
    return format(date, "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

/**
 * Full datetime suitable for hover tooltips on table cells.
 * Example: "Apr 19, 2026 at 3:45 PM"
 */
export function formatFullDateTime(dateStr: string): string {
  return formatDateTime(dateStr);
}
