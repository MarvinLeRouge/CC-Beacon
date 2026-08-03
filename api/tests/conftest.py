import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("TOKEN", "test-token")

TEST_TOKEN = os.environ["TOKEN"]


@pytest.fixture(autouse=True)
def _reset_auth_throttle():
    from api.auth import _failures

    _failures.clear()
    yield
    _failures.clear()


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CC_BEACON_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("TOKEN", TEST_TOKEN)
    from api.main import app

    return TestClient(app)


@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {TEST_TOKEN}"}
