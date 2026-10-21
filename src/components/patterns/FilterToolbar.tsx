import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import "@/lists.css";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  /** Count shown as a small destructive "n!" chip instead of the plain count. */
  alert?: number;
  /** Optional `data-tour` anchor for onboarding tours to target this specific chip. */
  dataTour?: string;
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
 * Toolbar row above a queue/list: pill filter tabs with counts,
 * search, Combobox dropdowns (size="toolbar"), and a trailing slot for a
 * page-specific action.
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
    <div className={cn("ft", className)}>
      {filters && filters.length > 0 && (
        <div className="ft-tabs">
          {filters.map((f) => {
            const isActive = f.value === active;
            return (
              <button
                key={f.value}
                type="button"
                className="ft-tab"
                aria-pressed={isActive}
                data-tour={f.dataTour}
                onClick={() => onFilter?.(f.value)}
              >
                {f.label}
                {typeof f.alert === "number" && f.alert > 0 ? (
                  <span className="al">{f.alert}!</span>
                ) : typeof f.count === "number" ? (
                  <span className="n">{f.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      {onSearch && (
        <div className="ft-search">
          <Icon name="search" size={16} />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="ft-in"
          />
        </div>
      )}

      {selects?.map((s, i) => (
        <div key={i} className="ft-sel" style={s.width ? { width: s.width } : undefined}>
          <Combobox
            options={s.options}
            value={s.value}
            onValueChange={(v) => s.onChange?.(v)}
            size="toolbar"
          />
        </div>
      ))}

      {trailing && <div className="ft-trail">{trailing}</div>}
    </div>
  );
}
