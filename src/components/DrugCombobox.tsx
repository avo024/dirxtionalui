import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DrugItem {
  drug_name: string;
  generic_name?: string;
  requires_pa?: boolean;
}

interface DrugComboboxProps {
  value: string;
  onChange: (drugName: string) => void;
  fetchDrugs: (q?: string) => Promise<{ items: DrugItem[] }>;
  placeholder?: string;
  className?: string;
}

export function DrugCombobox({
  value,
  onChange,
  fetchDrugs,
  placeholder = "Search drug...",
  className,
}: DrugComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [items, setItems] = useState<DrugItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLoading(true);
    const reqId = ++reqIdRef.current;
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetchDrugs(inputText.trim() || undefined);
        if (reqId === reqIdRef.current) {
          setItems(Array.isArray(res?.items) ? res.items : []);
        }
      } catch {
        if (reqId === reqIdRef.current) setItems([]);
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, open, fetchDrugs]);

  const handleSelect = (drugName: string) => {
    onChange(drugName);
    setOpen(false);
    setInputText("");
  };

  const trimmed = inputText.trim();
  const showFreeText =
    trimmed.length > 0 &&
    !items.some((i) => i.drug_name.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search..."
            value={inputText}
            onValueChange={setInputText}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching...
              </div>
            )}
            {!loading && items.length === 0 && !showFreeText && (
              <CommandEmpty>No drugs found.</CommandEmpty>
            )}
            {!loading && items.length > 0 && (
              <CommandGroup heading="Formulary">
                {items.map((item) => (
                  <CommandItem
                    key={`${item.drug_name}-${item.generic_name ?? ""}`}
                    value={item.drug_name}
                    onSelect={() => handleSelect(item.drug_name)}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === item.drug_name ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate">
                        <span className="font-medium">{item.drug_name}</span>
                        {item.generic_name && (
                          <span className="text-muted-foreground"> ({item.generic_name})</span>
                        )}
                      </span>
                    </div>
                    {item.requires_pa && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        PA Required
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {!loading && showFreeText && (
              <CommandGroup heading="Custom">
                <CommandItem value={`__free__${trimmed}`} onSelect={() => handleSelect(trimmed)}>
                  Use "{trimmed}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default DrugCombobox;
