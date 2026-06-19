# Admin Spec 04 — Clinics (list + detail)

**Components:** `ClinicsList.tsx` (`/admin/clinics`) · `ClinicDetail.tsx` (`/admin/clinics/:id`)

> Light restyle. Keep all fields/actions. Match clinic-side `dh-table` + card styling.

## Clinics List
- Loads `GET /admin/clinics` → `{items}`. Create/edit via `ClinicFormModal`
  (`POST /admin/clinics`, `PATCH /admin/clinics/{id}`).
- **Bars:** Header "Clinics" + count + **Add Clinic** · search (name + email) · **table**: Name ·
  Email · Specialty · Actions (edit pencil). Row → detail. Loading skeleton / error+retry / empty.
- **Fix:** table is sparse — consider adding default-pharmacy + (future) active status columns.

## Clinic Detail
- Fetches clinic list, filters by id (no GET-by-id yet). 
- **Bars:** back link · header (name + specialty/email + Edit) · **ClinicAddonsPanel** (add-on
  approval workflow) · `ClinicFormModal` for edit.

## Option axes
- List: `dh-table` (recommended) vs clinic cards. Detail: header + addons card, navy/teal.
- Add a clear empty/loading state for the addons panel.
