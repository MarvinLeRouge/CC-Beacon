🇫🇷 Version française | [🇬🇧 English version](api_endpoints.md)

---

# Documentation API : CC-Beacon

> Toutes les routes `/api/*` nécessitent `Authorization: Bearer <token>` ; voir [`SECURITY.fr.md`](../../SECURITY.fr.md).

## Statique & santé

| Méthode | Route | Auth | Description |
|--------|-------|:----:|-------------|
| `GET` | `/` | - | Interface mobile (`index.html`) |
| `GET` | `/app.js` | - | Logique applicative |
| `GET` | `/theme-init.js` | - | Script de préférence de thème sans flash |
| `GET` | `/healthz` | - | Vérification de santé |

## Works (`/api`)

### Index
- **URL** : `GET /api/index`
- **Description** : Retourne l'index de tous les works.
- **Réponse** : `IndexResponse` - `{ "works": [IndexEntry, ...], "page": int, "per_page": int, "total": int }`, chaque `IndexEntry` résumant un work (`id`, `project`, `sl1`, `title`, `status`, `started_at`, `updated_at`, `completion_time`, `step_count`, `steps_done`).

### Récupérer un work
- **URL** : `GET /api/work/{work_id}`
- **Description** : Retourne le détail complet d'un work.
- **Réponse** (200) : le `WorkRecord` complet (tous les champs de `WorkIn` plus `started_at`, `updated_at`, `completion_time`).
- **Réponse** (404) : work introuvable.

### Créer ou mettre à jour un work
- **URL** : `POST /api/work`
- **Description** : Crée un nouveau work, ou le met à jour si `id` correspond à un work existant (upsert).
- **Corps** : `WorkIn`
  ```json
  {
    "id": "string | null",
    "project": "string",
    "sl1": "string",
    "title": "string",
    "status": "pending | in_progress | done | error",
    "steps": [
      { "label": "string", "status": "pending | in_progress | done", "at": "string | null" }
    ],
    "summary": "string"
  }
  ```
- **Réponse** : le `WorkRecord` persisté.

### Supprimer un projet
- **URL** : `DELETE /api/project/{name}`
- **Description** : Supprime tous les works appartenant à un projet.
- **Réponse** (404) : projet introuvable.

### Supprimer un sl1
- **URL** : `DELETE /api/sl1/{project}/{name}`
- **Description** : Supprime tous les works appartenant à un sl1 au sein d'un projet.
- **Réponse** (404) : sl1 introuvable.
