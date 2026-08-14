# DiRxctional Frontend (dirxtionalui)

## What This Is
React/Vite frontend for **DiRxctional** — a HIPAA-compliant specialty-pharmacy referral platform. Serves both clinic users (referral upload, status tracking) and internal admin users (review queue, deliver to pharmacy, PA tracking).

Production: `https://app.dirxctional.com` (CloudFront → nginx → static files on EC2)
Backend API: `https://app.dirxctional.com/api/*` → Flask on EC2 (separate repo: `~/clinical-api`)

## Tech Stack
- **Vite 5** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** components (with Radix primitives)
- **react-router** for routing
- **TanStack Query** for server state (most likely — confirm in package.json)
- **react-hook-form** + **zod** for forms
- **lucide-react** for icons

## How This Repo Is Maintained

**As of 2026-06-04, all changes happen in local Claude Code** — no longer Lovable. Lovable was used through May 2026 to scaffold the v1 UI; it was disconnected from this repo on 2026-06-04 after Lovable's "regenerate from snapshot" model started overwriting hand-edited code.

This means:
- Edit files directly in `~/dirxtionalui/` (or wherever this repo is checked out)
- Real commit messages — no more "Changes" placeholders
- `gitnexus impact` works on the React code, not just backend
- `npm run dev` for live local preview (Vite HMR)
- Same workflow as the backend repo (`~/clinical-api`)

## Quick Restart

**Local dev server (proven workflow, see `dev.sh` for the script):**

The setup runs Vite on EC2 (where it can reach Flask + RDS) and uses SSM port-forwarding to make it appear on your Mac at `localhost:8080`. **One command on EC2, one on Mac, open browser.**

```bash
# On EC2 (SSM session):
cd ~/dirxtionalui
./dev.sh                       # clears Vite cache, checks Flask, starts dev server on 0.0.0.0:8080
```

```bash
# On Mac:
aws ssm start-session --target i-0e8596fe46db91799 --region us-east-2 \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["8080"],"localPortNumber":["8080"]}'
```

```bash
# Then browser:
open http://localhost:8080
```

**That's the whole thing.** Hot reload, real backend, real Cognito auth. Leave both SSM sessions running while you work.

**Why this works without CORS or env-var debugging:**
- `src/lib/api.ts` defaults `API_BASE_URL` to `/api` (a relative path) when `VITE_API_URL` isn't set
- `vite.config.ts` has a proxy that forwards `/api/*` → `http://localhost:5000` on EC2 (where Flask runs via systemd)
- Same-origin from the browser's POV → no CORS issue
- The proxy sets `X-Forwarded-Proto: https` so Talisman doesn't HTTPS-redirect the request
- The proxy also rewrites any absolute `https://localhost:5000/...` redirects Flask sends back, so the browser follows them through the proxy

**`.env` file:** if `.env` has `VITE_API_URL=https://app.dirxctional.com/api` (the prod default), local dev will try to hit prod and CORS-fail. Either delete that line for local dev or override with a `.env.local`. The `/api` fallback in `api.ts` means leaving `VITE_API_URL` unset entirely is fine.

**Vite dev server vs the older `npm run dev`:**
- `npm run dev` directly works too, BUT it doesn't clear `node_modules/.vite` first. After changing `.env` files or running into stale-cache issues, always prefer `./dev.sh`.
- `dev.sh` is idempotent — run it every time, no harm done.

**Common gotchas (we burned hours on these — see below):**
- **`localhost:5000` connection-refused** — `import.meta.env.VITE_API_URL` is undefined AND your api.ts fallback is still `'http://localhost:5000'`. Pull latest, the fallback is `'/api'` now.
- **302 redirect to `https://localhost:5000/...`** — proxy isn't sending `X-Forwarded-Proto: https`. Pull latest `vite.config.ts`.
- **"I see the old design after pulling"** — browser is caching JS chunks. DevTools → Network → check "Disable cache" → reload.
- **`AuthUserPoolException: Auth UserPool not configured`** — your `.env` file is missing the `VITE_COGNITO_*` vars. Restore from `.env.prod-backup` or recreate them.
- **Vite isn't running but you see "Lovable design"** — you're hitting `https://app.dirxctional.com` (production) instead of `localhost:8080`. Type the URL by hand.

