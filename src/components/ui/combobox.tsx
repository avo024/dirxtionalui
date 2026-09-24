"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export interface ComboboxOption {
  value: string;
  label: string;
  /** Small right-aligned muted hint (fax number, price, etc). */
  hint?: string;
}

export type ComboboxOptionInput = string | ComboboxOption;

export interface ComboboxProps {
  options: ComboboxOptionInput[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "toolbar";
  /** Shows an inline X to clear the current value. Default false. */
  clearable?: boolean;
  /** Shows the search input. Defaults to `options.length > 7`. */
  searchable?: boolean;
  align?: "start" | "center" | "end";
  "aria-invalid"?: boolean;
  id?: string;
}

function normalizeOptions(options: ComboboxOptionInput[]): ComboboxOption[] {
  return options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

/**
 * Radix Popover + cmdk Command combobox — the Radix-flavour shadcn combobox
 * recipe (this repo doesn't have the Base UI combobox's dependency, only
 * Radix Popover/Select + cmdk). Swaps in for both native `<select>` and
 * Radix `<Select>` usages; `value`/`onValueChange` map 1:1 to `Select`'s.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  disabled,
  className,
  size = "default",
  clearable = false,
  searchable,
  align = "start",
  id,
  ...rest
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const commandRef = React.useRef<React.ElementRef<typeof Command>>(null);
  const ariaInvalid = rest["aria-invalid"];

  const normalized = React.useMemo(() => normalizeOptions(options), [options]);
  const isSearchable = searchable ?? normalized.length > 7;
  const selected = normalized.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={(next) => setOpen(disabled ? false : next)}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            size === "default" ? "h-10" : "h-9",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && (
              <span
                role="button"
                aria-label="Clear"
                tabIndex={-1}
                className="rounded-sm p-0.5 opacity-60 hover:bg-muted hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onValueChange("");
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-max min-w-[--radix-popover-trigger-width] max-w-[min(28rem,90vw)] p-0"
        onOpenAutoFocus={(e) => {
          // Without a CommandInput, nothing inside the popover is focusable
          // by default — focus the Command root so cmdk's own keyboard
          // handling (arrows/Home/End/Enter) works immediately.
          if (!isSearchable) {
            e.preventDefault();
            commandRef.current?.focus();
          }
        }}
      >
        <Command ref={commandRef}>
          {isSearchable && <CommandInput placeholder={searchPlaceholder} />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {normalized.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={`${opt.label} ${opt.value}`}
                  onSelect={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4 shrink-0 self-start mt-0.5", opt.value === value ? "opacity-100" : "opacity-0")} />
                  {opt.hint && opt.hint.length > 24 ? (
                    // Long hints (e.g. role descriptions) stack under the label and wrap
                    // instead of being cut off by the popover edge.
                    <span className="flex min-w-0 flex-col">
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground whitespace-normal leading-snug">{opt.hint}</span>
                    </span>
                  ) : (
                    <>
                      <span className="truncate">{opt.label}</span>
                      {opt.hint && <span className="ml-auto pl-2 text-xs text-muted-foreground shrink-0">{opt.hint}</span>}
                    </>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
