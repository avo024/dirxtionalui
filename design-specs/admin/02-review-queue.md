# Admin Spec 02 — Review Queue

**Component:** `src/pages/admin/AdminReferralsList.tsx` · **Route:** `/admin/referrals`

> Redesign visuals/layout/interaction ONLY. Keep every filter, column, and action. Match the
> clinic Referrals List look (`rl-` chrome + `dh-table`) — this is the admin twin of that page.

## What it does (cross-end)
The admin's primary worktable — all referrals from all clinics. Loads `GET /admin/referrals`
(+ `GET /admin/referrals/counts` for tab counts). Auto-refreshes on window focus.

## Bars
- **Bar A — Header:** "All Referrals" + "Manage and review referrals from all clinics".
- **Bar B — Filter + search:** filter tabs with counts — **All · Needs Review** (ready_for_review
  OR processing) **· Rejected · Ready to Send · Sent** — + search ("Search by patient name or
  ID…") + **Clinic dropdown** (all unique clinic names). Use the clinic page's segmented-filter +
  dropdown + search styling.
- **Bar C — Table:** the **admin `ReferralTable`** (reuse `dh-table`). Admin columns: ID (mono,
  copy) · Patient (unread **clinic**-note dot) · **Clinic** · Drug (+Bridge) · **PA Status**
  (`PAStatusCell`, **sortable** — cycle null→asc→desc by processing→denied→submitted→approved→
  not_required) · Status (+Insurance Expired) · **Pharmacy** · Created · Actions (**Review**).
  Empty state: "No referrals found / Try adjusting filters".
- **Bar D — Pagination:** "Showing X of Y referrals" + Prev/Next. (Note: pagination is currently
  non-functional — wire it like the clinic compact pagination while restyling.)

## Known weaknesses to fix
Pagination buttons are disabled/non-functional (implement real paging); no bulk actions; PA-sort
state not persisted; clinic dropdown unsearchable for long lists.

## Option axes
- **Filter bar:** segmented + dropdown (match clinic) · left filter rail · status dropdown only.
- **Table vs cards** (table recommended — it's a dense worktable).
- **Add real pagination** (compact ellipsis, like clinic) + optional bulk-select column.
- Sortable Created/Status headers (like clinic list).
