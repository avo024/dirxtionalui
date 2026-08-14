import { formatDistanceToNow, format } from "date-fns";

/**
 * Parse a date string SAFELY for display:
 * - Date-only strings ("2030-08-30", e.g. pa_expiration_date, patient_dob)
 *   are parsed as LOCAL time. `new Date("2030-08-30")` is UTC midnight, which
 *   renders as Aug 29 in US timezones — the classic off-by-one-day bug.
 * - Full timestamps pass through to `new Date` unchanged.
 */
export function parseLocalDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(dateStr);
}

/** Today's date as yyyy-mm-dd in LOCAL time (toISOString flips to tomorrow
 *  after ~6-7 PM US time — never use it for date-only fields). */
export function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
    return format(parseLocalDate(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseLocalDate(dateStr), "MMM d, yyyy 'at' h:mm a");
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
    const date = parseLocalDate(dateStr);
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
