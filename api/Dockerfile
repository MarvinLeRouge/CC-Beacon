FROM python:3.11-slim

RUN useradd --create-home --uid 1000 appuser
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /uvx /bin/
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_PYTHON_DOWNLOADS=never \
    UV_COMPILE_BYTECODE=1 \
    UV_NO_CACHE=1
COPY api/pyproject.toml api/uv.lock api/.python-version ./api/
RUN cd api && uv sync --frozen --no-dev
ENV PATH="/opt/venv/bin:$PATH"

COPY api/ ./api/
COPY web/ ./web/

RUN mkdir -p /data/works && chown -R appuser:appuser /data /app
USER appuser

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')" || exit 1

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
