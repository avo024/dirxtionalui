

## Wire Up Notes Tab (Clinic + Admin)

### 1. API additions (`src/lib/api.ts`)

Add to `clinicApi`:
- `getReferralNotes(referralId)` — GET `/referrals/{referralId}/notes`
- `addReferralNote(referralId, content)` — POST `/referrals/{referralId}/notes`

Add to `adminApi`:
- `getReferralNotes(referralId)` — GET `/admin/referrals/{referralId}/notes`
- `addReferralNote(referralId, content)` — POST `/admin/referrals/{referralId}/notes`

### 2. Clinic Notes tab (`src/pages/clinic/ReferralDetail.tsx`)

Replace the current local-only notes implementation:
- Change `notes` state type to hold API shape: `{ id, author_type, author_name, content, created_at }`
- Fetch notes via `clinicApi.getReferralNotes(id)` on mount (alongside other fetches)
- Replace `addNote` to call `clinicApi.addReferralNote(id, content)`, then prepend result to list
- Redesign note rendering as chat-style: clinic notes left-aligned (blue "Clinic" badge), admin notes right-aligned (purple "Admin" badge), author name, content, timestamp below
- Empty state: "No notes yet. Add a note below."
- Move input to bottom of tab (textarea + Send button), disable while sending

### 3. Admin Notes section (`src/pages/admin/AdminReferralReview.tsx`)

The admin page currently has no Notes tab. Add a collapsible "Notes" section (using the existing Accordion pattern) or a card below the existing content:
- State: `notes`, `newNote`, `sendingNote`
- Fetch via `adminApi.getReferralNotes(id)` on mount
- Same chat-style UI as clinic side (admin notes right, clinic notes left)
- Textarea + Send button at bottom
- Post via `adminApi.addReferralNote(id, content)`

### Files changed
- `src/lib/api.ts` — 4 new methods
- `src/pages/clinic/ReferralDetail.tsx` — rewrite notes tab to use API
- `src/pages/admin/AdminReferralReview.tsx` — add notes section with API integration

