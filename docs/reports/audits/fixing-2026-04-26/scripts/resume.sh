#!/usr/bin/env bash
# Stampa istruzioni per riprendere il fixing.
# Non esegue Claude in automatico (servono tool agentici), ma indica esattamente
# cosa fare.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
STATE_FILE="$REPO_ROOT/docs/fixing-2026-04-26/STATE.json"

NEXT=$(jq -r '.steps | to_entries[] | select(.value.status=="pending") | .key' "$STATE_FILE" | head -1)

if [ -z "$NEXT" ]; then
  IN_PROGRESS=$(jq -r '.steps | to_entries[] | select(.value.status=="in_progress") | .key' "$STATE_FILE" | head -1)
  if [ -n "$IN_PROGRESS" ]; then
    echo "Step in_progress: $IN_PROGRESS"
    echo "Open: docs/fixing-2026-04-26/steps/${IN_PROGRESS}-*.md"
    echo "Either complete it (commit + state-update done) or revert + state-update pending."
  else
    echo "All steps done or no pending. Check STATE.json."
  fi
  exit 0
fi

TITLE=$(jq -r --arg k "$NEXT" '.steps[$k].title' "$STATE_FILE")
SPRINT=$(jq -r --arg k "$NEXT" '.steps[$k].sprint' "$STATE_FILE")

cat <<EOF
==========================================
Next pending step: $NEXT (Sprint $SPRINT)
Title: $TITLE
==========================================

Per Claude (in chat):
  "Esegui step $NEXT seguendo docs/fixing-2026-04-26/steps/${NEXT}-*.md"

Manualmente:
  1. Read: docs/fixing-2026-04-26/steps/${NEXT}-*.md
  2. Esegui PRE-CHECK
  3. Se PRE-CHECK già fixato → state-update.sh $NEXT skipped
  4. Altrimenti applica APPLY
  5. Esegui POST-CHECK + verify.sh
  6. Commit con messaggio indicato
  7. state-update.sh $NEXT done <commit-hash>

EOF
