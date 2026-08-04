from typing import Literal

from pydantic import BaseModel, Field

# Generous but finite bounds: nothing about this tool needs unbounded text,
# and without a cap a single work file could otherwise grow without limit.
NAME_MAX_LENGTH = 200
SUMMARY_MAX_LENGTH = 5000
MAX_STEPS = 500


class Step(BaseModel):
    label: str = Field(max_length=NAME_MAX_LENGTH)
    status: Literal["pending", "in_progress", "done"]
    at: str | None = None


class WorkIn(BaseModel):
    id: str | None = None
    project: str = Field(max_length=NAME_MAX_LENGTH)
    sl1: str = Field(max_length=NAME_MAX_LENGTH)
    title: str = Field(max_length=NAME_MAX_LENGTH)
    status: Literal["pending", "in_progress", "done", "error"] = "pending"
    steps: list[Step] = Field(default=[], max_length=MAX_STEPS)
    summary: str = Field(default="", max_length=SUMMARY_MAX_LENGTH)


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
