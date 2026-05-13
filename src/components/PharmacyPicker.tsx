import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Phone, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Pharmacy {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  fax?: string | null;
  alt_phone_fax?: string | null;
  email?: string | null;
  accepts_no_insurance?: boolean;
}

interface PharmacyPickerProps {
  pharmacies: Pharmacy[];
  selectedId: string | null;
  defaultId: string | null;
  onSelect: (id: string) => void;
}

export function PharmacyPicker({ pharmacies, selectedId, defaultId, onSelect }: PharmacyPickerProps) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => pharmacies.find((p) => p.id === selectedId) || null,
    [pharmacies, selectedId],
  );

  // Sort: default first, then alphabetical
  const sorted = useMemo(() => {
    return [...pharmacies].sort((a, b) => {
      if (a.id === defaultId) return -1;
      if (b.id === defaultId) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [pharmacies, defaultId]);

  const cityState = (p: Pharmacy) => [p.city, p.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Pharmacy</label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between font-normal h-auto py-2.5",
                !selected && "text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="truncate">
                  {selected ? selected.name : "Select a pharmacy..."}
                </span>
                {selected && selected.id === defaultId && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">Default</Badge>
                )}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name, city, or state..." />
              <CommandList>
                <CommandEmpty>No pharmacy found.</CommandEmpty>
                <CommandGroup>
                  {sorted.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${cityState(p)}`.trim()}
                      onSelect={() => {
                        onSelect(p.id);
                        setOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedId === p.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="font-medium truncate">{p.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected details */}
      {selected ? (
        <div className="rounded-xl border-2 border-primary/30 bg-primary/[0.04] p-4">
          <p className="font-semibold text-foreground text-base">{selected.name}</p>
          <div className="mt-2 space-y-1 text-sm">
            {selected.fax && (
              <div className="flex items-center gap-2 text-foreground">
                <Printer className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Fax: {selected.fax}</span>
              </div>
            )}
            {selected.phone && (
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span>Phone: {selected.phone}</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">Select a pharmacy to see its contact details.</p>
        </div>
      )}
    </div>
  );
}

export default PharmacyPicker;
