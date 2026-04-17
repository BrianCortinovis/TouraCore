#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PROJECT_REF="dysnrgnqzliodqrsohoz"
ENV_FILE="../../apps/web/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
fi
: "${ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN non trovato}"

echo "⚠️  RESET: wipe tutti i dati demo briansnow86"
PAYLOAD=$(jq -Rs '{query: .}' 01_reset.sql)
RESP=$(curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")

if echo "$RESP" | grep -q '"message":"Failed'; then
  echo "❌ FAIL"
  echo "$RESP" | head -c 1000
  exit 1
fi

echo "✅ DB demo resettato"
