

## Part 1: Reorder Sections + Part 2: Processing Loading State

### Overview
Two changes: (1) reorder the accordion sections so the auto-detected PA banner sits directly under the manual PA card, with Pharmacy moved to the bottom; (2) add a polling loading state when `status === 'processing'`.

### File: `src/pages/admin/AdminReferralReview.tsx`

#### 1a. Reorder sections in the Accordion (lines 285–655)

Current order: Patient → Provider → Clinical → Insurance → Prior Auth → **Pharmacy** → **Dermatology** → *(outside accordion)* **PAManagementCard**

New order: Patient → Provider → Clinical → Insurance → Prior Auth → **PAManagementCard** → **Dermatology** → **Pharmacy**

Move `<PAManagementCard>` (line 655) from outside the accordion to directly after the Prior Auth accordion item (after line 589). Move the Pharmacy section (lines 591–606) to after the Dermatology section (after line 641).

#### 1b. Processing loading state on review page

Add a `useEffect` that polls `adminApi.getReferral(id)` every 5 seconds when `referral.status === 'processing'`. When status changes away from `processing`, stop polling and update state.

In the right panel (line 283), when `referral.status === 'processing'`, show a loading card instead of the accordion:
- Patient name + documents list for context
- `Loader2` with `animate-spin`
- "AI is extracting referral details..."
- "This takes about 30 seconds. You can safely leave this page and come back."

#### 1c. Hide bottom action bar during processing
When status is `processing`, don't show approve/reject/deliver buttons.

### File: `src/pages/admin/AdminReferralsList.tsx`

#### 2. Add "Processing" status handling in list view

The `StatusBadge` component already handles `processing` status with an animated spinner icon and "Needs Review" label for admin context. Update `adminStatusLabels` in the status labels source to show "Processing" instead of "Needs Review" for the `processing` status.

### File: `src/data/mockData.ts` (or `src/types/index.ts`)

Update `adminStatusLabels.processing` from `"Needs Review"` to `"Processing"`.

### No other files affected

