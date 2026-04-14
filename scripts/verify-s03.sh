#!/usr/bin/env bash
# Script di verifica per la slice S03: schema database multi-tenant
set -euo pipefail

PASS=0
FAIL=0

check() {
  local desc="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "❌ $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Verifica S03: Database Schema Multi-Tenant ==="
echo

MIGRATIONS_DIR="supabase/migrations"

# --- 1. All 10 migration files exist ---
for i in $(seq -w 1 10); do
  f="${MIGRATIONS_DIR}/000${i}_"
  check "Migration 000${i} esiste" test -n "$(ls ${f}* 2>/dev/null)"
done

# --- 2. Count CREATE TABLE statements (expect >= 18) ---
TABLE_COUNT=$(cat ${MIGRATIONS_DIR}/*.sql | grep -c 'CREATE TABLE' || true)
TABLE_COUNT=${TABLE_COUNT:-0}
check "Almeno 18 CREATE TABLE trovate ($TABLE_COUNT)" test "$TABLE_COUNT" -ge 18

# --- 3. Count ENABLE ROW LEVEL SECURITY (must match table count) ---
RLS_COUNT=$(cat ${MIGRATIONS_DIR}/*.sql | grep -c 'ENABLE ROW LEVEL SECURITY' || true)
RLS_COUNT=${RLS_COUNT:-0}
check "RLS abilitata su tutte le tabelle ($RLS_COUNT ENABLE RLS, $TABLE_COUNT tabelle)" test "$RLS_COUNT" -ge "$TABLE_COUNT"

# --- 4. Count CREATE POLICY statements (at least 64) ---
POLICY_COUNT=$(cat ${MIGRATIONS_DIR}/*.sql | grep -c 'CREATE POLICY' || true)
POLICY_COUNT=${POLICY_COUNT:-0}
check "Almeno 64 CREATE POLICY trovate ($POLICY_COUNT)" test "$POLICY_COUNT" -ge 64

# --- 5. No organization_id column references (function definitions are OK) ---
ORG_COL_HITS=$(cat ${MIGRATIONS_DIR}/*.sql | grep -v 'FUNCTION.*organization_id' | grep -c 'organization_id' || true)
ORG_COL_HITS=${ORG_COL_HITS:-0}
check "Zero colonne organization_id ($ORG_COL_HITS trovati)" test "$ORG_COL_HITS" -eq 0

# --- 6. Required helper functions defined ---
check "get_user_tenant_ids() definita" grep -q 'get_user_tenant_ids' ${MIGRATIONS_DIR}/00001_extensions_and_functions.sql
check "get_user_organization_ids() definita" grep -q 'get_user_organization_ids' ${MIGRATIONS_DIR}/00001_extensions_and_functions.sql
check "get_user_property_ids() definita" grep -q 'get_user_property_ids' ${MIGRATIONS_DIR}/00007_hospitality_properties.sql
check "update_updated_at() definita" grep -q 'update_updated_at' ${MIGRATIONS_DIR}/00001_extensions_and_functions.sql

# --- 7. Tenant isolation guards ---
check "Composite unique index su room_types" grep -q 'idx_room_types_id_property_unique' ${MIGRATIONS_DIR}/00010_tenant_isolation_guards.sql
check "Composite unique index su rooms" grep -q 'idx_rooms_id_property_unique' ${MIGRATIONS_DIR}/00010_tenant_isolation_guards.sql
check "Composite unique index su rate_plans" grep -q 'idx_rate_plans_id_property_unique' ${MIGRATIONS_DIR}/00010_tenant_isolation_guards.sql
check "enforce_room_property_consistency() trigger" grep -q 'enforce_room_property_consistency' ${MIGRATIONS_DIR}/00010_tenant_isolation_guards.sql
check "enforce_rate_price_consistency() trigger" grep -q 'enforce_rate_price_consistency' ${MIGRATIONS_DIR}/00010_tenant_isolation_guards.sql

# --- 8. Supabase db reset (optional — only if CLI + Docker available) ---
if command -v supabase >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    echo
    echo "--- supabase db reset ---"
    if supabase db reset 2>&1; then
      echo "✅ supabase db reset riuscito"
      PASS=$((PASS + 1))
    else
      echo "❌ supabase db reset fallito"
      FAIL=$((FAIL + 1))
    fi
  else
    echo "⏭️  Docker non disponibile, skip supabase db reset"
  fi
else
  echo "⏭️  Supabase CLI non disponibile, skip supabase db reset"
fi

echo
echo "=== Risultati: $PASS passati, $FAIL falliti ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
