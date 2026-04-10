

## Make All Patient Info Section Backgrounds Uniform

### Change
In `src/pages/clinic/PatientDetail.tsx`, replace `bg-muted/30` with `bg-card` on the three sections that currently have the gray tint (Personal Information, Medical, Insurance Information). This makes all five sections use the same white background as Contact and Guardian.

### Files changed
- `src/pages/clinic/PatientDetail.tsx` — change 3 occurrences of `bg-muted/30` to `bg-card`

