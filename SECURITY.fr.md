🇫🇷 Version française | [🇬🇧 English version](SECURITY.md)

---

# Politique de sécurité

## Versions supportées

Ce projet suit une unique branche `main` évolutive. Il n'existe pas de branche de release maintenue ; seul le dernier commit sur `main` est supporté.

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue GitHub publique pour signaler une vulnérabilité de sécurité.

Utilisez à la place le système de signalement privé de GitHub : rendez-vous dans l'[onglet Security](https://github.com/MarvinLeRouge/CC-Beacon/security/advisories/new) de ce dépôt et cliquez sur "Report a vulnerability". Le signalement reste privé jusqu'à ce qu'un correctif soit disponible.

Ce projet est maintenu par un développeur unique : le délai de réponse est traité au mieux, sans garantie de type SLA.

## Périmètre

Dans le périmètre : l'API (`api/`), le frontend (`web/`), et la configuration Docker/déploiement (`docker-compose.prod.yml`, `ops/`) telles que définies dans ce dépôt.

Ce projet n'a aucune intégration avec des services tiers : tout ce qui concerne sa sécurité vit dans ce dépôt.
