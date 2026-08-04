🇫🇷 Version française | [🇬🇧 English version](README.md)

---

# CC-Beacon

> *Un outil léger de suivi de tâches Claude Code — un service FastAPI sur un VPS stockant des fichiers JSON structurés, servi derrière Traefik, consultable depuis un smartphone.*

![Statut](https://img.shields.io/badge/Statut-production-brightgreen)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-api-009688?logo=fastapi&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)
[![CI](https://github.com/MarvinLeRouge/CC-Beacon/actions/workflows/ci.yml/badge.svg)](https://github.com/MarvinLeRouge/CC-Beacon/actions/workflows/ci.yml)
[![Deploy](https://github.com/MarvinLeRouge/CC-Beacon/actions/workflows/build-push.yml/badge.svg)](https://github.com/MarvinLeRouge/CC-Beacon/actions/workflows/build-push.yml)
![Licence](https://img.shields.io/github/license/MarvinLeRouge/CC-Beacon?cacheSeconds=3600)

---

## Concept

Les sessions Claude Code produisent un flux d'étapes et de décisions qui disparaissent dès que le terminal se ferme. **CC-Beacon** rend ce travail visible : chaque session écrit un fichier JSON structuré (un *work*) décrivant ses étapes, son statut et sa durée, poussé en HTTP vers un petit service FastAPI. L'API est l'unique source de vérité : elle stocke les données, calcule l'index et sert elle-même l'interface mobile, le tout derrière une API protégée par token Bearer et une URL mise en favori.

La hiérarchie de suivi est intentionnellement simple :

```
projet
└── sl1  (label configurable : "module", "feature", "composant"…)
    └── work
        └── steps
```

---

## 📸 Copies d'écran

### Vue projets

[![Vue projets](docs/screenshots/projects.png)](docs/screenshots/projects.png)

### Vue SL1 — Tous les modules d'un projet

[![Vue SL1 — Tous les modules d'un projet](docs/screenshots/sl1.png)](docs/screenshots/sl1.png)

### Vue works — Tous les works repliés

[![Vue works — Tous les works repliés](docs/screenshots/works.png)](docs/screenshots/works.png)

### Vue works — Work fini déplié

[![Vue works — Work fini déplié](docs/screenshots/work-done.png)](docs/screenshots/work-done.png)

### Vue works — Work en cours déplié

[![Vue works — Work en cours déplié](docs/screenshots/work-in-progress.png)](docs/screenshots/work-in-progress.png)

---


## Fonctionnement

1. **Hook Claude Code** — un hook `Stop` dans `~/.claude/settings.json` appelle `scripts/update_work.sh --sync-only` à la fin de chaque session
2. **Client HTTP** — le script pousse les mises à jour vers l'API (`POST /api/work`) et met en cache l'index renvoyé localement ; plus de SSH, plus de rsync
3. **FastAPI + Traefik** — un seul container sert l'interface mobile (`GET /`, `GET /app.js`) et l'API REST (`/api/*`, protégée par `Authorization: Bearer`), derrière un reverse proxy Traefik avec TLS automatique
4. **Interface mobile** — `web/index.html` + `web/app.js` appellent l'API et affichent les vues projet/sl1/work avec pagination, suppression et rafraîchissement automatique quand un work est `in_progress`
5. **Deploy CI/CD** — un push sur `main` déclenche `.github/workflows/ci.yml` (ruff, mypy, pytest) ; en cas de succès, `.github/workflows/build-push.yml` construit l'image de l'API, la pousse sur GHCR et la déploie sur le VPS via SSH

---

## Calcul de progression

**Work** — `steps terminées / steps totales`

**SL1**
- Phase 1 (moins de 2 works terminés sur ce sl1) : `works terminés / works totaux`
- Phase 2 (2 works terminés ou plus) : pondération par durée moyenne glissante
  - Poids de chaque work = sa durée réelle (`started_at` → `updated_at`)
  - Estimation des works restants = moyenne des works terminés sur ce sl1
  - Formule : `Σ durée works terminés / Σ durée estimée tous les works`

**Projet** — moyenne simple de la progression de tous ses sl1

---

## Structure des données

### Fichier work (un par session)

```json
{
  "id": "2026-06-03T10-00-00",
  "project": "nom-du-projet",
  "sl1": "nom-du-sl1",
  "title": "…",
  "status": "pending | in_progress | done | error",
  "started_at": "2026-06-03T10:00:00Z",
  "updated_at": "2026-06-03T10:42:00Z",
  "completion_time": "2026-06-03T10:42:00Z",
  "steps": [
    { "label": "…", "status": "pending | in_progress | done", "at": "…" }
  ],
  "summary": "texte libre"
}
```

`completion_time` est fixé une seule fois lors du premier passage à `done` et n'est jamais écrasé.

### Index (calculé à la demande par `GET /api/index` à partir des fichiers work — jamais persisté séparément)

```json
{
  "works": [
    {
      "id": "…",
      "project": "…",
      "sl1": "…",
      "title": "…",
      "status": "…",
      "started_at": "…",
      "updated_at": "…",
      "completion_time": "…",
      "step_count": 4,
      "steps_done": 3
    }
  ],
  "page": 1,
  "per_page": 10,
  "total": 24
}
```

---

## Structure du projet

```
~/projets/CC-Beacon/          ← ce repo
├── .github/
│   └── workflows/
│       ├── ci.yml             ← lint, typage et tests de l'API à chaque push/PR
│       └── build-push.yml     ← construit et pousse l'image de l'API sur GHCR, déploie via SSH
├── api/
│   ├── main.py                ← app FastAPI : sert index.html/app.js, headers de sécurité, /healthz
│   ├── auth.py                ← dépendance Bearer
│   ├── models.py               ← modèles Pydantic
│   ├── routes.py                ← endpoints /api/*
│   ├── storage.py                ← stockage JSON, index calculé à la volée
│   ├── tests/                     ← suite pytest
│   ├── Dockerfile
│   └── requirements*.txt, pyproject.toml
├── docs/
│   └── ai/                   ← notes de travail IA (gitignored)
├── ops/
│   └── compose.env.example   ← template pour compose/.env sur le VPS
├── scripts/
│   └── update_work.sh        ← client HTTP pour l'API
├── web/
│   ├── index.html            ← interface mobile (HTML + CSS)
│   └── app.js                ← logique applicative
├── docker-compose.prod.yml   ← container api + labels Traefik (prod)
├── config.example.json       ← template versionné (sans valeurs sensibles)
├── .pre-commit-config.yaml
├── .gitignore
└── README.md

~/.CC-Beacon/                 ← hors repo, jamais commité
├── config.json               ← valeurs réelles : base_url, token
└── works/
    └── index.json             ← cache local de l'index de l'API (pas une source de vérité)
```

---

## Configuration

`config.example.json` est le template versionné. Il suffit de le copier dans `~/.CC-Beacon/config.json` et de renseigner les valeurs réelles.

```json
{
  "token": "your-secret-token",
  "base_url": "https://beacon.your-domain.com",
  "sl1_label": "module"
}
```

`~/.CC-Beacon/` est exclu du repo via `.gitignore`.

---

## Configuration du VPS

```
~/your-traefik-basedir/cc-beacon/
├── compose/
│   ├── docker-compose.yml          ← copie de docker-compose.prod.yml
│   └── .env                        ← DOMAIN=votre-domaine.com (jamais commité)
└── shared/
    ├── env/
    │   └── secrets.env             ← TOKEN=votre-token (jamais commité)
    └── data/
        └── works/                  ← stockage persistant de l'API (un fichier JSON par work)
```

**Deux fichiers d'environnement distincts, deux rôles distincts :**
- `compose/.env` — lu par `docker compose` au démarrage pour l'interpolation des labels (`${DOMAIN}` dans les labels Traefik). Voir `ops/compose.env.example` pour le template.
- `shared/env/secrets.env` — transmis au container `api` sous forme de `TOKEN`, lu directement par l'application FastAPI.

Aucun des deux fichiers n'est jamais commité.

Générer un token :
```bash
openssl rand -hex 24
```

Démarrer le container :
```bash
cd ~/your-traefik-basedir/cc-beacon/compose && docker compose pull && docker compose up -d
```

---

## Sécurité

- **Authentification** — chaque route `/api/*` exige `Authorization: Bearer <token>`, vérifié par comparaison à temps constant ; les tentatives échouées sont limitées par IP (20/min)
- **Validation des entrées** — les id de work sont restreints à `[A-Za-z0-9_-]+` (empêche la traversée de chemin dans le dossier de stockage) ; les champs texte sont bornés en taille
- **Headers** — CSP (`script-src 'self'`, aucun script inline ou externe), HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- **Pas de docs API publiques** — `/docs`, `/redoc`, `/openapi.json` sont désactivées ; aucune raison d'exposer le schéma de l'API à des visiteurs non authentifiés
- **Aucun secret côté client** — le token vit dans `localStorage`, saisi une fois par appareil, jamais transporté dans une URL, une query string, ou un header `Referer`
- **Erreurs** — les exceptions non gérées sont loguées côté serveur avec le contexte de la requête et renvoient un message générique ; aucun détail interne ne fuit vers le client
- **Chaîne d'approvisionnement** — dépendances figées en versions exactes, scannées avec `pip-audit` en CI à chaque push/PR

---

## Intégration Claude Code

Ajouter le hook suivant dans `~/.claude/settings.json` pour que le script se synchronise automatiquement en fin de session :

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "~/projets/CC-Beacon/scripts/update_work.sh --sync-only"
          }
        ]
      }
    ]
  }
}
```

Le flag `--sync-only` ignore la création de work et se contente de rafraîchir le cache local `index.json` depuis `GET /api/index` — c'est un filet de sécurité. Pendant la session, appeler le script explicitement avec les arguments complets pour créer et mettre à jour un work.

---

## Interface

`web/index.html` + `web/app.js` forment une application mobile-first (HTML/CSS/JS vanilla, sans étape de build), servie directement par l'API. Le mode sombre suit la préférence système par défaut, avec un bouton de bascule manuel dans le header (mémorisé par appareil). L'accès est protégé par un token saisi une fois par appareil — mis en cache dans `localStorage`, jamais transporté dans une URL — et envoyé en `Authorization: Bearer` à chaque appel API.

| Vue | Description |
|-----|-------------|
| **Projets** | Liste des projets avec barre de progression agrégée |
| **SL1** | Liste des sl1 d'un projet avec progression pondérée |
| **Works** | Liste paginée des works d'un sl1, détail des steps sur tap |

- Works terminés : `Terminé le JJ/MM HH:mm · X min`
- Works en cours avec steps avancés : `Fin estimée dans X min`
- Works en cours sans steps done : `En cours depuis X min`
- Quand un work a le statut `in_progress`, la page se rafraîchit automatiquement toutes les 30 secondes — l'indicateur "live" est scopé à la vue actuellement affichée
- Les projets et sl1 peuvent être supprimés depuis leur vue liste, via une feuille de confirmation intégrée (pas une boîte de dialogue native du navigateur ; action irréversible)
- Les cartes sont navigables au clavier (`Tab` + `Entrée`/`Espace`), et les icônes de statut des steps portent un label pour lecteur d'écran

---

## Feuille de route

### v1.0.0 — nginx + rsync

- [x] **Phase 1** — Structure du repo et contenu des fichiers
- [x] **Phase 2** — Configuration VPS : nginx, labels Traefik, arborescence
- [x] **Phase 3** — Scripts et hooks : `config.example.json`, `update_work.sh`, hook `settings.json`
- [x] **Phase 4** — Interface mobile : `web/index.html`
- [x] **Phase 5** — Section CLAUDE.md décrivant CC-Beacon pour les sessions futures
- [x] **Phase 6** — Harmonisation Traefik, correction du deploy prod, CI/CD automatise via GitHub Actions
- [x] **Phase 7** — Ameliorations interface mobile : mode sombre, contraste WCAG AA, tap targets accessibles, echelle typographique unifiee
- [x] **Phase 8** — Securite : JS extrait dans `app.js` pour un CSP strict, correction XSS dans `badge()`, token retire des messages d'erreur, headers de securite (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

### v2.0.0 — FastAPI + GHCR

- [x] **Phase 1** — Container FastAPI en remplacement de nginx : package `api/` (auth, routes, storage, models), suite pytest, Dockerfile, outillage qualité ruff/mypy/pre-commit
- [x] **Phase 2** — `update_work.sh` migré de rsync/SSH vers un client HTTP de la nouvelle API
- [x] **Phase 3** — `web/app.js` : authentification Bearer (jamais transportée dans une URL), UI de suppression pour projets et sl1
- [x] **Phase 4** — Bascule CI/CD : nginx supprimé, build/push de l'image sur GHCR, `ci.yml` + `build-push.yml` remplaçant `deploy.yml`
- [x] **Phase 5** — Durcissement sécurité : correction d'une traversée de chemin dans les id de work (CWE-22), désactivation des docs API auto-générées, headers HSTS/Permissions-Policy, `pip-audit` en CI, bornage de la taille des champs, logging serveur structuré avec gestionnaire d'exception global
- [x] **Phase 6** — Consolidation design : échelle typographique unifiée, palette dark dédupliquée, couleur d'état erreur, indicateur "live" scopé à la vue, feuille de confirmation intégrée remplaçant `confirm()` natif, accessibilité clavier/lecteur d'écran, switch dark/light manuel
- [x] **Phase 7** — Documentation et préparation de la release `v2.0.0`

---

## Licence

Ce projet est distribué sous licence MIT — voir le fichier [LICENSE](LICENSE) pour les détails.
