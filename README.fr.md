🇫🇷 Version française | [🇬🇧 English version](README.md)

---

# CC-Beacon

> *Un outil léger de suivi de tâches Claude Code — fichiers JSON déposés sur un VPS via rsync, servis derrière Traefik, consultables depuis un smartphone.*

![Statut](https://img.shields.io/badge/Statut-Livré-brightgreen)

---

## Concept

Les sessions Claude Code produisent un flux d'étapes et de décisions qui disparaissent dès que le terminal se ferme. **CC-Beacon** rend ce travail visible : chaque session écrit un fichier JSON structuré (un *work*) décrivant ses étapes, son statut et sa durée. Ces fichiers sont poussés vers un VPS et affichés via une page HTML mobile-first — pas d'application, pas de framework backend, juste des fichiers statiques et une URL protégée par un token mis en favori.

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
2. **rsync via SSH** — le script pousse les fichiers JSON et un index régénéré vers le VPS
3. **nginx + Traefik** — les fichiers statiques sont servis sous un chemin secret (`/TOKEN/`), derrière un reverse proxy Traefik avec TLS automatique ; le token est injecté au démarrage du container via `envsubst`
4. **Interface mobile** — `web/index.html` + `web/app.js` récupèrent l'index et affichent les vues projet/sl1/work avec pagination et rafraîchissement automatique quand un work est `in_progress`
5. **Deploy CI/CD** — un push sur `main` déclenche `.github/workflows/deploy.yml`, qui récupère `web/index.html`, `web/app.js`, `ops/default.conf.template` et `docker-compose.prod.yml` depuis GitHub au SHA exact du commit et les applique sur le VPS

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

### Fichier index (régénéré à chaque mise à jour)

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
│       └── deploy.yml        ← CI/CD : déploie sur le VPS à chaque push sur main
├── docs/
│   └── ai/                   ← notes de travail IA (gitignored)
├── ops/
│   ├── compose.env.example   ← template pour compose/.env sur le VPS
│   └── default.conf.template ← config nginx, token injecté via envsubst
├── scripts/
│   └── update_work.sh        ← script de déploiement rsync
├── web/
│   ├── index.html            ← interface mobile (HTML + CSS)
│   └── app.js                ← logique applicative
├── docker-compose.prod.yml   ← container nginx + labels Traefik (prod)
├── config.example.json       ← template versionné (sans valeurs sensibles)
├── .gitignore
└── README.md

~/.CC-Beacon/                 ← hors repo, jamais commité
├── config.json               ← valeurs réelles : hôte VPS, user SSH, token, etc.
└── works/                    ← fichiers work locaux synchronisés vers le VPS
    ├── index.json
    └── <id>.json
```

---

## Configuration

`config.example.json` est le template versionné. Il suffit de le copier dans `~/.CC-Beacon/config.json` et de renseigner les valeurs réelles.

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
    ├── nginx/
    │   └── default.conf.template   ← copie de ops/default.conf.template
    └── www/
        ├── index.html              ← copie de web/index.html
        ├── app.js                  ← copie de web/app.js
        └── works/                  ← cible rsync
```

**Deux fichiers d'environnement distincts, deux rôles distincts :**
- `compose/.env` — lu par `docker compose` au démarrage pour l'interpolation des labels (`${DOMAIN}` dans les labels Traefik). Voir `ops/compose.env.example` pour le template.
- `shared/env/secrets.env` — transmis au container nginx à l'exécution ; `${TOKEN}` est substitué dans `default.conf.template` via `envsubst`.

Aucun des deux fichiers n'est jamais commité.

Générer un token :
```bash
openssl rand -hex 24
```

Démarrer le container :
```bash
cd ~/your-traefik-basedir/cc-beacon/compose && docker compose up -d
```

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

Le flag `--sync-only` ignore la création de fichier et lance uniquement le rsync — c'est un filet de sécurité. Pendant la session, appeler le script explicitement avec les arguments complets pour créer et mettre à jour le work.

---

## Interface

`web/index.html` + `web/app.js` forment une application mobile-first (HTML/CSS/JS vanilla, sans étape de build). Le mode sombre est supporté via `prefers-color-scheme: dark`.

| Vue | Description |
|-----|-------------|
| **Projets** | Liste des projets avec barre de progression agrégée |
| **SL1** | Liste des sl1 d'un projet avec progression pondérée |
| **Works** | Liste paginée des works d'un sl1, détail des steps sur tap |

- Works terminés : `Terminé le JJ/MM HH:mm · X min`
- Works en cours avec steps avancés : `Fin estimée dans X min`
- Works en cours sans steps done : `En cours depuis X min`
- Quand un work a le statut `in_progress`, la page se rafraîchit automatiquement toutes les 30 secondes

---

## Feuille de route

- [x] **Phase 1** — Structure du repo et contenu des fichiers
- [x] **Phase 2** — Configuration VPS : nginx, labels Traefik, arborescence
- [x] **Phase 3** — Scripts et hooks : `config.example.json`, `update_work.sh`, hook `settings.json`
- [x] **Phase 4** — Interface mobile : `web/index.html`
- [x] **Phase 5** — Section CLAUDE.md décrivant CC-Beacon pour les sessions futures
- [x] **Phase 6** — Harmonisation Traefik, correction du deploy prod, CI/CD automatise via GitHub Actions
- [x] **Phase 7** — Ameliorations interface mobile : mode sombre, contraste WCAG AA, tap targets accessibles, echelle typographique unifiee
- [x] **Phase 8** — Securite : JS extrait dans `app.js` pour un CSP strict, correction XSS dans `badge()`, token retire des messages d'erreur, headers de securite (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

---

## Licence

Ce projet est distribué sous licence MIT — voir le fichier [LICENSE](LICENSE) pour les détails.
