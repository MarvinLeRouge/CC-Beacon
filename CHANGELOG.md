# Changelog

All notable changes to this project are documented in this file, generated from
[Conventional Commits](https://www.conventionalcommits.org) history with [git-cliff](https://git-cliff.org).
Releases are grouped by tag; unreleased commits (if any) appear under "Unreleased".

To regenerate locally, run `npx git-cliff -o CHANGELOG.md`.
## [unreleased]

### 📚 Documentation

- *(ci)* Add Codecov, sync README with GeoChallenge-Tracker's structure
- *(changelog)* Add git-cliff configuration
- *(changelog)* Generate CHANGELOG.md from commit history
- *(roadmap)* Extract roadmap detail out of README
- *(roadmap)* Add French roadmap detail
- *(readme)* Link out to docs/roadmap.md instead of inlining it
- *(readme)* Link out to docs/roadmap.fr.md instead of inlining it
- *(security)* Add vulnerability disclosure policy
- *(security)* Add French vulnerability disclosure policy

### ⚙️ Miscellaneous Tasks

- *(changelog)* Add automated changelog workflow
- Standardize AI working notes folder to docs/work-in-progress
## [2.0.0] - 2026-08-04

### 🚀 Features

- *(api)* Add FastAPI container replacing nginx static serving
- *(scripts)* Migrate update_work.sh from rsync to the FastAPI API
- *(web)* Add Bearer auth and delete UI to the mobile interface
- *(ops)* Cut over from nginx/rsync to FastAPI/GHCR deployment
- *(web)* Warn explicitly when deleting a project's only sl1
- *(web)* Design consolidation pass and manual dark/light toggle

### 🐛 Bug Fixes

- *(api)* Stop crashing on stray legacy index.json, add error logging
- *(api)* Reject path-traversal characters in work id (CWE-22)

### 💼 Other

- *(api)* Disable the auto-generated public API docs
- *(api)* Bound request field sizes

### 📚 Documentation

- Document v2 security/design work, restructure roadmap, prep v2.0.0

### ⚙️ Miscellaneous Tasks

- *(ops)* Defer deploy surface changes to the CI/CD phase
- *(docker)* Move .dockerignore to the repo root to match the build context
- *(ci)* Add pip-audit dependency vulnerability scan

### 🛡️ Security

- *(api)* Add Strict-Transport-Security and Permissions-Policy headers
- *(api)* Suppress the Server response header
## [1.0.0] - 2026-07-07

### 🚀 Features

- *(phase-1)* Add repo structure, config template and deploy script
- *(phase-2)* Add VPS docker-compose, nginx template and update config example
- *(phase-3)* Add --sync-only flag to update_work.sh for Stop hook
- *(phase-4)* Mobile interface and enriched index
- *(phase-4)* Completion_time in JSON, estimated end in interface
- *(infra)* Harmonize Traefik configuration for prod deployment
- *(ci)* Add deploy workflow

### 🐛 Bug Fixes

- *(interface)* Sl1Progress returns 1 when all works done, fallback if avg duration is zero
- *(interface)* Simplify work card meta — remove redundant elapsed time
- *(interface)* Reload immediately on tab focus when a work is in_progress

### 💼 Other

- *(web)* Extract inline script, fix badge injection, remove token from error
- *(nginx)* Add CSP, X-Content-Type-Options and X-Frame-Options headers
- *(nginx)* Add Referrer-Policy no-referrer header

### 🚜 Refactor

- *(phase-2)* Replace static nginx conf with envsubst template

### 📚 Documentation

- Update READMEs to reflect delivered state
- Missing license file
- Added screenshots
- *(vps)* Document compose/.env requirement and fix nginx config
- Update READMEs to reflect CI/CD deploy workflow
- Update READMEs for phases 6-8 and app.js extraction
- Enrich README badges with stack, CI/CD and license

### 🎨 Styling

- *(web)* Add dark mode and fix orange indicator contrast
- *(web)* Add step icon status colors and increase back button tap target
- *(web)* Polish pass — motion, font scale, progress label
