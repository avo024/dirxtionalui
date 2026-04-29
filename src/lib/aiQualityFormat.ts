import type { AIQualityCorrection } from "@/lib/aiQualityApi";

/**
 * Defensive renderer for AI-extracted field values.
 * Values from the extraction API can be strings, numbers, booleans, arrays,
 * or arrays of objects (e.g. ICD-10 `{code, description}`). Always run any
 * value through this before putting it in JSX to avoid React error #31.
 */
export function renderFieldValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return v
      .map((item) => {
        if (item === null || item === undefined) return "—";
        if (typeof item === "string" || typeof item === "number") return String(item);
        if (typeof item === "object" && "code" in (item as object)) {
          const obj = item as { code: unknown; description?: unknown };
          return obj.description
            ? `${String(obj.code)} (${String(obj.description)})`
            : String(obj.code);
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function formatChangeArrow(c: AIQualityCorrection): string {
  if (c.change_type === "added") return `(added ${renderFieldValue(c.final_value)})`;
  if (c.change_type === "cleared") return `(cleared ${renderFieldValue(c.model_value)})`;
  return `${renderFieldValue(c.model_value)} → ${renderFieldValue(c.final_value)}`;
}
