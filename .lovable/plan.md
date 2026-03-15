

## Fix PA Status Display and Initial State in PAManagementCard.tsx

Six targeted edits to handle `null` pa_status with a new `not_started` state:

### 1. Update type (line 31)
Add `"not_started"` to `PADecisionStatus` union type.

### 2. Update useEffect else branch (lines 95-98)
Add explicit check for `null`/falsy `pa_status` → set `not_started` with `isEditMode: false`. Keep existing fallthrough for other cases as `processing`.

### 3. Add `not_started` SelectItem (after line 386)
Insert `<SelectItem value="not_started">Not Started</SelectItem>` as first option in the PA Status dropdown.

### 4. Add `not_started` case to `paStatusBadge` (before line 243)
Render a muted badge with Shield icon and "Not Started" label.

### 5. Add Not Started view in ViewModeDisplay (after line 270, before status display)
When `paDecisionStatus === "not_started"`, show a Shield icon with "PA not yet started. Click Edit PA Details to begin." message.

### 6. Add guard in handleSave (line 139, top of function)
If `paDecisionStatus === "not_started"`, show destructive toast asking user to select a status, then return early.

All changes are within `PAManagementCard.tsx`. No other files affected.

