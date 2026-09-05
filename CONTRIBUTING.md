[🇫🇷 Version française](CONTRIBUTING.fr.md) | 🇬🇧 English version

---

# Contributing to CC-Beacon

This is a personal project. External contributions (bug reports, fixes, small improvements) are welcome but limited in scope.

## Prerequisites

- Python 3.11+
- Docker (optional, for building the production image)

## Local setup

```bash
git clone https://github.com/MarvinLeRouge/CC-Beacon.git
cd CC-Beacon
pip install -r api/requirements.txt -r api/requirements-dev.txt
pre-commit install   # once, to enable the local quality gate
cp config.example.json ~/.CC-Beacon/config.json   # fill in token, base_url, sl1_label
uvicorn api.main:app --reload --port 8000
```

## Running tests

```bash
pytest api/tests --cov=api --cov-config=api/pyproject.toml --cov-report=term-missing -v
```

## Workflow

1. Fork the repository and create a branch off `main`.
2. Make your change, with tests covering it.
3. Commit following the convention below.
4. Push and open a pull request against `main`.
5. CI must pass before review.

## Branch naming

| Type | Prefix |
|---|---|
| Feature | `feat/short-description` |
| Bug fix | `fix/short-description` |
| Chore | `chore/short-description` |
| Documentation | `docs/short-description` |
| Refactor | `refactor/short-description` |
| Tests | `test/short-description` |

Use lowercase kebab-case. No special characters.

## Commit convention

Follow [Conventional Commits](https://www.conventionalcommits.org/), imperative mood, lowercase summary, no trailing period, with a mandatory `Modified files:` section:

```
<type>(<optional scope>): <short summary>

Modified files:
- path/to/file-a.ext - what was changed
- path/to/file-b.ext - what was changed
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`.

## Code style

```bash
ruff check api/
ruff format --check api/
cd api && mypy .
```

Also enforced automatically by the local `pre-commit` hook and by CI (`.github/workflows/ci.yml`). CI will reject any pull request that fails these checks.

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
