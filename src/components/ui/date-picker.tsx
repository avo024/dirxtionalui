"use client";

import * as React from "react";
import { format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export interface DatePickerProps {
  /** Accepts a Date, a "YYYY-MM-DD" string (the `<input type="date">`
   *  convention nearly every call site already stores), or null/undefined. */
  value?: Date | string | null;
  /** Always emits "YYYY-MM-DD", or null when cleared. */
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  disabledDays?: React.ComponentProps<typeof Calendar>["disabled"];
  /** Shows a "Clear" footer action. Default true — native date inputs are
   *  always clearable too. */
  clearable?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  autoFocus?: boolean;
}

/**
 * Parse a value that may already be a Date, or a date-only "YYYY-MM-DD"
 * string. Date-only strings are parsed via `parseISO` (local time), never
 * `new Date(str)`/`toISOString()` — those shift by the viewer's timezone
 * offset and are the classic off-by-one-day bug (see src/lib/dateUtils.ts
 * `parseLocalDate`, which this mirrors).
 */
function toDate(value?: Date | string | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? parseISO(trimmed) : new Date(trimmed);
  return isValid(parsed) ? parsed : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  fromYear = 1920,
  toYear = new Date().getFullYear() + 5,
  disabledDays,
  clearable = true,
  className,
  id,
  autoFocus,
  ...rest
}: DatePickerProps) {
  const ariaInvalid = rest["aria-invalid"];
  const [open, setOpen] = React.useState(false);
  const date = toDate(value);

  const commit = (d: Date | undefined) => {
    onChange(d ? format(d, "yyyy-MM-dd") : null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={(next) => setOpen(disabled ? false : next)}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={ariaInvalid}
          className={cn("w-full justify-start text-left font-normal h-10", !date && "text-muted-foreground", className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate">{date ? format(date, "MMM d, yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={commit}
          defaultMonth={date}
          captionLayout="dropdown-buttons"
          fromYear={fromYear}
          toYear={toYear}
          disabled={disabledDays}
          initialFocus
        />
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => commit(new Date())}>
            Today
          </Button>
          {clearable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => commit(undefined)}
            >
              Clear
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
