#!/usr/bin/env bash
# Mostra dashboard avanzamento fixing.
# Usage: bash docs/fixing-2026-04-26/scripts/status.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STATE_FILE="$REPO_ROOT/docs/fixing-2026-04-26/STATE.json"
LOG_FILE="$REPO_ROOT/docs/fixing-2026-04-26/LOG.md"

if [ ! -f "$STATE_FILE" ]; then
  echo "ERROR: STATE.json not found at $STATE_FILE"
  exit 1
fi

echo "=========================================="
echo "TouraCore Fixing — Status Dashboard"
echo "=========================================="
echo ""
echo "Branch: $(git -C "$REPO_ROOT" branch --show-current)"
echo "HEAD:   $(git -C "$REPO_ROOT" rev-parse --short HEAD)"
echo ""

# Counts per status
DONE=$(jq -r '[.steps | to_entries[] | select(.value.status=="done")] | length' "$STATE_FILE")
PENDING=$(jq -r '[.steps | to_entries[] | select(.value.status=="pending")] | length' "$STATE_FILE")
IN_PROGRESS=$(jq -r '[.steps | to_entries[] | select(.value.status=="in_progress")] | length' "$STATE_FILE")
SKIPPED=$(jq -r '[.steps | to_entries[] | select(.value.status=="skipped")] | length' "$STATE_FILE")
FAILED=$(jq -r '[.steps | to_entries[] | select(.value.status=="failed")] | length' "$STATE_FILE")
TOTAL=$((DONE + PENDING + IN_PROGRESS + SKIPPED + FAILED))

echo "Progress: $DONE / $TOTAL completed"
echo "  done:        $DONE"
echo "  in_progress: $IN_PROGRESS"
echo "  pending:     $PENDING"
echo "  skipped:     $SKIPPED"
echo "  failed:      $FAILED"
echo ""

# Per-sprint breakdown
for SPRINT in 1 2 3; do
  SPRINT_DONE=$(jq -r --argjson s $SPRINT '[.steps | to_entries[] | select(.value.sprint==$s and .value.status=="done")] | length' "$STATE_FILE")
  SPRINT_TOTAL=$(jq -r --argjson s $SPRINT '[.steps | to_entries[] | select(.value.sprint==$s)] | length' "$STATE_FILE")
  echo "Sprint $SPRINT: $SPRINT_DONE / $SPRINT_TOTAL"
done
echo ""

# Next pending
NEXT=$(jq -r '.steps | to_entries[] | select(.value.status=="pending") | .key' "$STATE_FILE" | head -1)
if [ -n "$NEXT" ]; then
  TITLE=$(jq -r --arg k "$NEXT" '.steps[$k].title' "$STATE_FILE")
  echo "Next pending: $NEXT — $TITLE"
  echo "Resume with: bash docs/fixing-2026-04-26/scripts/resume.sh"
else
  echo "All steps complete or no pending."
fi
echo ""

# Last 5 log entries
echo "Last 5 log events:"
tail -5 "$LOG_FILE" | sed 's/^/  /'
echo ""
