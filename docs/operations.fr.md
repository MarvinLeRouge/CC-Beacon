🇫🇷 Version française | [🇬🇧 English version](operations.md)

---

# Guide d'exploitation : CC-Beacon

**Périmètre :** Déploiement (dev et prod), organisation du serveur, configuration.

> Ce document couvre *comment faire tourner le système en production*. Pour le développement local, voir le [`README.md`](../README.fr.md) à la racine.

---

## Déploiement

### Dev

Lancer l'API directement avec `uvicorn api.main:app --reload --port 8000` (voir [`CONTRIBUTING.fr.md`](i18n/fr/CONTRIBUTING.fr.md)). Aucune stack Docker Compose n'est nécessaire en développement local.

### Prod : pipeline

Les déploiements en production sont entièrement automatisés via GitHub Actions, en deux workflows chaînés :

1. **CI** (`.github/workflows/ci.yml`) s'exécute à chaque push/PR sur `main` : lint (Ruff), vérification de types (Mypy), tests avec couverture, scan de vulnérabilités des dépendances (`pip-audit`).
2. **Build, Push & Deploy** (`.github/workflows/build-push.yml`) s'exécute automatiquement une fois la CI réussie sur `main` (déclencheur `workflow_run`), ou peut être déclenché manuellement (`workflow_dispatch`), ce qui contourne le garde-fou CI pour les hotfix, rollbacks ou redéploiements.
   - **Build & push** : l'image Docker de l'API est construite et poussée sur GHCR, taguée à la fois `sha-<7-caractères-du-commit>` et `latest` (`ghcr.io/marvinlerouge/cc-beacon-api`).
   - **Deploy** : une étape SSH sur le serveur de production récupère `docker-compose.prod.yml` directement depuis `raw.githubusercontent.com`, épinglé sur le SHA exact du commit déployé, puis exécute `docker compose pull` suivi de `docker compose up -d --remove-orphans`.

### Prod : topologie

Le routage passe par Traefik (TLS via Let's Encrypt), sur une unique règle basée sur l'hôte : `Host(cc-beacon.marvinlerouge.dev)` routé vers le conteneur `api`, qui sert aussi l'interface mobile statique (`web/`) en plus de l'API JSON.

### Prod : organisation du serveur

Sur le serveur de déploiement :

```
/home/mlr/marvinlerouge.dev/cc-beacon/
├── compose/
│   └── docker-compose.yml          ← copie de docker-compose.prod.yml, récupérée à chaque déploiement
└── shared/
    ├── env/
    │   └── secrets.env             ← secrets du conteneur (chmod 600, jamais commité)
    └── data/
        └── works/                  ← le stockage persistant de l'API (un fichier JSON par work)
```

Le conteneur reçoit sa configuration uniquement via `env_file` dans `docker-compose.prod.yml`. Le fichier compose n'interpole rien depuis un fichier : le domaine est écrit dans le label Traefik et `IMAGE_TAG` est fourni par le workflow de déploiement.

| Variable | Fichier | Rôle |
|---|---|---|
| `TOKEN` | `shared/env/secrets.env` | Token Bearer vérifié par l'API |

Modèle : [`ops/secrets.env.example`](../ops/secrets.env.example). Pas de `app.env` : l'API n'a aucun réglage non secret en prod (`CC_BEACON_DATA_DIR` garde sa valeur par défaut `/data`).

Générer un token avec :

```bash
openssl rand -hex 24
```

Démarrer le conteneur :

```bash
cd /home/mlr/marvinlerouge.dev/cc-beacon/compose && docker compose pull && docker compose up -d
```

## Configuration

`config.example.json` est le modèle versionné. Le copier vers `~/.CC-Beacon/config.json` et renseigner les vraies valeurs :

```json
{
  "token": "votre-token-secret",
  "base_url": "https://beacon.votre-domaine.com",
  "sl1_label": "module"
}
```

`~/.CC-Beacon/` est exclu du dépôt via `.gitignore`.