**Production build (on EC2):**
```bash
cd ~/dirxtionalui
git pull origin main
./build-prod.sh
# build-prod.sh wraps:
#   NODE_OPTIONS="--max-old-space-size=1024"  (fits t3.small RAM)
#   VITE_OUT_DIR=/var/www/dirxctional         (nginx root)
#   npm run build
# Output lands directly in /var/www/dirxctional — no rsync step needed.
```

**After production build, invalidate CloudFront** (from Mac terminal — EC2 role doesn't have CloudFront perms by design):
```bash
aws cloudfront create-invalidation --distribution-id E3LI28U8NDAYZF --paths "/" "/index.html"
```

Then hard-refresh `app.dirxctional.com` (Cmd-Shift-R) — new bundle hashes should be served immediately.

## Source of Truth Lives in the Backend Repo's CLAUDE.md

Don't duplicate context here. The backend repo (`~/clinical-api/CLAUDE.md`) is the canonical project doc. For frontend work, read:
- This file (`~/dirxtionalui/CLAUDE.md`) — frontend-specific conventions
- `~/clinical-api/CLAUDE.md` — full project context, HIPAA rules, status state machine, etc.
- Obsidian vault at `7 - Projects/DiRxtional/` — Resume, Current State, Tribal Knowledge, etc.

## Key Files

### Entry
- `src/main.tsx` — root render
- `src/App.tsx` — routes + providers (AuthProvider, QueryClient, etc.)
- `index.html` — Vite entry; references hashed bundles in `dist/` (local) or `/var/www/dirxctional/assets/` (prod)

### Pages
- `src/pages/clinic/*` — clinic-user-facing routes
  - Upload wizard (Step 1 documents → Step 2 bridge program → Step 3 pharmacy → Step 4 review)
  - Referrals list + detail
  - Patients list + detail
  - Services / settings
- `src/pages/admin/*` — internal-admin-facing routes
  - Referral review queue
  - Deliver to pharmacy
  - PA tracking
  - Pharmacies admin
  - Clinics admin

### Components
- `src/components/ui/*` — shadcn primitives (Button, Card, Table, Dialog, etc.) — generally don't edit these directly; restyle via tokens
- `src/components/*` — feature components
- `src/lib/api.ts` — API client wrapper (axios or fetch) that hits backend endpoints under `/api/*`

### Theme
- `tailwind.config.ts` — design tokens, font families, colors via CSS custom props
- `src/index.css` — CSS custom properties (--background, --foreground, --primary, etc.) + global styles

### Configuration
- `vite.config.ts` — Vite config (build outDir is env-driven via `VITE_OUT_DIR`)
- `build-prod.sh` — production build wrapper for EC2
- `tsconfig.json` — TypeScript config
- `components.json` — shadcn/ui config (theme path, alias)

## Critical Rules

### HIPAA — same standards as backend
- **No PHI in localStorage / sessionStorage / cookies** — auth tokens only via httpOnly cookies set by Cognito
- **No PHI in client-side console logs** — even in dev (commits can leak)
- **No PHI in error messages** — generic UI error states, real details in audit_events server-side
- **Never call backend endpoints without auth header** (Cognito JWT) — backend will reject, but enforce client-side too
- **Always paginate large lists** — never fetch entire referral history at once
- **Never bypass clinic_id scoping** — backend enforces, but UI should too (don't surface "all clinics" views to clinic users)

### Status state machine
Referral statuses: `uploaded` → `processing` → `ready_for_review` → `approved_to_send` / `rejected` → `sent_to_pharmacy`
PA statuses: `null` → `pending` → `approved` / `denied`

If a new status value is added on the backend, update:
- `src/components/StatusBadge.tsx`
- `src/components/PAStatusBadge.tsx`
- Tab filters in referral list pages
- `dataMapper` (if it exists, for normalization)
Same applies if a status is removed.

### Component library
- **shadcn/ui is the base** — when adding new component patterns, prefer composing from shadcn primitives over installing new libraries
- **Lucide for icons** — don't pull in Heroicons or Phosphor
- **Tailwind utilities for one-off styling** — don't create new global classes unless they appear 3+ times

### Forms
- **`react-hook-form` + `zod` schema validation** — don't use raw HTML form events or Formik
- **Always validate on submit AND blur** — clinics make typos, catch early
- **Show errors inline below the field** — not as a single error banner at the top

### Routing
- **react-router** (whatever version is installed)
- Lazy-load admin routes — most clinic users never see them; saves ~20% of bundle
- Clinic-scoped routes prefixed `/clinic/*`; admin-scoped routes `/admin/*`
- Auth guards on every protected route (check Cognito session)

### Build / deploy
- **Bundle size warning is OK for now** — 2.5MB raw / 625KB gzipped. Post-pilot, code-split admin routes for the 50% win.
- **Don't add heavy dependencies casually** — Moment.js, lodash, big charting libraries (recharts is already in). Discuss before adding.

## Deployment Notes (history of pain)

### `npm run build` writes to env-driven path
`vite.config.ts` uses `outDir: process.env.VITE_OUT_DIR || 'dist'`. Locally builds go to `./dist/`; production sets `VITE_OUT_DIR=/var/www/dirxctional` so the build writes directly to nginx's served path. **No rsync step needed.**

Before 2026-05-13, `outDir` was hardcoded to `'dist'` and a manual `rsync` step copied it to `/var/www/dirxctional/`. That step was easy to forget → led to a week of silent deploy failures. The current env-driven outDir prevents that class of bug.

### EC2 is t3.small (was t3.micro)
t3.small (2GB RAM) gives enough headroom for Vite production builds. Previously, t3.micro (1GB) needed `--max-old-space-size=1024` heap cap AND Flask had to be stopped first to free RAM. `build-prod.sh` still sets the heap cap defensively, but Flask no longer needs to stop. (As of 2026-06-04.)

### Don't use the top-level repo path on EC2 for any build target
Before, nginx served from `/var/www/dirxctional/` while builds wrote to `~/dirxtionalui/dist/`. Files never made it across without manual rsync. Today: `VITE_OUT_DIR` covers this. Don't reintroduce a separate `dist/` flow.

## Local dev workflow (the new normal)

1. **Pull latest**
   ```bash
   cd ~/dirxtionalui && git pull
   ```
2. **Edit files** in your editor or via Claude Code
3. **Live preview** (optional but recommended for visual work)
   ```bash
   npm run dev
   ```
4. **Test against local backend** — point Vite proxy or env vars at your local Flask if needed, otherwise hits prod `https://app.dirxctional.com/api/*`
5. **Commit + push** with a meaningful message
6. **Deploy to EC2**
   ```bash
   ssh ec2  # or whichever SSM method
   cd ~/dirxtionalui && git pull && ./build-prod.sh
   ```
7. **Invalidate CloudFront** (from Mac terminal)
   ```bash
   aws cloudfront create-invalidation --distribution-id E3LI28U8NDAYZF --paths "/" "/index.html"
   ```
8. **Verify in browser** — hard-refresh, check Network tab for new hashed bundle

That's the loop. Same as the backend, just with the extra build + CloudFront invalidation steps.

## What NOT to Touch

- **`node_modules/`** — never commit; `.gitignore` already covers it
- **`dist/`** (local builds) — also in `.gitignore`
- **`package-lock.json` mods that just show as "modified" with no real diff** — those are noise from `npm install` on different machines; `git checkout -- package-lock.json` to revert
- **`lovable-tagger` package + the `componentTagger()` plugin call in `vite.config.ts`** — only active in dev mode, harmless to leave. If you want to clean it up later, just remove from `vite.config.ts` plugins array and uninstall the package. Not urgent.

## Model Usage Policy (Alex, 2026-08-14)

- Thinking/design/debug-strategy → main model (Fable/Opus tier). Coding/implementation/mechanical sweeps → delegate to **Sonnet** subagents (Agent tool, `model: "sonnet"`) when the spec is clear. Fable audits every Sonnet diff before PR.
