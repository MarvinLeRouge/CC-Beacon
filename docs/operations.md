[🇫🇷 Version française](operations.fr.md) | 🇬🇧 English version

---

# Operations Guide: CC-Beacon

**Scope:** Deployment (dev and prod), server layout, configuration.

> This document covers *how to run the system in production*. For local development, see the root [`README.md`](../README.md).

---

## Deployment

### Dev

Run the API directly with `uvicorn api.main:app --reload --port 8000` (see [`CONTRIBUTING.md`](../CONTRIBUTING.md)). No Docker Compose stack is needed for local development.

### Prod: pipeline

Production deploys are fully automated via GitHub Actions, in two chained workflows:

1. **CI** (`.github/workflows/ci.yml`) runs on every push/PR to `main`: lint (Ruff), type checks (Mypy), tests with coverage, dependency vulnerability scan (`pip-audit`).
2. **Build, Push & Deploy** (`.github/workflows/build-push.yml`) runs automatically once CI succeeds on `main` (`workflow_run` trigger), or can be triggered manually (`workflow_dispatch`), which bypasses the CI gate for hotfixes, rollbacks, or redeploys.
   - **Build & push**: the API's Docker image is built and pushed to GHCR, tagged both `sha-<7-char-commit-sha>` and `latest` (`ghcr.io/marvinlerouge/cc-beacon-api`).
   - **Deploy**: an SSH step on the production host fetches `docker-compose.prod.yml` directly from `raw.githubusercontent.com`, pinned to the exact commit SHA being deployed, then runs `docker compose pull` followed by `docker compose up -d --remove-orphans`.

### Prod: topology

Routing goes through Traefik (TLS via Let's Encrypt), on a single host-based rule: `Host(${DOMAIN})` routed to the `api` container, which also serves the static mobile interface (`web/`) alongside the JSON API.

### Prod: server layout

On the deploy host:

```
~/your-traefik-basedir/cc-beacon/
├── compose/
│   ├── docker-compose.yml          ← copy of docker-compose.prod.yml, fetched fresh on every deploy
│   └── .env                        ← DOMAIN=your-domain.com (never committed)
└── shared/
    ├── env/
    │   └── secrets.env             ← TOKEN=your-secret-token (never committed)
    └── data/
        └── works/                  ← the API's persistent storage (one JSON file per work)
```

Two separate env files, two separate purposes:
- `compose/.env` - read by `docker compose` at startup for label interpolation (`${DOMAIN}` in Traefik labels). See [`ops/compose.env.example`](../ops/compose.env.example) for the template.
- `shared/env/secrets.env` - passed to the `api` container as `TOKEN`, read directly by the FastAPI app.

Generate a token with:

```bash
openssl rand -hex 24
```

Start the container:

```bash
cd ~/your-traefik-basedir/cc-beacon/compose && docker compose pull && docker compose up -d
```

## Configuration

`config.example.json` is the versioned template. Copy it to `~/.CC-Beacon/config.json` and fill in the real values:

```json
{
  "token": "your-secret-token",
  "base_url": "https://beacon.your-domain.com",
  "sl1_label": "module"
}
```

`~/.CC-Beacon/` is excluded from the repo via `.gitignore`.
