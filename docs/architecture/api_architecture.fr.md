🇫🇷 Version française | [🇬🇧 English version](api_architecture.md)

---

# Architecture : CC-Beacon

## Fonctionnement

1. **Hook Claude Code** - un hook `Stop` dans `~/.claude/settings.json` appelle `scripts/update_work.sh --sync-only` à la fin de chaque session
2. **Client HTTP** - le script pousse les mises à jour des works vers l'API (`POST /api/work`) et met en cache localement l'index retourné ; pas de SSH, pas de rsync
3. **FastAPI + Traefik** - un unique conteneur sert l'interface mobile (`GET /`, `GET /app.js`) et l'API REST (`/api/*`, protégée par `Authorization: Bearer`), derrière un reverse proxy Traefik avec TLS automatique
4. **Interface mobile** - `web/index.html` + `web/app.js` appellent l'API et affichent les vues project/sl1/work avec pagination, suppression, et rafraîchissement automatique quand un work est `in_progress`
5. **Déploiement CI/CD** - un push sur `main` déclenche `.github/workflows/ci.yml` (ruff, mypy, pytest) ; en cas de succès, `.github/workflows/build-push.yml` construit l'image de l'API, la pousse sur GHCR, et la déploie sur le VPS via SSH

## Calcul de la progression

**Work** - `étapes terminées / étapes totales`

**SL1**
- Phase 1 (moins de 2 works terminés sur ce sl1) : `works terminés / works totaux`
- Phase 2 (2 works terminés ou plus) : pondéré par une moyenne glissante des durées
  - Poids de chaque work = sa durée réelle (`started_at` -> `updated_at`)
  - Durée estimée des works restants = moyenne des works terminés sur ce sl1
  - Formule : `Somme des durées des works terminés / Somme des durées estimées de tous les works`

**Project** - moyenne simple des progressions de tous les sl1

## Structure des données

### Fichier work (un par session)

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
  "summary": "texte libre"
}
```

`completion_time` est fixé une seule fois, quand le work passe à `done` pour la première fois, et n'est jamais réécrit ensuite.

### Index (calculé à la demande par `GET /api/index` à partir de chaque fichier work - jamais persisté séparément)

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

## Structure du projet

```
~/projets/CC-Beacon/          <- ce dépôt
├── .github/
│   └── workflows/
│       ├── ci.yml             <- lint, vérification de types et tests de l'API à chaque push/PR
│       └── build-push.yml     <- construit et pousse l'image de l'API sur GHCR, déploie via SSH
├── api/
│   ├── main.py                <- app FastAPI : sert index.html/app.js, en-têtes de sécurité, /healthz
│   ├── auth.py                <- dépendance de token Bearer
│   ├── models.py               <- modèles Pydantic
│   ├── routes.py                <- endpoints /api/*
│   ├── storage.py                <- stockage JSON sur fichiers, index calculé à la volée
│   ├── tests/                     <- suite pytest
│   ├── Dockerfile
│   └── requirements*.txt, pyproject.toml
├── docs/
│   └── ai/                   <- notes de travail IA (ignorées par git)
├── ops/
│   └── compose.env.example   <- modèle pour compose/.env sur le VPS
├── scripts/
│   └── update_work.sh        <- client HTTP pour l'API
├── web/
│   ├── index.html            <- interface mobile (HTML + CSS)
│   └── app.js                <- logique applicative
├── docker-compose.prod.yml   <- conteneur api + labels Traefik (prod)
├── config.example.json       <- modèle versionné (aucune valeur sensible)
├── .pre-commit-config.yaml
├── .gitignore
└── README.md

~/.CC-Beacon/                 <- hors du dépôt, jamais commité
├── config.json               <- vraies valeurs : base_url, token
└── works/
    └── index.json             <- cache local de l'index de l'API (pas une source de vérité)
```
