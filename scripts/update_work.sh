#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# update_work.sh — Create/update a CC-Beacon work via the API
#
# Usage:
#   update_work.sh \
#     --project "project-name" \
#     --sl1    "sl1-name" \
#     --title  "Work title" \
#     --status "pending|in_progress|done|error" \
#     --steps  '[{"label":"...","status":"done","at":"..."}]' \
#     --summary "Optional free text" \
#     [--id "2026-06-03T10-00-00"]
#
#   update_work.sh --sync-only
#     Refreshes the local index.json cache from the API. Used by the Claude
#     Code Stop hook as a safety net.
#
# Reads: ${CC_BEACON_CONFIG_FILE:-~/.CC-Beacon/config.json} (base_url, token)
# Writes: ${CC_BEACON_WORKS_DIR:-~/.CC-Beacon/works}/index.json
#         (local cache of the API's response — the API itself is the
#         canonical source of truth)
# Calls: POST {base_url}/api/work  |  GET {base_url}/api/index
# ---------------------------------------------------------------------------

CONFIG_FILE="${CC_BEACON_CONFIG_FILE:-${HOME}/.CC-Beacon/config.json}"
WORKS_DIR="${CC_BEACON_WORKS_DIR:-${HOME}/.CC-Beacon/works}"
INDEX_FILE="${WORKS_DIR}/index.json"

# --- Validate dependencies --------------------------------------------------

for cmd in jq curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Error: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: config file not found at $CONFIG_FILE" >&2
  echo "Copy config.example.json to $CONFIG_FILE and fill in your values." >&2
  exit 1
fi

# --- Load config ------------------------------------------------------------

BASE_URL=$(jq -r '.base_url' "$CONFIG_FILE")
TOKEN=$(jq -r '.token' "$CONFIG_FILE")

mkdir -p "$WORKS_DIR"

# --- HTTP helper -------------------------------------------------------------
# Calls the API. On 2xx, writes the response body to $INDEX_FILE.
# On failure, prints the error and exits 1 without touching $INDEX_FILE.

_call_api() {
  local method="$1" url="$2" data="${3:-}"
  local status body_file
  body_file=$(mktemp)

  if [[ -n "$data" ]]; then
    status=$(curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$url" \
      -H "Authorization: Bearer ${TOKEN}" \
      -H "Content-Type: application/json" \
      -d "$data")
  else
    status=$(curl -sS -o "$body_file" -w '%{http_code}' -X "$method" "$url" \
      -H "Authorization: Bearer ${TOKEN}")
  fi

  if [[ ! "$status" =~ ^2 ]]; then
    echo "Error: API request failed (HTTP ${status})" >&2
    cat "$body_file" >&2
    rm -f "$body_file"
    exit 1
  fi

  jq '.' "$body_file" > "$INDEX_FILE"
  rm -f "$body_file"
}

# --- Sync-only mode (Stop hook) ---------------------------------------------

if [[ "${1:-}" == "--sync-only" ]]; then
  _call_api GET "${BASE_URL}/api/index"
  echo "✓ CC-Beacon index refreshed."
  exit 0
fi

# --- Parse arguments --------------------------------------------------------

PROJECT=""
SL1=""
TITLE=""
STATUS="pending"
STEPS="[]"
SUMMARY=""
ID=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project)  PROJECT="$2";  shift 2 ;;
    --sl1)      SL1="$2";      shift 2 ;;
    --title)    TITLE="$2";    shift 2 ;;
    --status)   STATUS="$2";   shift 2 ;;
    --steps)    STEPS="$2";    shift 2 ;;
    --summary)  SUMMARY="$2";  shift 2 ;;
    --id)       ID="$2";       shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$PROJECT" || -z "$SL1" || -z "$TITLE" ]]; then
  echo "Error: --project, --sl1 and --title are required." >&2
  exit 1
fi

if [[ -z "$ID" ]]; then
  ID=$(date -u +%Y-%m-%dT%H-%M-%S)
fi

# --- Build payload and push to the API --------------------------------------

PAYLOAD=$(jq -n \
  --arg     id      "$ID"      \
  --arg     project "$PROJECT" \
  --arg     sl1     "$SL1"     \
  --arg     title   "$TITLE"   \
  --arg     status  "$STATUS"  \
  --argjson steps   "$STEPS"   \
  --arg     summary "$SUMMARY" \
  '{id: $id, project: $project, sl1: $sl1, title: $title, status: $status, steps: $steps, summary: $summary}')

_call_api POST "${BASE_URL}/api/work" "$PAYLOAD"

echo "✓ Work '${ID}' (${STATUS}) synced."
