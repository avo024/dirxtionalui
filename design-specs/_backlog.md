# Redesign backlog / notes (not part of the 8-page clinic redesign)

## Clinic "preferred pharmacy" — who sets it
- **Today:** only DiRxctional **admin** sets `clinics.default_pharmacy_id` via the admin clinic
  form (`app/routes/admin.py` create/update). Clinic side only **reads** it (`getMyClinic`).
- **No clinic-facing UI** exists to set/change the clinic's own default pharmacy.
- **Wizard degrades gracefully:** if no default is set, CreateReferral Step 3 warns and forces a
  per-referral pick — nobody is blocked.
- **Pilot decision:** admin sets it during hand-onboarding of the 5 McGuiness clinics. No build.
- **Later (small, post-pilot):** a clinic **Settings** page with a "Preferred pharmacy" picker
  that PATCHes the clinic. This is a NEW clinic page, separate from the current redesign scope.
  Needs: clinic-facing `PATCH /clinics/me` (or similar) endpoint + small settings UI.

## Notes-as-notification "attention hub" — fast-follow (after clinic redesign)
- Decided 2026-06-19. The dashboard "Needs attention" collapsible becomes the single attention
  hub: rejected referrals + PA expiring + **unread admin notes**.
- Referral Detail: badge the **Notes tab** when there's an unread admin note.
- Lean "unread" tracking via `latest_admin_note_at` vs a local read-marker (existing note-dot
  pattern). No new messaging system.
- NOTE: the rejection-recovery edit UI + what's-missing panel are being built INTO page 05 now
  (see 05-referral-detail.md), not deferred. Only the notes-hub is the fast-follow.

## Marketing site refresh — Phase 2 (AFTER the 8 clinic pages are designed + implemented)
- **Idea:** once the app UI is redesigned, reuse the real polished screens on the marketing
  site instead of mockups. The marketing design system already calls for this ("30% Particle
  Health — real product UI shown in browser-chrome frames"; ships `browser-window.jsx`).
- **What to build:**
  - Framed product shots: redesigned Dashboard / Upload wizard / Referral detail in browser-chrome
    frames as hero + feature imagery.
  - Clickable micro-demos of the real flows (upload → AI extracting → packet ready → sent), with
    **status pills animating** (uploaded → processing → sent). Same components, scripted.
  - More imagery + trust signals (dermatology/clinic photos, founder, HIPAA/subprocessor).
  - Motion craft via the **emilkowalski** animation skill for click/hover micro-interactions.
- **Reuse bonus:** redesigned React components can be screenshotted into frames OR recreated as
  lightweight animated demos — both stay in sync because app + marketing share brand tokens.
- **Sequencing:** parked until the app redesign ships. App first → real screens → marketing site.

## What changes when CMM / Availity integrate (architecture map)
**Principle:** clinic UI *displays* PA state; integrations change the data *source*, not the
display. The status vocabulary (pending/processing/submitted/approved/denied) already matches
CMM. So the clinic redesign is integration-agnostic and safe to invest in now.

- **Backend:**
  - PA-provider abstraction (`manual` → `cmm` → `availity`) — swappable driver behind one
    interface. Build the seam now so manual→CMM is a driver swap, not a rebuild.
  - New data: PA submission records (CMM request id, ePA question sets + answers, decision
    payloads); eligibility records (Availity 270/271 → coverage, plan, formulary). Additive.
  - Status sync via CMM webhooks/polling auto-updates `referral.pa_status` (vs admin typing it).
  - New eligibility endpoint (Availity).
- **Frontend — clinic:** minimal. PA badges auto-populate; maybe one new read-only
  eligibility/coverage card. Core flows unchanged.
- **Frontend — admin:** the real change. PA management card shifts manual entry → "Submit to
  CoverMyMeds" + auto status; the new **ePA question-set workflow** (payer questions) is a
  genuinely new screen; eligibility-check button; possible CMM submission queue.
- **Don't build speculatively:** the ePA question-set UI waits for real CMM API docs (Provider
  form submitted). Designing it blind = rework.

## Admin redesign — Phase 1b (after the 8 clinic pages)
Decision (2026-06-18): redesign admin too, not just restyle — most admin pages are CMM-stable.
- **Redesign (stable, high-value — Mari's daily drivers first):**
  - Admin Referral **Review** (doc viewer + extracted-data + approve/reject) — most-used.
  - **Review queue** (All Referrals) — most-used list.
  - Admin **Dashboard / Overview**.
  - AI Quality, Clinics, Pharmacies, Add-on Requests, Invites — lighter, mostly CRUD.
- **Carve-out — restyle only, do NOT re-architect:** the **PA management card** inside the
  referral review. CMM will reshape it (see map above). Make it match the new system visually,
  but don't deeply rebuild it until the CMM API lands.
- Same App UI design system + specs workflow as the clinic side, so both sides feel like one
  product.

## Specialty-specific extracted fields — architecture (decided 2026-06-19)
**Decision:** KEEP the dermatology section in admin review (do NOT cut). For a derm pilot, derm
fields (IGA/EASI/BSA/POEM, prior failed therapies, phototherapy) are the PA evidence payers
require — not "extra."

**Already specialty-driven on the backend:** clinic has a `specialty` (one clinic = one
specialty); `app/ai/processor.py` passes `specialty` into the extraction prompt; `schema.py` has
the specialty section; admin review renders the block conditionally (`if extracted_data.dermatology`).

**Scaling to other specialties (rheum, etc.) — additive, no rework:**
1. Onboarding sets the clinic's specialty (field exists).
2. Backend: add a specialty-specific extraction prompt (pipeline already branches on specialty).
3. Frontend: a small **specialty-field registry** `{ dermatology:[...], rheumatology:[...] }` so the
   admin review renders whichever specialty block is present. Admin can edit/override. Build when
   the 2nd specialty onboards — not needed for the derm-only pilot.

Referral PDF stays lean (4 core sections); specialty fields ride along for the **PA**, not the PDF.
Admin 01 already does this functionally + is recolored; full chrome re-skin = post-launch polish.
