# Claude Code — Dirxctional frontend

**Read `AGENTS.md` first** (canonical for this repo) and `~/clinical-api/AGENTS.md` (project-wide rules). This file adds only Claude-specific notes.

- **Address Alex by name** in every reply (he runs several tabs).
- **Model policy:** design/debug strategy on the main model; well-specified implementation delegated to **Sonnet** subagents that work directly in this repo (explicit-path commits, never push); the delegating model audits the diff before any PR.
- **Typecheck is `npx tsc -p tsconfig.app.json --noEmit`** — the root `tsconfig.json` is references-only, so the plain command passes vacuously. Put the real command in every Sonnet spec.
- **Visual verification:** for UI changes, run `npx vite preview` and screenshot with the Playwright MCP before calling it done. Note the marketing site serves a strict CSP in production that local preview does not — embed/third-party checks must be repeated against the deployed headers.
- Vault Tier Protocol (`Resume.md` first, `/log` at session end) applies here too — the DiRxtional project folder is shared with the backend.
