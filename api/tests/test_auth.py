from .conftest import TEST_TOKEN


def test_missing_authorization_header_returns_401(client):
    response = client.get("/api/index")
    assert response.status_code == 401


def test_malformed_authorization_header_returns_401(client):
    response = client.get("/api/index", headers={"Authorization": "Bearer"})
    assert response.status_code == 401


def test_wrong_scheme_returns_401(client):
    response = client.get("/api/index", headers={"Authorization": f"Token {TEST_TOKEN}"})
    assert response.status_code == 401


def test_wrong_token_returns_401(client):
    response = client.get("/api/index", headers={"Authorization": "Bearer wrong-token"})
    assert response.status_code == 401


def test_valid_token_returns_200(client, auth_headers):
    response = client.get("/api/index", headers=auth_headers)
    assert response.status_code == 200


def test_root_and_app_js_do_not_require_auth(client):
    assert client.get("/").status_code == 200
    assert client.get("/app.js").status_code == 200


def test_repeated_failures_are_throttled(client):
    bad_headers = {"Authorization": "Bearer wrong-token"}
    for _ in range(20):
        client.get("/api/index", headers=bad_headers)

    response = client.get("/api/index", headers=bad_headers)
    assert response.status_code == 429
