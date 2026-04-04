

## Fix TagListEditor to Handle Object Arrays

**File**: `src/components/TagListEditor.tsx`

### Problem
The backend returns diagnoses as `[{code: "L20.9", description: "Atopic Dermatitis"}]` but TagListEditor expects `string[]`, causing a crash when React tries to render an object.

### Solution
Update TagListEditor to accept `any[]` instead of `string[]` and normalize items internally:

1. **Change props type**: `items: any[]` (keep `onChange` as `(items: any[]) => void`)
2. **Add a display helper**: `getDisplayText(item)` that returns the string if it's a string, or `"code - description"` if it's an object with those keys, or `JSON.stringify(item)` as fallback
3. **Use `getDisplayText`** in the Badge render and in the duplicate check when adding new items
4. **New items added via input** remain plain strings — no need to construct objects

### Changes

```tsx
// Props
items: any[];
onChange: (items: any[]) => void;

// Helper
function getDisplayText(item: any): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    if (item.code && item.description) return `${item.code} - ${item.description}`;
    if (item.code) return item.code;
    if (item.name) return item.name;
  }
  return String(item);
}
```

Badge renders `{getDisplayText(item)}`. Duplicate check uses `getDisplayText`. No other files need changes.

