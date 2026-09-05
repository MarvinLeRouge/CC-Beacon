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
[![codecov](https://codecov.io/gh/MarvinLeRouge/CC-Beacon/graph/badge.svg)](https://codecov.io/gh/MarvinLeRouge/CC-Beacon)
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

## 🧱 Technologies utilisées

### Backend
- **FastAPI** — framework web Python, sert à la fois l'API et l'interface mobile statique
- **Pydantic** — validation des requêtes/réponses
- **uvicorn** — serveur ASGI

### Frontend
- **JavaScript vanilla** (ES2022) — pas de framework, pas d'étape de build
- **CSS vanilla** — custom properties pour le theming (dark/light), pas de framework

### DevOps & Déploiement
- **Docker** — image de production unique
- **GitHub Container Registry (GHCR)** — hébergement de l'image
- **Traefik** — reverse proxy, TLS automatique
- **GitHub Actions** — CI/CD

### Tests & Qualité
- **Pytest** + **pytest-cov** — suite de tests et couverture
- **Codecov** — suivi et reporting de la couverture
- **Ruff** — lint et formatage
- **Mypy** — vérification statique de types
- **pip-audit** — scan de vulnérabilités des dépendances
- **pre-commit** — garde-fou qualité local

---

## Fonctionnement

1. **Hook Claude Code** — un hook `Stop` dans `~/.claude/settings.json` appelle `scripts/update_work.sh --sync-only` à la fin de chaque session
2. **Client HTTP** — le script pousse les mises à jour vers l'API (`POST /api/work`) et met en cache l'index renvoyé localement ; plus de SSH, plus de rsync
3. **FastAPI + Traefik** — un seul container sert l'interface mobile (`GET /`, `GET /app.js`) et l'API REST (`/api/*`, protégée par `Authorization: Bearer`), derrière un reverse proxy Traefik avec TLS automatique
4. **Interface mobile** — `web/index.html` + `web/app.js` appellent l'API et affichent les vues projet/sl1/work avec pagination, suppression et rafraîchissement automatique quand un work est `in_progress`
5. **Deploy CI/CD** — un push sur `main` déclenche `.github/workflows/ci.yml` (ruff, mypy, pytest) ; en cas de succès, `.github/workflows/build-push.yml` construit l'image de l'API, la pousse sur GHCR et la déploie sur le VPS via SSH

---

## 📡 Routes API

Voir [`docs/api/api_endpoints.fr.md`](docs/api/api_endpoints.fr.md) pour la référence complète des routes.

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

## Structure des données et du projet

Voir [`docs/architecture/api_architecture.fr.md`](docs/architecture/api_architecture.fr.md) pour les schémas JSON work/index et l'organisation du dépôt.

---

## 🧪 Lancer les tests

```bash
pip install -r api/requirements.txt -r api/requirements-dev.txt

# Tests de l'API (27 tests)
pytest api/tests --cov=api --cov-config=api/pyproject.toml --cov-report=term-missing -v
```

Garde-fou qualité (aussi lancé automatiquement par `.github/workflows/ci.yml` et le hook pre-commit local) :
```bash
ruff check api/
ruff format --check api/
cd api && mypy .
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

Voir [`docs/operations.fr.md`](docs/operations.fr.md) pour le pipeline de déploiement, l'organisation du serveur et la configuration.

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

Les deux versions majeures sont terminées : v1.0.0 (nginx + rsync, 8 phases) et
v2.0.0 (FastAPI + GHCR, 7 phases). Voir [`docs/roadmap.fr.md`](docs/roadmap.fr.md)
pour le détail phase par phase.

---

## Licence

Ce projet est distribué sous licence MIT — voir le fichier [LICENSE](LICENSE) pour les détails.
