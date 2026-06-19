# Admin Spec 07 — Add-on Requests  🚫 HIDDEN (decided 2026-06-19)

**Decision:** no add-ons exist yet (clinic-side Services is hidden), so the admin add-on surface
is hidden too — the **`/admin/addon-requests` nav item is removed** AND the **add-ons panel is
dropped from Clinic Detail** (see 04-clinics.md). Routes/components stay in code; just no nav +
no clinic-detail panel. Re-enable both when add-ons launch. No redesign needed now.

---

**Component (kept, not linked):** `AdminAddonRequests.tsx` · **Route (no nav):** `/admin/addon-requests`

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
