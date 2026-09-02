🇫🇷 Version française | [🇬🇧 English version](roadmap.md)

---

# Feuille de route : CC-Beacon

**Type :** Feuille de route historique, entièrement close jusqu'à v2.0.0
**Source :** tags git et historique des releases

> Les deux versions majeures sont terminées. Ce fichier est conservé comme trace
> historique ; voir le [README](../README.fr.md#feuille-de-route) pour une synthèse
> courte et le statut actuel.

---

## v1.0.0 — nginx + rsync

- [x] **Phase 1** — Structure du repo et contenu des fichiers
- [x] **Phase 2** — Configuration VPS : nginx, labels Traefik, arborescence
- [x] **Phase 3** — Scripts et hooks : `config.example.json`, `update_work.sh`, hook `settings.json`
- [x] **Phase 4** — Interface mobile : `web/index.html`
- [x] **Phase 5** — Section CLAUDE.md décrivant CC-Beacon pour les sessions futures
- [x] **Phase 6** — Harmonisation Traefik, correction du deploy prod, CI/CD automatisé via GitHub Actions
- [x] **Phase 7** — Améliorations interface mobile : mode sombre, contraste WCAG AA, tap targets accessibles, échelle typographique unifiée
- [x] **Phase 8** — Sécurité : JS extrait dans `app.js` pour un CSP strict, correction XSS dans `badge()`, token retiré des messages d'erreur, headers de sécurité (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy)

## v2.0.0 — FastAPI + GHCR

- [x] **Phase 1** — Container FastAPI en remplacement de nginx : package `api/` (auth, routes, storage, models), suite pytest, Dockerfile, outillage qualité ruff/mypy/pre-commit
- [x] **Phase 2** — `update_work.sh` migré de rsync/SSH vers un client HTTP de la nouvelle API
- [x] **Phase 3** — `web/app.js` : authentification Bearer (jamais transportée dans une URL), UI de suppression pour projets et sl1
- [x] **Phase 4** — Bascule CI/CD : nginx supprimé, build/push de l'image sur GHCR, `ci.yml` + `build-push.yml` remplaçant `deploy.yml`
- [x] **Phase 5** — Durcissement sécurité : correction d'une traversée de chemin dans les id de work (CWE-22), désactivation des docs API auto-générées, headers HSTS/Permissions-Policy, `pip-audit` en CI, bornage de la taille des champs, logging serveur structuré avec gestionnaire d'exception global
- [x] **Phase 6** — Consolidation design : échelle typographique unifiée, palette dark dédupliquée, couleur d'état erreur, indicateur "live" scopé à la vue, feuille de confirmation intégrée remplaçant `confirm()` natif, accessibilité clavier/lecteur d'écran, switch dark/light manuel
- [x] **Phase 7** — Documentation et préparation de la release `v2.0.0`
