# Dirxctional — Frontend (dirxtionalui)

> **Canonical agent instructions for this repo.** Every coding agent reads this first; `CLAUDE.md` adds only Claude-specific notes. The backend repo's `AGENTS.md` (`~/clinical-api/AGENTS.md`) is the project-wide source of truth for HIPAA rules, status values, and business context — read it too. Last refresh: 2026-09-09.

## What this is
React/Vite frontend for Dirxctional — one app, two audiences:
- **Clinic side** (`/clinic/*`): referral upload wizard, referral + patient status, tasks from the Dirxctional team, signature uploads.
- **Admin side** (`/admin/*`): review queue and workstation, PA tracking, appeal packet builder, manufacturer enrollment card, tasks, support cases, Fax Center, extraction-quality dashboard, clinics/pharmacies admin.

Production: `https://app.dirxctional.com` (CloudFront → nginx static files on EC2). API: `https://app.dirxctional.com/api/*` → Flask (`~/clinical-api`).

## Stack
Vite 5 · React 18 · TypeScript · Tailwind + shadcn/ui (Radix) · react-router · TanStack Query · react-hook-form + zod · lucide-react icons · AWS Amplify for **Cognito** Hosted UI auth. All changes are made locally by coding agents (Lovable was retired 2026-06-04; a harmless `lovable-tagger` dev plugin remains).

## Key files
- `src/App.tsx` routes + providers · `src/main.tsx`
- `src/lib/api.ts` — the ONLY API client (`clinicApi`, `adminApi`, typed responses). Default base is `/api` (Vite proxy in dev).
- `src/pages/clinic/*`, `src/pages/admin/*` (Fax Center: `admin/FaxCenter.tsx`; workstation: `admin/WorkstationCard.tsx`)
- `src/components/` — `EnrollmentCard.tsx`, `AppealPacketCard.tsx`, `ReferralTasksCard.tsx`, `StatusBadge.tsx`, `PAStatusBadge.tsx`; `components/ui/*` = shadcn primitives (restyle via tokens, don't fork)
- `src/lib/workstationStage.ts` — referral stage logic mirrored from backend
- `src/index.css`, `tailwind.config.ts` — design tokens (CSS custom props like `--color-teal-700`, `--text-muted`)
- `vite.config.ts` (env-driven `VITE_OUT_DIR`), `build-prod.sh`, `dev.sh`

## Verification (do this before every commit)
```bash
npx tsc -p tsconfig.app.json --noEmit   # the REAL typecheck; plain `tsc --noEmit` checks ZERO files here
npm run build                            # must succeed (chunk-size warnings are pre-existing noise)
```
Known pre-existing tsc errors elsewhere in the repo are not yours to fix unless asked.

## Rules
- **HIPAA:** no PHI in localStorage/sessionStorage/cookies, console logs, or error text. Generic error UI; details live server-side in audit events. Never surface cross-clinic data to clinic users.
- **Status values** must mirror the backend: referral `uploaded → processing → ready_for_review → approved_to_send | rejected → sent_to_pharmacy`; PA `null → pending → approved | denied`. Adding/removing one means updating `StatusBadge`, `PAStatusBadge`, tab filters, and any data mapper.
- **Match the existing visual language.** Reuse card/table/badge patterns from neighboring pages (two conventions coexist: bespoke `rl-`/`dh-`/`rw-` classes and shadcn/Tailwind — pick the closest structural sibling). Invent no new design.
- **Plain language for Mari.** Admin UI copy is read by a non-technical team — no jargon, no internal identifiers.
- Forms: react-hook-form + zod, validate on submit and blur, inline errors. Icons: lucide only. Don't add heavy dependencies without discussion.
- Auth guards on every protected route; clinic routes never render admin data.

## Local dev (runs on EC2 where Flask lives; port-forward to the Mac)
```bash
# EC2:  cd ~/dirxtionalui && ./dev.sh        # clears Vite cache, starts on 0.0.0.0:8080
# Mac:  aws ssm start-session --target <EC2 instance id → Bitwarden> --region us-east-2 \
#         --document-name AWS-StartPortForwardingSession \
#         --parameters '{"portNumber":["8080"],"localPortNumber":["8080"]}'
# open http://localhost:8080
```
Leave `VITE_API_URL` unset for local dev (the `/api` proxy handles it); `.env` needs the `VITE_COGNITO_*` vars. Stale bundle after a pull? Disable cache in DevTools and reload.

## Production deploy
```bash
cd ~/dirxtionalui && git pull && ./build-prod.sh     # writes straight to /var/www/dirxctional
# then from a Mac with CloudFront perms:
aws cloudfront create-invalidation --distribution-id E3LI28U8NDAYZF --paths "/" "/index.html"
```
Hard-refresh to verify. Flask does not restart for frontend changes. Alex performs deploys unless he delegates one.

## Git conventions
Same as the backend: verify branch + `pwd` before committing, **stage explicit paths only (never `git add -A`)**, new branch per piece of work from `main`, PRs are frozen once handed to Alex, `package-lock.json` noise → `git checkout -- package-lock.json`. Never commit `node_modules/`, `dist/`, `.env*`.

## Don't touch
`node_modules/`, `dist/`, `.env*` files, `components/ui/*` internals (restyle via tokens instead).
