# Session Resume — Clinic Redesign (2026-06-19, end of night)

**Authoritative morning-resume for the redesign work.** (Vault Resume.md may be stale due to
Drive sync; this file lives in the repo and is reliable.)

## Where we left off
The **clinic-side redesign is functionally complete** — all 7 visible clinic pages rebuilt to the
new "DiRxctional App UI" design system (navy #1B2B5B / teal #14B8A6, dark navy sidebar, Inter +
JetBrains Mono). On branch **`design/navy`**, **uncommitted but safe**, **typecheck clean (tsc
exit 0)**. `main` untouched, nothing pushed.

## Done this session
| Page | File(s) | Notes |
|---|---|---|
| Tokens | `src/index.css` | App UI raw tokens + status pill hexes + `--text-*`/`--shadow-lg` |
| Sidebars | `src/components/layout/{Clinic,Admin}Sidebar.tsx` | dark-navy contrast fixes; **Services nav item removed** |
| 01 Wizard | `CreateReferral.tsx` + `wizard.css` | 2-col + summary rail · segmented stepper · smart dropzone (+packet→`doc_type=packet`) · single-scroll manual · **pharmacy dropdown** |
| 02 Patient Detail | `PatientDetail.tsx` + `patient.css` | serif name · banner header · tabs · PA health strip · edit drawer |
| 03 Dashboard | `ClinicDashboard.tsx` + `dashboard.css` | action-split stats · collapsible alerts (red-first) · dh-table |
| 04 Referrals List | `ReferralsList.tsx` + `referrals.css` | segmented filter · sortable headers · compact pagination · dh-table |
| 05 Referral Detail | `ReferralDetail.tsx` + `referral-detail.css` | **FixPanel + edit drawer (wired PATCH) + ⚠ flags + missing-docs checklist** · dl cards · progress status · split docs |
| 06 Patients List | `PatientsList.tsx` | reused referrals-list style (dh-table + rl- chrome) |
| 07 Create Patient | `CreatePatient.tsx` + `create-patient.css` | inline validation · searchable state · referral-offer success |
| API | `src/lib/api.ts` | added **`editReferral(id, sections)`** → `PATCH /referrals/<id>` |
| 08 Services | — | **hidden** (nav item removed; route still exists). Re-add when add-ons exist. |

## Queued for the morning (priority order)
1. **Clinic-only bug test** — `cd ~/dirxtionalui && git checkout design/navy && npm run dev` (or
   `./dev.sh`). Click all 7 pages + the (recolored) admin side. Do NOT test the rejection loop yet.
2. **Commit** the redesign as one clean set once happy (then deploy: push → EC2 `git pull` →
   `./build-prod.sh` → CloudFront invalidate).
3. **Admin Phase 1b** — the big one. Headline: **structured rejection** (admin reject modal
   captures missing-docs checklist + flagged fields + reason → stored → clinic FixPanel reads it
   precisely). Then restyle admin daily-drivers (Review queue, Referral review, Dashboard). See
   `design-specs/_backlog.md`.
4. **Full rejection-loop bug test** — only after admin reject exists (admin↔clinic round-trip).
5. **Fast-follows:** notes-as-notification hub; true low-confidence field flags (needs
   `extracted_data.meta` shape); ExpiredInsuranceBanner restyle.

## Bug-test sequencing decision (why we deferred)
Rejection recovery is an admin↔clinic loop. Clinic half (FixPanel/edit/flags) can't be
meaningfully tested until admin can reject. So: clinic visuals/flows now → admin → full loop.

## Known caveats (choices, not bugs)
- Field flags = empty-required only for now.
- Admin = recolored, NOT redesigned yet (expected; Phase 1b).
- DocumentViewer now renders inline in the split pane (was modal) — eyeball it.
- ExpiredInsuranceBanner still orange-Tailwind (minor) — polish later.
- Status labels: kept the real `StatusBadge`/`ClinicPABadge` components (Alex chose existing labels).

## Don't touch
- `main` branch (clean). The redesign lives ONLY on `design/navy`.
- Backend `PATCH /referrals/<id>` already supports clinic edits (auto-promotes rejected→review) —
  don't rebuild; the frontend now calls it.

## Key references
- Specs: `design-specs/00-08*.md` (per-page) · `design-specs/_backlog.md` (CMM/Availity map,
  admin redesign plan, notes hub, marketing Phase 2).
- Claude Design: app design system project `004c699c-81ab-48e6-bd70-ba93c3dc9235` ("DiRxctional
  App UI"); page-options canvas project `9347d2dc-7237-4b9d-bd97-5152ec89170f`.
- Real edit endpoint: `clinical-api/app/routes/referrals.py` `edit_referral` (`_EDITABLE_SECTIONS`,
  `_EDITABLE_STATUSES`).
