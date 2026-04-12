

## Better Date Pickers in PA Management

### Change
Add `captionLayout="dropdown-buttons"`, `fromYear={2024}`, and `toYear={2030}` props to all three `<Calendar>` instances in `src/components/PAManagementCard.tsx`. This enables built-in month/year dropdown selectors in react-day-picker, eliminating the need to click arrows month-by-month.

### Files changed
- `src/components/PAManagementCard.tsx` — Update 2 Calendar components (lines 508 and 522) to include dropdown props

### Technical detail
The shadcn Calendar wraps react-day-picker, which natively supports `captionLayout="dropdown-buttons"`. Adding three props to each Calendar instance is all that's needed:

```tsx
<Calendar
  mode="single"
  captionLayout="dropdown-buttons"
  fromYear={2024}
  toYear={2030}
  selected={date}
  onSelect={setDate}
  initialFocus
  className={cn("p-3 pointer-events-auto")}
/>
```

No date format changes — dates still serialize as `YYYY-MM-DD` via `.toISOString().split('T')[0]`.

