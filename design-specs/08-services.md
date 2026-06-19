# Spec 08 — Services (Add-ons)

**Component:** `src/pages/clinic/Services.tsx` · **Route:** `/clinic/services`

> Redesign visuals, layout, and interaction ONLY. Do not add, remove, rename, or reorder any
> card, field, or button. Keep all copy verbatim. No new features. Match the real component in
> `avo024/dirxtionalui`. Render in product-UI mode (see `00-app-shell`).

## What this page does (cross-end)

Manage the clinic's plan + add-on services. Loads `GET /clinics/me/services` (clinic,
active_addons, pending_requests, catalog). Request add-on → `POST /clinics/me/addon-requests`;
cancel → `DELETE /clinics/me/addon-requests/{id}`.

## Bars

- **Bar A — Header:** "Services" + "Manage your DiRxctional plan and add-on services".
- **Bar B — Current Plan card:** Sparkles tile, "Plan / Contact your account manager", email
  link `hello@dirxctional.com`.
- **Bar C — Active Add-ons** (if any): rows — icon, addon_name, description, "${price}/mo",
  "× qty" if >1, green **Active** badge.
- **Bar D — Available Add-ons:** grid of cards — icon, name, description, "${price}/mo", and
  **Request** button (or amber **Requested** badge). Empty: "You've already activated or
  requested every available add-on."
- **Bar E — Pending Requests** (if any): rows — icon, addon_name, "Requested {relative time}",
  "${price}/mo", **Cancel** button.
- **Modals:** Request Add-on ("Request {name}" + "${price}/mo — billed on your next cycle once
  our team confirms" + optional Notes textarea + Submit) · Confirm Cancel ("Cancel request?").

## Known weaknesses to fix in redesign

Current Plan card is a static dead-end (no plan name/spend); active/requested/pending state is
scattered across three sections; no SLA shown in Pending; no per-add-on spend summary.

## Option axes (generate A/B/C per bar)

- **Overall layout:** A stacked sections (current) · B two-column: catalog left, "your services"
  (active + pending + monthly total) right.
- **Add-on cards (Bar D):** A icon + text + price + button (current) · B richer cards with a
  one-line benefit + price prominence · C comparison row.
- **State unification:** show Active / Requested / Available as one filterable catalog with status
  chips, instead of three separate lists.
- **Current Plan (Bar B):** surface a monthly add-on spend total even though base plan is "contact
  account manager".
- **Page title type:** A all-Inter · B editorial serif title.
