

## Fix Two Bugs in Patient Edit Mode

### Bug 1: DOB clears on edit

**File: `src/pages/clinic/PatientDetail.tsx`** (line 99)

In `startEditing()`, change:
```ts
dob: patient.dob || "",
```
to:
```ts
dob: formatDateForInput(patient.dob),
```

Add helper function before the component:
```ts
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
};
```

### Bug 2: Tab resets to "Referral History" after save

**Same file**, line 206: Change `<Tabs defaultValue="history">` to controlled:

Add state: `const [activeTab, setActiveTab] = useState("history");`

Replace: `<Tabs defaultValue="history">` → `<Tabs value={activeTab} onValueChange={setActiveTab}>`

No other changes needed — `activeTab` persists across the re-render triggered by `loadPatient()`.

### No other files affected

