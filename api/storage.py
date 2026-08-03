import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .models import WorkIn

PER_PAGE = 10


def _data_dir() -> Path:
    base = Path(os.environ.get("CC_BEACON_DATA_DIR", "/data"))
    path = base / "works"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _work_path(work_id: str) -> Path:
    return _data_dir() / f"{work_id}.json"


def load_work(work_id: str) -> dict[str, Any] | None:
    path = _work_path(work_id)
    if not path.is_file():
        return None
    return _read_json(path)


def list_all_works() -> list[dict[str, Any]]:
    files = sorted(_data_dir().glob("*.json"))
    return [_read_json(f) for f in files]


def build_index() -> dict[str, Any]:
    works = list_all_works()
    entries = [
        {
            "id": w["id"],
            "project": w["project"],
            "sl1": w["sl1"],
            "title": w["title"],
            "status": w["status"],
            "started_at": w["started_at"],
            "updated_at": w["updated_at"],
            "completion_time": w.get("completion_time"),
            "step_count": len(w.get("steps", [])),
            "steps_done": sum(1 for s in w.get("steps", []) if s.get("status") == "done"),
        }
        for w in works
    ]
    return {
        "works": entries,
        "page": 1,
        "per_page": PER_PAGE,
        "total": len(entries),
    }


def upsert_work(payload: WorkIn) -> dict[str, Any]:
    now = _now()
    work_id = payload.id or _generate_id()

    existing = load_work(work_id)
    if existing is not None:
        started_at = existing["started_at"]
        completion_time = existing.get("completion_time")
    else:
        started_at = now
        completion_time = None

    if payload.status == "done" and not completion_time:
        completion_time = now

    record = {
        "id": work_id,
        "project": payload.project,
        "sl1": payload.sl1,
        "title": payload.title,
        "status": payload.status,
        "started_at": started_at,
        "updated_at": now,
        "completion_time": completion_time,
        "steps": [s.model_dump() for s in payload.steps],
        "summary": payload.summary,
    }
    _write_json(_work_path(work_id), record)
    return build_index()


def delete_project(project: str) -> dict[str, Any]:
    matched = [w for w in list_all_works() if w["project"] == project]
    if not matched:
        raise FileNotFoundError(project)
    for work in matched:
        _work_path(work["id"]).unlink(missing_ok=True)
    return build_index()


def delete_sl1(project: str, sl1: str) -> dict[str, Any]:
    matched = [w for w in list_all_works() if w["project"] == project and w["sl1"] == sl1]
    if not matched:
        raise FileNotFoundError(f"{project}/{sl1}")
    for work in matched:
        _work_path(work["id"]).unlink(missing_ok=True)
    return build_index()


def _now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _generate_id() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H-%M-%S")


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: Path, data: dict[str, Any]) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
