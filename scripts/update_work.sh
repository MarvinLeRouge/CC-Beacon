#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# update_work.sh — Create/update a CC-Beacon work file and sync to VPS
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
#     Skips file creation — rsync only. Used by the Claude Code Stop hook.
#
# Reads: ~/.CC-Beacon/config.json
# Writes: ~/.CC-Beacon/works/<id>.json  +  ~/.CC-Beacon/works/index.json
# Pushes: rsync -az ~/.CC-Beacon/works/ user@host:remote_path
# ---------------------------------------------------------------------------

CONFIG_FILE="${HOME}/.CC-Beacon/config.json"
WORKS_DIR="${HOME}/.CC-Beacon/works"
PER_PAGE=10

# --- Validate dependencies --------------------------------------------------

for cmd in jq rsync; do
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

VPS_HOST=$(jq -r '.vps_host' "$CONFIG_FILE")
VPS_USER=$(jq -r '.vps_user' "$CONFIG_FILE")
REMOTE_PATH=$(jq -r '.remote_path' "$CONFIG_FILE")

# --- Sync-only mode (Stop hook) ---------------------------------------------

if [[ "${1:-}" == "--sync-only" ]]; then
  if [[ -d "$WORKS_DIR" ]]; then
    rsync -az "${WORKS_DIR}/" "${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}"
    echo "✓ CC-Beacon sync done."
  fi
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

# --- Prepare work file ------------------------------------------------------

mkdir -p "$WORKS_DIR"

if [[ -z "$ID" ]]; then
  ID=$(date -u +%Y-%m-%dT%H-%M-%S)
fi

WORK_FILE="${WORKS_DIR}/${ID}.json"
NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

if [[ -f "$WORK_FILE" ]]; then
  STARTED_AT=$(jq -r '.started_at' "$WORK_FILE")
  # Preserve completion_time if already set and status is still done
  COMPLETION_TIME=$(jq -r '.completion_time // ""' "$WORK_FILE")
else
  STARTED_AT="$NOW"
  COMPLETION_TIME=""
fi

# Set completion_time when work is marked done for the first time
if [[ "$STATUS" == "done" && -z "$COMPLETION_TIME" ]]; then
  COMPLETION_TIME="$NOW"
fi

jq -n \
  --arg     id              "$ID"             \
  --arg     project         "$PROJECT"        \
  --arg     sl1             "$SL1"            \
  --arg     title           "$TITLE"          \
  --arg     status          "$STATUS"         \
  --arg     started_at      "$STARTED_AT"     \
  --arg     updated_at      "$NOW"            \
  --arg     completion_time "$COMPLETION_TIME" \
  --argjson steps           "$STEPS"          \
  --arg     summary         "$SUMMARY"        \
  '{
    id:              $id,
    project:         $project,
    sl1:             $sl1,
    title:           $title,
    status:          $status,
    started_at:      $started_at,
    updated_at:      $updated_at,
    completion_time: (if $completion_time == "" then null else $completion_time end),
    steps:           $steps,
    summary:         $summary
  }' > "$WORK_FILE"

# --- Regenerate index -------------------------------------------------------

WORKS_JSON=$(
  find "$WORKS_DIR" -maxdepth 1 -name "*.json" ! -name "index.json" | sort |
  xargs -I{} jq '{
    id:              .id,
    project:         .project,
    sl1:             .sl1,
    title:           .title,
    status:          .status,
    started_at:      .started_at,
    updated_at:      .updated_at,
    completion_time: .completion_time,
    step_count:      (.steps | length),
    steps_done:      ([.steps[] | select(.status == "done")] | length)
  }' {} |
  jq -s '.'
)

TOTAL=$(echo "$WORKS_JSON" | jq 'length')

jq -n \
  --argjson works    "$WORKS_JSON" \
  --argjson total    "$TOTAL"      \
  --argjson per_page "$PER_PAGE"   \
  '{works:$works, page:1, per_page:$per_page, total:$total}' \
  > "${WORKS_DIR}/index.json"

# --- Push to VPS ------------------------------------------------------------

rsync -az "${WORKS_DIR}/" "${VPS_USER}@${VPS_HOST}:${REMOTE_PATH}"

echo "✓ Work '${ID}' (${STATUS}) pushed to VPS."
