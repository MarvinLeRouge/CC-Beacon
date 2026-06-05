🇫🇷 Version française | [🇬🇧 English version](README.md)

---

# cc-beacon

> *Un outil léger de suivi de tâches Claude Code — fichiers JSON déposés sur un VPS via rsync, servis derrière Traefik, consultables depuis un smartphone.*

![Statut](https://img.shields.io/badge/Statut-En%20cours-yellow)

---

## Concept

Les sessions Claude Code produisent un flux d'étapes et de décisions qui disparaissent dès que le terminal se ferme. **cc-beacon** rend ce travail visible : chaque session écrit un fichier JSON structuré (un *work*) décrivant ses étapes, son statut et sa durée. Ces fichiers sont poussés vers un VPS et affichés via une page HTML mobile-first — pas d'application, pas de framework backend, juste des fichiers statiques et une URL protégée par un token mis en favori.

La hiérarchie de suivi est intentionnellement simple :

```
projet
└── sl1  (label configurable : "module", "feature", "composant"…)
    └── work
        └── steps
```

---

## Fonctionnement

1. **Hook Claude Code** — un hook `Stop` dans `~/.claude/settings.json` appelle `scripts/update_work.sh` à la fin de chaque session
2. **rsync via SSH** — le script pousse le fichier JSON du work et un index régénéré vers le VPS
3. **nginx + Traefik** — les fichiers statiques sont servis sous un chemin secret (`/TOKEN/`), derrière un reverse proxy Traefik avec TLS automatique
4. **Interface mobile** — `web/index.html` récupère l'index et affiche les vues projet/sl1/work avec pagination et rafraîchissement automatique quand un work est `in_progress`

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
  "steps": [
    { "label": "…", "status": "pending | in_progress | done", "at": "…" }
  ],
  "summary": "texte libre"
}
```

### Fichier index (régénéré à chaque mise à jour)

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

## Structure du projet

```
~/projets/CC-Beacon/          ← ce repo
├── docs/
│   └── work-in-progress/     ← notes de planification
├── scripts/
│   └── update_work.sh        ← script de déploiement rsync (lit ~/.cc-beacon/config.json)
├── web/
│   └── index.html            ← interface mobile
├── config.example.json       ← template versionné (sans valeurs sensibles)
├── .gitignore
└── README.md

~/.cc-beacon/                 ← hors repo, jamais commité
└── config.json               ← valeurs réelles : hôte VPS, user SSH, token, labels sl1
```

---

## Configuration

`config.example.json` est le template versionné. Il suffit de le copier dans `~/.cc-beacon/config.json` et de renseigner les valeurs réelles.

```json
{
  "vps_host": "votre-hote-ou-ip-vps",
  "vps_user": "votre-user-ssh",
  "remote_path": "/var/www/cc-beacon/works/",
  "token": "votre-token-secret",
  "base_url": "https://beacon.votre-domaine.com",
  "sl1_label": "module"
}
```

`~/.cc-beacon/` est exclu du repo via `.gitignore`.

---

## Configuration du VPS

Le VPS sert les fichiers statiques via un container nginx derrière Traefik :

- Les fichiers sont stockés dans `/var/www/cc-beacon/works/`
- nginx les expose sous `/TOKEN/` (le token sert de préfixe de chemin secret)
- Traefik gère le sous-domaine (`beacon.votre-domaine.com`) et le TLS via Let's Encrypt
- L'utilisateur SSH utilisé par rsync doit avoir les droits d'écriture sur le dossier `works/`

La configuration détaillée est couverte dans le document de planification Phase 2 (`docs/work-in-progress/`).

---

## Intégration Claude Code

Ajouter le hook suivant dans `~/.claude/settings.json` pour que le script s'exécute automatiquement à la fin de chaque session Claude Code :

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

`web/index.html` est une application mobile-first en fichier unique (HTML/CSS/JS vanilla, sans étape de build) :

| Vue | Description |
|-----|-------------|
| **Projets** | Liste des projets avec barre de progression agrégée |
| **SL1** | Liste des sl1 d'un projet avec progression pondérée |
| **Works** | Liste paginée des works d'un sl1 avec détail des steps |

Quand un work a le statut `in_progress`, la page se rafraîchit automatiquement toutes les 30 secondes.

---

## Feuille de route

- [ ] **Phase 1** — Structure du repo et contenu des fichiers
- [ ] **Phase 2** — Configuration VPS : nginx, labels Traefik, arborescence
- [ ] **Phase 3** — Scripts et hooks : `config.example.json`, `update_work.sh`, hook `settings.json`
- [ ] **Phase 4** — Interface mobile : `web/index.html`
- [ ] **Phase 5** — Section CLAUDE.md décrivant cc-beacon pour les sessions futures

---

## Licence

Ce projet est distribué sous licence MIT — voir le fichier [LICENSE](LICENSE) pour les détails.
