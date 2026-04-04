import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

function getDisplayText(item: any): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    if (item.code && item.description) return `${item.code} - ${item.description}`;
    if (item.code) return item.code;
    if (item.name) return item.name;
  }
  return String(item);
}

interface TagListEditorProps {
  label: string;
  items: any[];
  onChange: (items: any[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagListEditor({ label, items, onChange, placeholder = "Add item...", className }: TagListEditorProps) {
  const [inputValue, setInputValue] = useState("");

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.some((item) => getDisplayText(item) === trimmed)) {
      onChange([...items, trimmed]);
      setInputValue("");
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={className}>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs gap-1 pr-1">
            {getDisplayText(item)}
            <button onClick={() => handleRemove(i)} className="ml-0.5 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 && <span className="text-xs text-muted-foreground italic">None</span>}
      </div>
      <div className="flex gap-1.5">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-7 text-xs flex-1"
        />
        <Button type="button" variant="outline" size="sm" className="h-7 px-2" onClick={handleAdd} disabled={!inputValue.trim()}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}