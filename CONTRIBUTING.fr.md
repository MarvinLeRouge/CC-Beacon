🇫🇷 Version française | [🇬🇧 English version](CONTRIBUTING.md)

---

# Contribuer à CC-Beacon

Il s'agit d'un projet personnel. Les contributions externes (rapports de bugs, correctifs, petites améliorations) sont bienvenues mais dans une portée limitée.

## Prérequis

- Python 3.11+
- Docker (optionnel, pour construire l'image de production)

## Installation locale

```bash
git clone https://github.com/MarvinLeRouge/CC-Beacon.git
cd CC-Beacon
pip install -r api/requirements.txt -r api/requirements-dev.txt
pre-commit install   # une fois, pour activer le garde-fou qualité local
cp config.example.json ~/.CC-Beacon/config.json   # renseigner token, base_url, sl1_label
uvicorn api.main:app --reload --port 8000
```

## Lancer les tests

```bash
pytest api/tests --cov=api --cov-config=api/pyproject.toml --cov-report=term-missing -v
```

## Workflow

1. Forker le dépôt et créer une branche à partir de `main`.
2. Faire la modification, avec des tests qui la couvrent.
3. Commiter en suivant la convention ci-dessous.
4. Pousser et ouvrir une pull request vers `main`.
5. La CI doit passer avant la revue.

## Nommage des branches

| Type | Préfixe |
|---|---|
| Fonctionnalité | `feat/description-courte` |
| Correction | `fix/description-courte` |
| Maintenance | `chore/description-courte` |
| Documentation | `docs/description-courte` |
| Refactoring | `refactor/description-courte` |
| Tests | `test/description-courte` |

Minuscules, kebab-case, sans caractères spéciaux.

## Convention de commit

Suivre [Conventional Commits](https://www.conventionalcommits.org/), impératif, minuscules, sans point final, avec une section `Modified files:` obligatoire :

```
<type>(<scope optionnel>): <résumé court>

Modified files:
- chemin/vers/fichier-a.ext - ce qui a été modifié
- chemin/vers/fichier-b.ext - ce qui a été modifié
```

Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`.

## Style de code

```bash
ruff check api/
ruff format --check api/
cd api && mypy .
```

Egalement vérifié automatiquement par le hook `pre-commit` local et par la CI (`.github/workflows/ci.yml`). La CI rejettera toute pull request qui ne passe pas ces vérifications.

## Code de conduite

Ce projet suit un [Code de conduite](CODE_OF_CONDUCT.fr.md). En participant, vous vous engagez à le respecter.

## Licence

En contribuant, vous acceptez que vos contributions soient distribuées sous la [licence MIT](LICENSE) du projet.
