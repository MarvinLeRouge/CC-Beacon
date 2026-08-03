from typing import Literal

from pydantic import BaseModel


class Step(BaseModel):
    label: str
    status: Literal["pending", "in_progress", "done"]
    at: str | None = None


class WorkIn(BaseModel):
    id: str | None = None
    project: str
    sl1: str
    title: str
    status: Literal["pending", "in_progress", "done", "error"] = "pending"
    steps: list[Step] = []
    summary: str = ""


class WorkRecord(WorkIn):
    started_at: str
    updated_at: str
    completion_time: str | None = None


class IndexEntry(BaseModel):
    id: str
    project: str
    sl1: str
    title: str
    status: str
    started_at: str
    updated_at: str
    completion_time: str | None
    step_count: int
    steps_done: int


class IndexResponse(BaseModel):
    works: list[IndexEntry]
    page: int
    per_page: int
    total: int
