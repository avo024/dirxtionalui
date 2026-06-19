# Admin Spec 03 — Admin Dashboard

**Component:** `src/pages/admin/AdminDashboard.tsx` · **Route:** `/admin/dashboard`

> Redesign visuals/layout/interaction ONLY. Keep KPIs, charts, and the Needs-Attention table.
> Match the clinic dashboard styling (`dh-` stat cards + `dh-table`). Render in product mode.

## What it does (cross-end)
Ops overview across all clinics. Loads `GET /admin/referrals` (all). Auto-refreshes on focus.

## Bars
- **Bar A — Header:** "Admin Dashboard" + "Overview of all referral activity".
- **Bar B — KPI stats (5):** Total Referrals · **Needs Review** (badge if >0) · Approved Today ·
  Rejected Today · Sent Today. Reuse the clinic dashboard stat-card styling (colored icon tiles).
- **Bar C — Charts (2-up):** **donut** "Referrals by Status" (ready_for_review / approved_to_send
  / sent_to_pharmacy / rejected / uploaded, only nonzero) + **line** "Referrals Over Time (Last 7
  Days)". Keep Recharts; restyle to navy/teal + status colors.
- **Bar D — Needs Attention:** "Needs Attention (N)" + the admin `ReferralTable` (`showClinic`),
  sorted unread-clinic-notes-first then ready_for_review by created desc. Reuse `dh-table`.

## Known weaknesses to fix
"Needs Review" appears in both a KPI and the section title (redundant); no date-range picker on
the chart; no empty state when zero referrals.

## Option axes
- **Stat row:** four/five KPI cards (current) vs action-split (emphasize Needs Review + Rejected).
- **Charts:** side-by-side (current) vs stacked vs a single combined panel.
- **Layout:** stacked (current) vs two-column (charts left, Needs-Attention rail right).
- **Chart palette:** map slices to the status-pill colors for consistency with the tables.
