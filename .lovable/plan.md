

## Clinic UI Polish: Drug Icon, Resubmit Flow, Timeline Cleanup

### 1. Remove drug pill icon from referral tables

**File: `src/components/ReferralTable.tsx`** (lines 125-130)

Replace the `<div>` with flex/gap/Pill icon with just `<span className="text-sm">{ref.drug}</span>`. Remove `Pill` from the lucide imports.

### 2. Fix resubmit flow — single button in Documents tab only

**File: `src/pages/clinic/ReferralDetail.tsx`** (lines 244-253)

Remove the `<Button>` for resubmit from the rejection banner. Replace with a text line: *"Go to the Documents tab to upload missing information, then resubmit."*

The resubmit button at line 496-503 in the Documents tab stays as-is.

### 3. Clean up History timeline

**File: `src/pages/clinic/ReferralDetail.tsx`**

**A. Expand EVENT_LABELS** (lines 40-52) to include all mappings:
- `ai_extraction_completed_auto` → "AI extraction completed"
- `validation_updated` → "Document validation updated"
- `pharmacy_reassigned` → "Pharmacy reassigned"
- `delivery_failed` → "Pharmacy delivery failed"
- `pa_processing` → "Prior authorization in processing"
- `admin_edit` → "Admin updated referral details"
- `final_pdf_generated` → "Referral PDF generated"
- Update `delivery_completed` → "Sent to pharmacy"

Add fallback: for unknown event types, title-case with underscores replaced by spaces.

**B. Filter out noise events** — before rendering, filter history to exclude: `validation_updated`, `admin_edit`, `final_pdf_generated`.

**C. Per-event icons** — replace the generic `Clock` icon with:
- `Send` for `referral_created`, `referral_finalized`, `referral_resubmitted`
- `FileText` for `document_uploaded`
- `Sparkles` for `ai_extraction_completed`, `ai_extraction_completed_auto`
- `CheckCircle` for `referral_approved`, `delivery_completed`, `pa_approved`
- `XCircle` for `referral_rejected`, `delivery_failed`, `pa_denied`
- `Clock` for `pa_submitted`, `pa_processing`
- `AlertCircle` (gray) for everything else

Update `EVENT_COLORS` to include:
- Yellow/warning for `pa_submitted`, `pa_processing`
- Red for `delivery_failed`

**D. Separate rejection reason** — for `referral_rejected`, show the reason as a second line below the label (not appended with colon).

**E. Visual polish** — timeline connector line stays thin (`w-px`), timestamp text is already `text-xs text-muted-foreground`, add `pb-8` instead of `pb-6` for more spacing.

### Files changed
- `src/components/ReferralTable.tsx` — remove Pill icon
- `src/pages/clinic/ReferralDetail.tsx` — rejection banner text, timeline overhaul

