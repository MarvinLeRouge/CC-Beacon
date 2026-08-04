from typing import Literal

from pydantic import BaseModel, Field

# Work ids are either the server-generated timestamp format or a caller-supplied
# value; both are always used to build a filename (see storage._work_path), so
# the charset is restricted to prevent path traversal (CWE-22).
WORK_ID_PATTERN = r"^[A-Za-z0-9_-]+$"


class Step(BaseModel):
    label: str
    status: Literal["pending", "in_progress", "done"]
    at: str | None = None


class WorkIn(BaseModel):
    id: str | None = Field(default=None, pattern=WORK_ID_PATTERN)
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
