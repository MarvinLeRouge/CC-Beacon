from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from . import storage
from .auth import require_token
from .models import WorkIn

router = APIRouter(prefix="/api", dependencies=[Depends(require_token)])


@router.get("/index")
def get_index() -> dict[str, Any]:
    return storage.build_index()


@router.get("/work/{work_id}")
def get_work(work_id: str) -> dict[str, Any]:
    work = storage.load_work(work_id)
    if work is None:
        raise HTTPException(status_code=404, detail="Work not found")
    return work


@router.post("/work")
def post_work(payload: WorkIn) -> dict[str, Any]:
    return storage.upsert_work(payload)


@router.delete("/project/{name}")
def delete_project(name: str) -> dict[str, Any]:
    try:
        return storage.delete_project(name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@router.delete("/sl1/{project}/{name}")
def delete_sl1(project: str, name: str) -> dict[str, Any]:
    try:
        return storage.delete_sl1(project, name)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="SL1 not found") from exc
