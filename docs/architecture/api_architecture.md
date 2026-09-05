[🇫🇷 Version française](api_architecture.fr.md) | 🇬🇧 English version

---

# Architecture: CC-Beacon

## How it works

1. **Claude Code hook** - a `Stop` hook in `~/.claude/settings.json` calls `scripts/update_work.sh --sync-only` at the end of each session
2. **HTTP client** - the script pushes work updates to the API (`POST /api/work`) and caches the returned index locally; no SSH, no rsync
3. **FastAPI + Traefik** - a single container serves the mobile interface (`GET /`, `GET /app.js`) and the REST API (`/api/*`, protected by `Authorization: Bearer`), behind a Traefik reverse proxy with automatic TLS
4. **Mobile interface** - `web/index.html` + `web/app.js` call the API and render project/sl1/work views with pagination, deletion, and auto-refresh when a work is `in_progress`
5. **CI/CD deploy** - pushing to `main` triggers `.github/workflows/ci.yml` (ruff, mypy, pytest); on success, `.github/workflows/build-push.yml` builds the API image, pushes it to GHCR, and deploys it to the VPS over SSH

## Progress calculation

**Work** - `steps done / steps total`

**SL1**
- Phase 1 (fewer than 2 completed works on this sl1): `works done / works total`
- Phase 2 (2 or more completed works): weighted by rolling average duration
  - Weight of each work = its actual duration (`started_at` -> `updated_at`)
  - Estimated duration of remaining works = average of completed works on this sl1
  - Formula: `Sum of duration of completed works / Sum of estimated duration of all works`

**Project** - simple average of all sl1 progress values

## Data structure

### Work file (one per session)

```json
{
  "id": "2026-06-03T10-00-00",
  "project": "project-name",
  "sl1": "sl1-name",
  "title": "...",
  "status": "pending | in_progress | done | error",
  "started_at": "2026-06-03T10:00:00Z",
  "updated_at": "2026-06-03T10:42:00Z",
  "completion_time": "2026-06-03T10:42:00Z",
  "steps": [
    { "label": "...", "status": "pending | in_progress | done", "at": "..." }
  ],
  "summary": "free text"
}
```

`completion_time` is set once when the work first transitions to `done` and never overwritten.

### Index (computed on demand by `GET /api/index` from every work file - never persisted separately)

```json
{
  "works": [
    {
      "id": "...",
      "project": "...",
      "sl1": "...",
      "title": "...",
      "status": "...",
      "started_at": "...",
      "updated_at": "...",
      "completion_time": "...",
      "step_count": 4,
      "steps_done": 3
    }
  ],
  "page": 1,
  "per_page": 10,
  "total": 24
}
```

## Project structure

```
~/projets/CC-Beacon/          <- this repo
├── .github/
│   └── workflows/
│       ├── ci.yml             <- lint, type-check and test the API on every push/PR
│       └── build-push.yml     <- builds and pushes the API image to GHCR, deploys over SSH
├── api/
│   ├── main.py                <- FastAPI app: serves index.html/app.js, security headers, /healthz
│   ├── auth.py                <- Bearer token dependency
│   ├── models.py               <- Pydantic models
│   ├── routes.py                <- /api/* endpoints
│   ├── storage.py                <- JSON file storage, index computed on the fly
│   ├── tests/                     <- pytest suite
│   ├── Dockerfile
│   └── requirements*.txt, pyproject.toml
├── docs/
│   └── ai/                   <- AI working notes (gitignored)
├── ops/
│   └── compose.env.example   <- template for compose/.env on the VPS
├── scripts/
│   └── update_work.sh        <- HTTP client for the API
├── web/
│   ├── index.html            <- mobile interface (HTML + CSS)
│   └── app.js                <- application logic
├── docker-compose.prod.yml   <- api container + Traefik labels (prod)
├── config.example.json       <- versioned template (no sensitive values)
├── .pre-commit-config.yaml
├── .gitignore
└── README.md

~/.CC-Beacon/                 <- outside the repo, never committed
├── config.json               <- real values: base_url, token
└── works/
    └── index.json             <- local cache of the API's index (not a source of truth)
```
