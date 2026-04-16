

## Redesign Notes UI + New-Note Indicator Dot

### Files changed
1. `src/pages/clinic/ReferralDetail.tsx` — Notes tab redesign + mark-as-viewed on tab open
2. `src/pages/admin/AdminReferralReview.tsx` — Notes tab redesign + mark-as-viewed on tab open
3. `src/components/ReferralTable.tsx` — Add purple dot indicator on rows with new other-party notes
4. `src/lib/dataMapper.ts` (lookup) — Ensure `latest_admin_note_at` / `latest_clinic_note_at` pass through to mapped referrals (currently no mapper strips them since they're new fields — verify pass-through)

### 1. Notes tab redesign (both clinic + admin)

Replace the chat-bubble layout with a stacked full-width comment list.

**Each note card structure:**
```
<div class="rounded-lg border border-border/50 bg-card border-l-4 [accent] p-4">
  <div class="flex items-baseline justify-between mb-2">
    <span class="font-semibold text-sm">{authorName}</span>
    <span class="text-xs text-muted-foreground">{formatDateTime(created_at)}</span>
  </div>
  <p class="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
</div>
```

**Author name resolution:**
- Clinic side: admin notes → `"DiRxtional Team"`, own notes → `referral.clinic_name` (fallback `"Your Clinic"`)
- Admin side: admin notes → `"DiRxtional Team"`, clinic notes → `referral.clinic_name`

**Left-border accent:**
- Admin author → `border-l-purple-500`
- Clinic author → `border-l-primary`

**Remove:**
- All "Admin"/"Clinic" pill badges
- The "No notes yet" empty state card (just render the input)
- `justify-end` / `max-w-[75%]` chat bubble styling

**Container:** stacked list `space-y-3`, full width, with the input area below.

**After sending a note:** append to list, then scroll the newest note into view via `ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on a sentinel div at the bottom.

### 2. Mark-as-viewed on tab open

In each detail page, watch the active Tabs `value`. When it becomes `"notes"`, write to localStorage:
```ts
localStorage.setItem(`notes_last_viewed_${id}`, new Date().toISOString());
```
Use Tabs' `onValueChange` to detect this. Also call once on mount if the user lands directly on notes via deep link.

### 3. New-note indicator dot on referral list

**In `ReferralTable.tsx`:**
- Read `userType` (already passed in) to know which timestamp field to check:
  - `userType === "clinic"` → check `ref.latest_admin_note_at`
  - `userType === "admin"` → check `ref.latest_clinic_note_at`
- For each row, compute `hasUnreadNote`:
  ```ts
  const lastViewed = localStorage.getItem(`notes_last_viewed_${ref.id}`);
  const noteTs = userType === 'clinic' ? ref.latest_admin_note_at : ref.latest_clinic_note_at;
  const hasUnreadNote = !!noteTs && (!lastViewed || new Date(noteTs) > new Date(lastViewed));
  ```
- Render a small purple dot (`h-2 w-2 rounded-full bg-purple-500`) inside the **Patient Name** cell, immediately to the left of the name, with a tooltip "New note".

No new column added (keeps table clean). The dot disappears on next list render after the user opens the Notes tab on that referral.

### 4. Data pass-through

The clinic list maps via `mapReferralsFromBackend`; the admin list spreads `...r`. As long as the mapper preserves unknown fields (or we explicitly add `latest_admin_note_at`/`latest_clinic_note_at` pass-through), the dot logic works. Implementation step: open `dataMapper.ts`, ensure both timestamps are forwarded in the mapped object (add if missing).

### Notes
- No backend or API changes needed.
- No new dependencies.
- localStorage is per-browser; that's acceptable per spec.

