/** Shared helpers so every form tells the user exactly what is wrong and brings them to it. */

const FOCUSABLE = "input, select, textarea, button, [tabindex]:not([tabindex='-1'])";

function findField(key: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const esc = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(key) : key;
  return (
    document.querySelector<HTMLElement>(`[data-field="${key}"]`) ??
    document.querySelector<HTMLElement>(`#${esc}`)
  );
}

export function focusFirstError(
  errors: Record<string, string | undefined>,
  order?: string[],
): void {
  if (typeof document === "undefined") return;
  const keys = order ? [...order, ...Object.keys(errors)] : Object.keys(errors);
  const key = keys.find((k) => !!errors[k]);
  if (!key) return;
  const el = findField(key);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  const isFocusable = el.matches(FOCUSABLE) && !el.matches("div, section, fieldset");
  const target = isFocusable ? el : el.querySelector<HTMLElement>(FOCUSABLE);
  (target ?? el).focus({ preventScroll: true });
}

export function passwordHints(pw: string): string[] {
  const hints: string[] = [];
  if (pw.length < 12) {
    const n = 12 - pw.length;
    hints.push(`Add ${n} more character${n === 1 ? "" : "s"} (needs 12, has ${pw.length})`);
  }
  if (!/[A-Z]/.test(pw)) hints.push("Add an uppercase letter");
  if (!/[a-z]/.test(pw)) hints.push("Add a lowercase letter");
  if (!/\d/.test(pw)) hints.push("Add a number");
  if (!/[^A-Za-z0-9]/.test(pw)) hints.push("Add a symbol such as ! or #");
  return hints;
}
