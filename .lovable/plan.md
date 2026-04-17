

## Drug Typeahead Combobox + Emoji Cleanup

### File 1: `src/lib/api.ts`
Add to `clinicApi`:
```ts
async getFormularyDrugs(search?: string): Promise<{ items: any[] }> {
  const q = search ? `?q=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/referrals/drugs${q}`, { headers: getHeaders() });
  return handleResponse(response);
},
```

Add to `adminApi`:
```ts
async getFormularyDrugs(search?: string): Promise<{ items: any[] }> {
  const q = search ? `?q=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/admin/drugs${q}`, { headers: getHeaders() });
  return handleResponse(response);
},
```

### File 2: New `src/components/DrugCombobox.tsx`
Reusable searchable combobox using shadcn `Popover` + `Command` (already installed):

- Props: `value: string`, `onChange: (drugName: string) => void`, `fetchDrugs: (q?: string) => Promise<{ items: any[] }>`, `placeholder?: string`, `className?: string`
- Internal state: `open`, `inputText`, `items`, `loading`
- Debounced 300ms effect calls `fetchDrugs(inputText)` on input change
- Renders each item as `CommandItem` showing `Drug Name (generic_name)` + small "PA Required" `Badge` when `requires_pa`
- Free-text fallback via `CommandEmpty` content: shows `Use "{inputText}"` row that calls `onChange(inputText)` and closes
- Selecting an item → `onChange(item.drug_name)` and closes
- Trigger button shows current `value` or placeholder; typing happens in `CommandInput` inside popover

The `fetchDrugs` prop lets clinic and admin pass different endpoints (clinic-filtered vs all-drugs).

### File 3: `src/pages/clinic/CreateReferral.tsx`
Replace the Drug Requested `<Input>` (lines 779-785) with:
```tsx
<DrugCombobox
  value={manualData.drugRequested}
  onChange={(v) => setManualData(d => ({ ...d, drugRequested: v }))}
  fetchDrugs={clinicApi.getFormularyDrugs}
  placeholder="Search drug..."
/>
```

### File 4: `src/pages/admin/AdminReferralReview.tsx`
Replace the Drug Requested `FieldEdit` (~line 630) with a labeled DrugCombobox preserving the confidence indicator:
```tsx
<div>
  <Label className="text-xs text-muted-foreground mb-1 flex items-center gap-2">
    Drug Requested
    {(conf["clinical.drug_requested"] ?? conf.drug_requested) !== undefined && (
      <ConfidenceIndicator score={conf["clinical.drug_requested"] ?? conf.drug_requested} />
    )}
  </Label>
  <DrugCombobox
    value={editedData?.clinical?.drug_requested || ""}
    onChange={(v) => updateField("clinical", "drug_requested", v)}
    fetchDrugs={adminApi.getFormularyDrugs}
  />
</div>
```

### File 5: Emoji removal (4 spots, scoped to confirmed locations)

**`src/pages/clinic/PatientDetail.tsx`**
- Line 302: `⚠️ PA for...` → `<AlertTriangle className="h-4 w-4 inline mr-1.5 text-warning" />PA for...`
- Line 309: `❌ PA for...` → `<AlertTriangle className="h-4 w-4 inline mr-1.5 text-destructive" />PA for...`

**`src/pages/clinic/ReferralDetail.tsx`**
- Line 486: `✓ Approved` → `Approved`
- Line 488: `✗ Denied` → `Denied`

(I'll do a final src-wide grep at implementation time to catch any others, but these 4 are the only matches found.)

### Files changed
- `src/lib/api.ts` — add `getFormularyDrugs` to both `clinicApi` and `adminApi`
- `src/components/DrugCombobox.tsx` — new reusable searchable combobox with debounce + free-text fallback + PA badge, accepts `fetchDrugs` prop
- `src/pages/clinic/CreateReferral.tsx` — swap Drug Requested Input → DrugCombobox (clinic endpoint)
- `src/pages/admin/AdminReferralReview.tsx` — swap Drug Requested FieldEdit → DrugCombobox (admin endpoint, preserves label + confidence)
- `src/pages/clinic/PatientDetail.tsx` — replace ⚠️/❌ with `AlertTriangle` icon
- `src/pages/clinic/ReferralDetail.tsx` — remove ✓/✗ from PA badges

