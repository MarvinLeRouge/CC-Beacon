def test_post_work_rejects_path_traversal_in_id(client, auth_headers, tmp_path):
    payload = {
        "id": "../../../tmp/evil",
        "project": "demo",
        "sl1": "api",
        "title": "malicious",
    }

    response = client.post("/api/work", json=payload, headers=auth_headers)

    assert response.status_code == 422
    # Nothing was written anywhere, not even inside the legitimate data dir.
    assert list((tmp_path / "works").glob("*.json")) == []


def test_post_work_rejects_absolute_path_id(client, auth_headers, tmp_path):
    payload = {"id": "/tmp/evil", "project": "demo", "sl1": "api", "title": "malicious"}

    response = client.post("/api/work", json=payload, headers=auth_headers)

    assert response.status_code == 422
    assert list((tmp_path / "works").glob("*.json")) == []


def test_get_work_rejects_invalid_id_format(client, auth_headers):
    # A bare ".." gets normalized away by the HTTP client before it even
    # reaches routing (standard URL semantics) — use a value that reaches
    # the route as a literal segment but still fails the allowlist.
    response = client.get("/api/work/..foo", headers=auth_headers)
    assert response.status_code == 422


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


def test_get_index_ignores_a_stray_legacy_index_file(client, auth_headers, tmp_path):
    # Regression: the pre-migration rsync-era client used to write its own
    # index.json into the same directory as the work files. A leftover one
    # (wrong shape, no "id" key) must not crash the API-computed index.
    works_dir = tmp_path / "works"
    works_dir.mkdir(parents=True, exist_ok=True)
    (works_dir / "index.json").write_text('{"works": [], "page": 1, "per_page": 10, "total": 0}')

    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-00-00", "project": "demo", "sl1": "api", "title": "a"},
        headers=auth_headers,
    )

    response = client.get("/api/index", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["works"][0]["id"] == "2026-01-01T00-00-00"


def test_unhandled_exception_returns_generic_500_without_leaking_details(
    client, auth_headers, monkeypatch
):
    # Starlette's ServerErrorMiddleware re-raises after a registered Exception
    # handler responds, so the client's default TestClient must not re-raise
    # in-process — we only care about what the HTTP client actually receives.
    from fastapi.testclient import TestClient

    def boom() -> None:
        raise RuntimeError("boom: sensitive internal detail")

    monkeypatch.setattr("api.storage.build_index", boom)

    lenient_client = TestClient(client.app, raise_server_exceptions=False)
    response = lenient_client.get("/api/index", headers=auth_headers)

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}


def test_get_index_skips_a_malformed_work_file_instead_of_crashing(client, auth_headers, tmp_path):
    works_dir = tmp_path / "works"
    works_dir.mkdir(parents=True, exist_ok=True)
    (works_dir / "corrupt.json").write_text('{"not": "a work record"}')

    client.post(
        "/api/work",
        json={"id": "2026-01-01T00-00-01", "project": "demo", "sl1": "api", "title": "b"},
        headers=auth_headers,
    )

    response = client.get("/api/index", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["works"][0]["id"] == "2026-01-01T00-00-01"
