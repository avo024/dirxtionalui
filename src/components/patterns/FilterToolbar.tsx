import type { ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  /** Count shown as a small destructive "n!" chip instead of the plain count. */
  alert?: number;
}

interface SelectSpec {
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
  width?: string;
}

interface FilterToolbarProps {
  filters?: FilterOption[];
  active?: string;
  onFilter?: (value: string) => void;
  search?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
  selects?: SelectSpec[];
  trailing?: ReactNode;
  className?: string;
}

/**
 * Toolbar row above a queue/list: segmented filter buttons with counts,
 * search, plain <select> dropdowns styled to match shadcn's Select trigger,
 * and a trailing slot for a page-specific action.
 */
export function FilterToolbar({
  filters,
  active,
  onFilter,
  search,
  onSearch,
  searchPlaceholder = "Search…",
  selects,
  trailing,
  className,
}: FilterToolbarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {filters && filters.length > 0 && (
        <div className="inline-flex items-center rounded-md border border-border bg-card p-0.5">
          {filters.map((f) => {
            const isActive = f.value === active;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => onFilter?.(f.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[calc(var(--radius)-4px)] px-3 h-[var(--density-control-h-xs)] text-sm font-medium transition-colors",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {f.label}
                {typeof f.alert === "number" && f.alert > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-destructive text-destructive-foreground px-1.5 text-[11px] font-bold">
                    {f.alert}!
                  </span>
                ) : typeof f.count === "number" ? (
                  <span className={cn("text-[11px] font-bold", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                    {f.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {onSearch && (
        <div className="relative w-[280px]">
          <Search width={16} height={16} strokeWidth={1.75} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-8"
          />
        </div>
      )}

      {selects?.map((s, i) => (
        <div key={i} className="relative" style={s.width ? { width: s.width } : undefined}>
          <select
            value={s.value}
            onChange={(e) => s.onChange?.(e.target.value)}
            className="h-9 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {s.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <ChevronDown width={16} height={16} strokeWidth={1.75} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-50" aria-hidden="true" />
        </div>
      ))}

      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}
