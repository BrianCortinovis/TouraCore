#!/usr/bin/env bash
# Aggiorna stato di uno step + appende log.
# Usage:
#   bash state-update.sh <STEP_ID> <STATUS> [COMMIT_HASH] [DETAILS]
# Esempi:
#   bash state-update.sh S010 in_progress
#   bash state-update.sh S010 done abc1234 "fail-closed pattern applied"
#   bash state-update.sh S005 skipped "" "already fixed"
set -euo pipefail

STEP=$1
STATUS=$2
COMMIT=${3:-}
DETAILS=${4:-}

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STATE_FILE="$REPO_ROOT/docs/fixing-2026-04-26/STATE.json"
LOG_FILE="$REPO_ROOT/docs/fixing-2026-04-26/LOG.md"

# Validate status
case "$STATUS" in
  pending|in_progress|done|skipped|failed) ;;
  *) echo "Invalid status: $STATUS"; exit 1 ;;
esac

# Update STATE.json atomically
TMP=$(mktemp)
jq --arg step "$STEP" --arg status "$STATUS" --arg commit "$COMMIT" \
   '.steps[$step].status = $status |
    (if $commit != "" then .steps[$step].commit = $commit else . end) |
    .current_step = (if $status == "done" or $status == "skipped" then null else $step end)' \
   "$STATE_FILE" > "$TMP"
mv "$TMP" "$STATE_FILE"

# Append LOG
TS=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
{
  echo "$TS | $STEP | $STATUS${COMMIT:+ | commit=$COMMIT}${DETAILS:+ | $DETAILS}"
} >> "$LOG_FILE"

echo "Updated $STEP → $STATUS"
