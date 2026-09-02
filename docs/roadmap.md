[🇫🇷 Version française](roadmap.fr.md) | 🇬🇧 English version

---

# Roadmap: CC-Beacon

**Type:** Historical roadmap, fully closed through v2.0.0
**Source:** git tags and release history

> Both major versions are complete. This file is kept as a historical record; see
> the [README](../README.md#roadmap) for a short synthesis and current status.

---

## v1.0.0 — nginx + rsync

- [x] **Phase 1** — Repository structure and file contents
- [x] **Phase 2** — VPS setup: nginx config, Traefik labels, directory structure
- [x] **Phase 3** — Scripts and hooks: `config.example.json`, `update_work.sh`, `settings.json` hook
- [x] **Phase 4** — Mobile interface: `web/index.html`
- [x] **Phase 5** — CLAUDE.md section describing CC-Beacon for future sessions
- [x] **Phase 6** — Traefik harmonization, prod deployment fix, automated CI/CD deploy via GitHub Actions
- [x] **Phase 7** — Mobile interface improvements: dark mode, WCAG AA contrast, accessible tap targets, unified font scale
- [x] **Phase 8** — Security hardening: JS extracted to `app.js` for strict CSP, `badge()` XSS fix, token removed from error messages, security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

## v2.0.0 — FastAPI + GHCR

- [x] **Phase 1** — FastAPI container replacing nginx: `api/` package (auth, routes, storage, models), pytest suite, Dockerfile, ruff/mypy/pre-commit quality tooling
- [x] **Phase 2** — `update_work.sh` migrated from rsync/SSH to an HTTP client of the new API
- [x] **Phase 3** — `web/app.js`: Bearer token auth (never carried in a URL), delete UI for projects and sl1
- [x] **Phase 4** — CI/CD cutover: nginx removed, GHCR image build/push, `ci.yml` + `build-push.yml` replacing `deploy.yml`
- [x] **Phase 5** — Security hardening: path-traversal fix in work ids (CWE-22), auto-generated API docs disabled, HSTS/Permissions-Policy headers, `pip-audit` in CI, bounded field sizes, structured server-side logging with a global exception handler
- [x] **Phase 6** — Design consolidation: unified type scale, de-duplicated dark palette, error-state progress color, view-scoped live indicator, in-app confirmation sheet replacing native `confirm()`, keyboard/screen-reader accessibility, manual dark/light toggle
- [x] **Phase 7** — Documentation and `v2.0.0` release prep
