[🇫🇷 Version française](README.fr.md) | 🇬🇧 English version

---

# CC-Beacon

> *A lightweight Claude Code task tracker — structured JSON files deployed to a VPS via rsync, served behind Traefik, and readable from any smartphone.*

![Status](https://img.shields.io/badge/Status-In%20Progress-yellow)

---

## Concept

Standard Claude Code sessions produce a stream of steps and decisions that are invisible once the terminal closes. **CC-Beacon** makes that work visible: every session writes a structured JSON file (a *work*) describing its steps, status, and duration. Those files are pushed to a VPS and displayed through a mobile-first HTML page — no app, no backend framework, just static files and a token-protected URL saved as a bookmark.

The tracking hierarchy is intentionally flat:

```
project
└── sl1  (label is configurable: "module", "feature", "component"…)
    └── work
        └── steps
```

---

## How it works

1. **Claude Code hook** — a `Stop` hook in `~/.claude/settings.json` calls `scripts/update_work.sh` at the end of each session
2. **rsync over SSH** — the script pushes the work JSON file and a regenerated index to the VPS
3. **nginx + Traefik** — static files are served under a secret token path (`/TOKEN/`), behind a Traefik reverse proxy with automatic TLS
4. **Mobile interface** — `web/index.html` fetches the index and renders project/sl1/work views with pagination and auto-refresh when a work is `in_progress`

---

## Progress calculation

**Work** — `steps done / steps total`

**SL1**
- Phase 1 (fewer than 2 completed works on this sl1): `works done / works total`
- Phase 2 (2 or more completed works): weighted by rolling average duration
  - Weight of each work = its actual duration (`started_at` → `updated_at`)
  - Estimated duration of remaining works = average of completed works on this sl1
  - Formula: `Σ duration of completed works / Σ estimated duration of all works`

**Project** — simple average of all sl1 progress values

---

## Data structure

### Work file (one per session)

```json
{
  "id": "2026-06-03T10-00-00",
  "project": "project-name",
  "sl1": "sl1-name",
  "title": "…",
  "status": "pending | in_progress | done | error",
  "started_at": "2026-06-03T10:00:00Z",
  "updated_at": "2026-06-03T10:42:00Z",
  "steps": [
    { "label": "…", "status": "pending | in_progress | done", "at": "…" }
  ],
  "summary": "free text"
}
```

### Index file (regenerated on every update)

```json
{
  "works": [
    { "id": "…", "project": "…", "sl1": "…", "title": "…", "status": "…" }
  ],
  "page": 1,
  "per_page": 10,
  "total": 24
}
```

---

## Project structure

```
~/projets/CC-Beacon/          ← this repo
├── docs/
│   └── work-in-progress/     ← planning notes
├── scripts/
│   └── update_work.sh        ← rsync deployment script (reads ~/.CC-Beacon/config.json)
├── web/
│   └── index.html            ← mobile interface
├── config.example.json       ← versioned template (no sensitive values)
├── .gitignore
└── README.md

~/.CC-Beacon/                 ← outside the repo, never committed
└── config.json               ← real values: VPS host, SSH user, token, sl1 labels
```

---

## Configuration

`config.example.json` is the versioned template. Copy it to `~/.CC-Beacon/config.json` and fill in the real values.

```json
{
  "vps_host": "your-vps-hostname-or-ip",
  "vps_user": "your-ssh-user",
  "remote_path": "/var/www/CC-Beacon/works/",
  "token": "your-secret-token",
  "base_url": "https://beacon.your-domain.com",
  "sl1_label": "module"
}
```

`~/.CC-Beacon/` is excluded from the repo via `.gitignore`.

---

## VPS setup

The VPS serves static files through an nginx container behind Traefik:

- Files are stored under `/var/www/CC-Beacon/works/`
- nginx exposes them at `/TOKEN/` (token acts as a secret path prefix)
- Traefik handles the subdomain (`beacon.your-domain.com`) and TLS via Let's Encrypt
- The SSH user used by rsync must have write access to the `works/` directory

Detailed setup is covered in the Phase 2 planning document (`docs/work-in-progress/`).

---

## Claude Code integration

Add the following hook to `~/.claude/settings.json` so the script runs automatically at the end of each Claude Code session:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/projets/CC-Beacon/scripts/update_work.sh"
          }
        ]
      }
    ]
  }
}
```

---

## Interface

`web/index.html` is a single-file mobile-first app (vanilla HTML/CSS/JS, no build step):

| View | Description |
|------|-------------|
| **Projects** | List of projects with aggregated progress bar |
| **SL1** | List of sl1 entries for a project, with weighted progress |
| **Works** | Paginated list of works for an sl1, with step detail |

When any work has `status: in_progress`, the page automatically refreshes every 30 seconds.

---

## Roadmap

- [ ] **Phase 1** — Repository structure and file contents
- [ ] **Phase 2** — VPS setup: nginx config, Traefik labels, directory structure
- [ ] **Phase 3** — Scripts and hooks: `config.example.json`, `update_work.sh`, `settings.json` hook
- [ ] **Phase 4** — Mobile interface: `web/index.html`
- [ ] **Phase 5** — CLAUDE.md section describing CC-Beacon for future sessions

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
