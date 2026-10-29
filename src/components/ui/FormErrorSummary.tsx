import { focusFirstError } from "@/lib/formErrors";

interface FormErrorSummaryProps {
  errors: Record<string, string | undefined>;
  labels: Record<string, string>;
  title?: string;
  order?: string[];
}

/** Prominent, assertive box listing everything that blocks submit. Each line jumps to its field. */
export function FormErrorSummary({
  errors,
  labels,
  title = "Fix these to continue",
  order,
}: FormErrorSummaryProps) {
  const keys = [...(order ?? []), ...Object.keys(errors)].filter(
    (k, i, arr) => !!errors[k] && arr.indexOf(k) === i,
  );
  if (keys.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-md border border-destructive border-l-4 bg-destructive/10 p-4"
    >
      <p className="font-editorial text-base font-medium text-destructive">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {keys.map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => focusFirstError({ [k]: errors[k] })}
              className="w-full text-left text-sm text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:underline"
            >
              <span className="font-semibold">{labels[k] ?? k}:</span> {errors[k]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
