

## Bridge Program PA display + Wire View PA Details

### File 1: `src/pages/clinic/ReferralDetail.tsx` (lines 462-504)

Wrap the PA section so when `referral.is_bridge_program === true`, it overrides everything and shows a fixed bridge display:

```tsx
<div className="border-t border-border pt-3" />
{referral.is_bridge_program ? (
  <>
    <Field label="PA Required" value="No" />
    <div>
      <p className="text-muted-foreground text-xs mb-1">PA Status</p>
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
        Bridge Program — PA not required
      </span>
    </div>
    {/* No "PA Handled By" field */}
  </>
) : (
  <>
    <Field label="PA Required" value={referral.pa_required ? 'Yes' : 'No'} />
    {referral.pa_required && (/* existing block lines 464-504 unchanged */)}
  </>
)}
```

Bridge check wins regardless of stale `pa_required` data.

### File 2: `src/pages/clinic/PatientDetail.tsx` (line ~617-620)

Wire the View PA Details button to navigate. `useNavigate` is likely already imported (we'll verify and add if missing).

```tsx
<Button
  variant="outline"
  size="sm"
  className="w-full text-xs"
  onClick={() => drug.last_referral_id && navigate(`/clinic/referrals/${drug.last_referral_id}`)}
  disabled={!drug.last_referral_id}
  title={!drug.last_referral_id ? "No referral linked to this medication." : undefined}
>
  <Eye className="h-3.5 w-3.5 mr-1" />
  View PA Details
</Button>
```

For a proper tooltip (instead of native `title`), wrap the button in `Tooltip`/`TooltipTrigger`/`TooltipContent` from `@/components/ui/tooltip` only when disabled. Note: disabled buttons don't fire pointer events, so tooltip trigger needs `asChild` on a wrapping `span`.

**Note on `last_referral_id`**: This field needs to be present on the `PatientDrug` type returned by the medications endpoint. If the backend already returns it, no further change. If not, we'll add it to the `PatientDrug` interface in `src/types/index.ts` as an optional `last_referral_id?: string` so TypeScript accepts the access. (Will verify the type at implementation time.)

### Files changed
- `src/pages/clinic/ReferralDetail.tsx` — Bridge program overrides PA Required / PA Status / hides PA Handled By
- `src/pages/clinic/PatientDetail.tsx` — Wire navigate on View PA Details + disabled state with tooltip
- `src/types/index.ts` — Add `last_referral_id?: string` to `PatientDrug` if missing

