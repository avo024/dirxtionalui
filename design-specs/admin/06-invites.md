# Admin Spec 06 — Invites  ⚠️ FOLDED INTO CLINIC DETAIL (decided 2026-06-19)

**Decision:** invites are clinic-scoped (`createInvite(clinic_id, email)`), so the standalone
Invites page is being **merged into Clinic Detail** as a "Team / Members & Invites" section, and
the **`/admin/invites` nav item is retired**. See `04-clinics.md`. Keep the existing invite
actions (create / list / resend / revoke) — they just move into the clinic context.

Below is the original spec, kept for the action/field reference while implementing the merge.

---

**Component (legacy):** `AdminInvites.tsx` · **Route (retired):** `/admin/invites`

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
