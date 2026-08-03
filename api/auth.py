import os
import secrets
import time
from collections import defaultdict, deque

from fastapi import Header, HTTPException, Request

EXPECTED_TOKEN = os.environ["TOKEN"]
WINDOW_SECONDS = 60
MAX_FAILURES = 20

_failures: dict[str, deque[float]] = defaultdict(deque)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def require_token(request: Request, authorization: str | None = Header(default=None)) -> None:
    ip = _client_ip(request)
    now = time.monotonic()
    bucket = _failures[ip]
    while bucket and now - bucket[0] > WINDOW_SECONDS:
        bucket.popleft()
    if len(bucket) >= MAX_FAILURES:
        raise HTTPException(status_code=429, detail="Too many attempts")

    prefix = "Bearer "
    valid = (
        authorization is not None
        and authorization.startswith(prefix)
        and secrets.compare_digest(authorization[len(prefix) :], EXPECTED_TOKEN)
    )
    if not valid:
        bucket.append(now)
        raise HTTPException(status_code=401, detail="Unauthorized")
