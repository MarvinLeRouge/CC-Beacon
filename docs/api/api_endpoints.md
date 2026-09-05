[🇫🇷 Version française](api_endpoints.fr.md) | 🇬🇧 English version

---

# API Documentation: CC-Beacon

> All `/api/*` routes require `Authorization: Bearer <token>`; see [`SECURITY.md`](../../SECURITY.md).

## Static & health

| Method | Route | Auth | Description |
|--------|-------|:----:|-------------|
| `GET` | `/` | - | Mobile interface (`index.html`) |
| `GET` | `/app.js` | - | Application logic |
| `GET` | `/theme-init.js` | - | Flash-free theme preference script |
| `GET` | `/healthz` | - | Health check |

## Works (`/api`)

### Index
- **URL**: `GET /api/index`
- **Description**: Returns the index of all works.
- **Response**: `IndexResponse` - `{ "works": [IndexEntry, ...], "page": int, "per_page": int, "total": int }`, each `IndexEntry` summarizing one work (`id`, `project`, `sl1`, `title`, `status`, `started_at`, `updated_at`, `completion_time`, `step_count`, `steps_done`).

### Get work
- **URL**: `GET /api/work/{work_id}`
- **Description**: Returns the full detail of one work.
- **Response** (200): the full `WorkRecord` (all `WorkIn` fields plus `started_at`, `updated_at`, `completion_time`).
- **Response** (404): work not found.

### Create or update work
- **URL**: `POST /api/work`
- **Description**: Creates a new work, or updates it if `id` matches an existing one (upsert).
- **Body**: `WorkIn`
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
- **Response**: the persisted `WorkRecord`.

### Delete project
- **URL**: `DELETE /api/project/{name}`
- **Description**: Deletes all works belonging to a project.
- **Response** (404): project not found.

### Delete sl1
- **URL**: `DELETE /api/sl1/{project}/{name}`
- **Description**: Deletes all works belonging to one sl1 within a project.
- **Response** (404): sl1 not found.
