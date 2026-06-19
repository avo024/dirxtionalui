# Spec 03 — Clinic Dashboard

**Component:** `src/pages/clinic/ClinicDashboard.tsx` · **Route:** `/clinic/dashboard`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> stat, alert, column, or button. Keep all copy verbatim. No new features. Match the real
> component in `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

The clinic landing page. Loads `GET /referrals` (status aggregation + recent list) and
`GET /patients` (PA-expiry scan). Surfaces what needs action today and recent activity.

## Bars

- **Bar A — Header:** dynamic greeting "Good morning/afternoon/evening, {clinic_name}" +
  subtitle "Here's what's happening with your referrals today". Right: formatted date (hidden on
  mobile) + **New Referral** button.
- **Bar B — Stat cards (4, each a link):**
  - **In Review** (Clock) → `?filter=in_review` — count of `processing/ready_for_review/uploaded`
    — "Being reviewed".
  - **Sent to Pharmacy** (Send) → `?filter=sent_to_pharmacy` — `approved_to_send/sent_to_pharmacy`
    — "At pharmacy".
  - **Needs Attention** (XCircle) → `?filter=rejected` — `rejected` — "Action required".
  - **PA Expiring Soon** (AlertTriangle) → `/clinic/patients?filter=expiring` — patients with PA
    in ≤30d — "Within 30 days".
- **Bar C — Alerts (conditional):**
  - PA-expiration alert (warning): "{n} patient(s) with PA expiring in the next 30 days" + names.
  - One rejected-referral alert per rejection (destructive): "{patient} — Needs Attention" +
    drug + first 80 chars of rejection reason. Each links to the referral.
- **Bar D — Recent Referrals:** heading + "View All →"; `ReferralTable` (top 5, urgency-sorted:
  rejected → needs_info → ready_for_review → processing → approved_to_send → uploaded). Empty
  state: "No referrals yet" + New Referral CTA.

## Known weaknesses to fix in redesign

Rejected alerts stack unboundedly; warning (yellow) and destructive (red) read at similar weight
though red is higher priority; no search/filter from the dashboard; date context lost on mobile.

## Option axes (generate A/B/C per bar)

- **Stat row (Bar B):** A four KPI cards (current) · B compact single stat-strip with dividers ·
  C two "needs action" cards emphasized + two muted.
- **Alerts (Bar C):** A stacked banners (current) · B one collapsible "Needs attention ({n})"
  summary card that expands · C right-rail action feed.
- **Layout:** A stacked (current) · B two-column: main = recent referrals table, right rail =
  alerts + KPIs.
- **Priority ordering:** show "Needs Attention" before "PA Expiring" so red outranks amber.
- **Page title type:** A all-Inter · B editorial serif greeting.
