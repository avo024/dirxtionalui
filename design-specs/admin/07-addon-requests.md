# Admin Spec 07 — Add-on Requests

**Component:** `AdminAddonRequests.tsx` · **Route:** `/admin/addon-requests`

> Light restyle. Keep all fields/actions. (Note: clinic-side Services is currently HIDDEN, so
> this admin queue will usually be empty until add-ons exist — low priority.)

## What it does
Review clinic add-on requests. `GET /admin/addon-requests?status=…`; decide
`POST /admin/addon-requests/{id}/decide` `{decision, admin_notes, quantity}`.

## Bars
- Header: "Add-on Requests" + subtitle.
- Tabs: Pending (count badge) · Approved · Denied · Cancelled · All.
- **Request cards**: addon icon + name + "$X/mo" · clinic · specialty · "requested {relative}" ·
  clinic-notes box · admin-notes box (if decided) · actions: **Approve** / **Deny** (pending) or
  status badge. Approve dialog (quantity + internal notes); Deny dialog (reason required).
  Loading / error / empty (CheckCircle for pending, Inbox otherwise).

## Option axes
- Cards (current) vs a compact `dh-table` with an expand row. Reuse the clinic Services card
  styling for visual continuity. Keep the approve/deny dialogs.
