def test_post_work_creates_entry_with_generated_id(client, auth_headers):
    payload = {"project": "demo", "sl1": "api", "title": "First work", "status": "pending"}

    response = client.post("/api/work", json=payload, headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    entry = body["works"][0]
    assert entry["project"] == "demo"
    assert entry["sl1"] == "api"
    assert entry["step_count"] == 0
    assert entry["steps_done"] == 0
    assert entry["id"]


def test_post_work_computes_step_counts(client, auth_headers):
    payload = {
        "id": "2026-01-01T00-00-01",
        "project": "demo",
        "sl1": "api",
        "title": "With steps",
        "status": "in_progress",
        "steps": [
            {"label": "step1", "status": "done", "at": "2026-01-01T00:00:00Z"},
            {"label": "step2", "status": "pending", "at": None},
        ],
    }

    response = client.post("/api/work", json=payload, headers=auth_headers)

    entry = response.json()["works"][0]
    assert entry["step_count"] == 2
    assert entry["steps_done"] == 1


def test_post_work_sets_completion_time_once(client, auth_headers):
    work_id = "2026-01-01T00-00-02"
    base = {"id": work_id, "project": "demo", "sl1": "api", "title": "T"}

    client.post("/api/work", json={**base, "status": "in_progress"}, headers=auth_headers)
    client.post("/api/work", json={**base, "status": "done"}, headers=auth_headers)
    work = client.get(f"/api/work/{work_id}", headers=auth_headers).json()
    completion_time = work["completion_time"]
    assert completion_time is not None

    client.post("/api/work", json={**base, "status": "error"}, headers=auth_headers)
    work_after = client.get(f"/api/work/{work_id}", headers=auth_headers).json()
    assert work_after["completion_time"] == completion_time


def test_get_work_returns_full_detail(client, auth_headers):
    work_id = "2026-01-01T00-00-03"
    payload = {
        "id": work_id,
        "project": "demo",
        "sl1": "api",
        "title": "Detail",
        "status": "pending",
        "steps": [{"label": "step1", "status": "pending", "at": None}],
        "summary": "free text",
    }
    client.post("/api/work", json=payload, headers=auth_headers)

    response = client.get(f"/api/work/{work_id}", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["steps"] == payload["steps"]
    assert body["summary"] == "free text"


def test_get_work_returns_404_for_unknown_id(client, auth_headers):
    response = client.get("/api/work/does-not-exist", headers=auth_headers)
    assert response.status_code == 404


def test_delete_project_removes_all_its_works(client, auth_headers):
    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-01-00", "project": "p1", "sl1": "s1", "title": "a"},
        headers=auth_headers,
    )
    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-01-01", "project": "p1", "sl1": "s2", "title": "b"},
        headers=auth_headers,
    )
    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-01-02", "project": "p2", "sl1": "s1", "title": "c"},
        headers=auth_headers,
    )

    response = client.delete("/api/project/p1", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["works"][0]["project"] == "p2"


def test_delete_project_returns_404_when_no_match(client, auth_headers):
    response = client.delete("/api/project/does-not-exist", headers=auth_headers)
    assert response.status_code == 404


def test_delete_sl1_removes_only_matching_works(client, auth_headers):
    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-02-00", "project": "p1", "sl1": "s1", "title": "a"},
        headers=auth_headers,
    )
    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-02-01", "project": "p1", "sl1": "s2", "title": "b"},
        headers=auth_headers,
    )

    response = client.delete("/api/sl1/p1/s1", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["works"][0]["sl1"] == "s2"


def test_delete_sl1_returns_404_when_no_match(client, auth_headers):
    response = client.delete("/api/sl1/p1/unknown", headers=auth_headers)
    assert response.status_code == 404


def test_healthz_is_unauthenticated(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
