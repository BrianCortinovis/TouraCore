#!/usr/bin/env bash
set -euo pipefail

# Demo seed runner - wipe + seed via Supabase Management API
# Usa SUPABASE_ACCESS_TOKEN dal .env.local

cd "$(dirname "$0")"

PROJECT_REF="dysnrgnqzliodqrsohoz"
ENV_FILE="../../apps/web/.env.local"

if [[ -f "$ENV_FILE" ]]; then
  ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
fi
: "${ACCESS_TOKEN:?SUPABASE_ACCESS_TOKEN non trovato}"

run_sql_file() {
  local file="$1"
  local label="$2"
  echo "  → $label ($file)..."
  local payload
  payload=$(jq -Rs '{query: .}' "$file")
  local resp
  resp=$(curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$payload")
  if echo "$resp" | grep -q '"message":"Failed'; then
    echo "  ❌ FAIL"
    echo "$resp" | head -c 1000
    echo
    exit 1
  fi
  echo "  ✓ OK"
}

echo "[1/3] Reset (wipe dati demo briansnow86)"
run_sql_file 01_reset.sql "reset"

echo "[2/3] Seed strutture (7 entity + room/rate/upsell)"
run_sql_file 02_seed_structures.sql "structures"

echo "[3/3] Seed reservations Q2-Q4 2026 ~70% occupancy"
run_sql_file 03_seed_reservations.sql "reservations"

echo
echo "✅ Demo seed completato"
