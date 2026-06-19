# Admin Spec 04 — Clinics (list + detail)

**Components:** `ClinicsList.tsx` (`/admin/clinics`) · `ClinicDetail.tsx` (`/admin/clinics/:id`)

> Light restyle. Keep all fields/actions. Match clinic-side `dh-table` + card styling.

## Clinics List
- Loads `GET /admin/clinics` → `{items}`. Create/edit via `ClinicFormModal`
  (`POST /admin/clinics`, `PATCH /admin/clinics/{id}`).
- **Bars:** Header "Clinics" + count + **Add Clinic** · search (name + email) · **table**: Name ·
  Email · Specialty · Actions (edit pencil). Row → detail. Loading skeleton / error+retry / empty.
- **Fix:** table is sparse — consider adding default-pharmacy + (future) active status columns.

## Clinic Detail  — also the home for INVITES (merged in, decided 2026-06-19)
- Fetches clinic list, filters by id (no GET-by-id yet).
- **Bars:** back link · header (name + specialty/email + Edit) · **Team / Members & Invites**
  section · `ClinicFormModal` for edit.
  - **Add-ons panel DROPPED** (2026-06-19) — `ClinicAddonsPanel` is omitted from Clinic Detail
    until add-ons launch (matches hiding Services + the Add-on Requests nav). Re-add later.
- **Team / Members & Invites** (folds in the old Invites page): "Invite member" field (email) →
  `createInvite(clinic_id, email)`; list of this clinic's **pending invites** (email · sent ·
  expires [red <48h] · copy link · resend · revoke) via `listInvites` filtered by clinic_id.
  (Active-member list is a later nice-to-have — needs a clinic-users endpoint.)
- **Create-clinic flow:** after `createClinic`, navigate to the new clinic's detail page so the
  admin immediately invites members. "Create a clinic → add members to it."
- The standalone **Invites nav item is retired** (see 06-invites.md).

## Option axes
- List: `dh-table` (recommended) vs clinic cards. Detail: header + addons card, navy/teal.
- Add a clear empty/loading state for the addons panel.
