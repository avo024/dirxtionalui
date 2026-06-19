# Admin Spec 06 — Invites

**Component:** `AdminInvites.tsx` · **Route:** `/admin/invites`

> Light restyle. Keep all fields/actions. Match `dh-table` styling.

## What it does
Manage clinic-user invites. `GET /admin/invites`; create `POST /admin/invites`; resend
`POST /admin/invites/{token}/resend`; revoke `DELETE /admin/invites/{token}`. Filters to pending.

## Bars
- Header: "Clinic Invites" + subtitle + **New Invite** (`NewInviteModal`).
- "Pending invites" card → **table**: Email · Clinic · Sent (tooltip full datetime) · Expires
  (red if <48h) · Actions (copy link · resend · revoke trash). Loading / endpoint-missing /
  empty states. Revoke via `AlertDialog`.

## Option axes
- `dh-table` (recommended) with an "expires soon" amber pill. Optionally add an All / Used /
  Expired filter (data already supports it). Toast confirms copy.
