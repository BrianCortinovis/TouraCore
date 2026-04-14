#!/usr/bin/env bash
# Script di verifica per la slice S01: scaffold monorepo
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

echo "=== Verifica S01: Monorepo Scaffold ==="
echo

# Struttura directory
check "apps/web/package.json esiste" test -f apps/web/package.json
check "apps/web/src/app/page.tsx esiste" test -f apps/web/src/app/page.tsx
check "apps/web/src/app/layout.tsx esiste" test -f apps/web/src/app/layout.tsx
check "apps/web/next.config.ts esiste" test -f apps/web/next.config.ts
check "apps/web/tsconfig.json esiste" test -f apps/web/tsconfig.json
check "supabase/config.toml esiste" test -f supabase/config.toml

# Configurazione root
check "pnpm-workspace.yaml esiste" test -f pnpm-workspace.yaml
check "turbo.json esiste" test -f turbo.json
check ".npmrc esiste" test -f .npmrc
check "tsconfig.json root esiste" test -f tsconfig.json

# Workspace stubs (campione)
check "packages/db esiste" test -d packages/db
check "packages/types esiste" test -d packages/types
check "packages/config esiste" test -d packages/config
check "packages/core/auth esiste" test -d packages/core/auth
check "packages/core/ui esiste" test -d packages/core/ui
check "verticals/hospitality esiste" test -d verticals/hospitality

# Conteggio package core (16 attesi)
CORE_COUNT=$(ls -d packages/core/*/ 2>/dev/null | wc -l | tr -d ' ')
check "16 package core presenti ($CORE_COUNT trovati)" test "$CORE_COUNT" -eq 16

# Build
check "pnpm install riesce" pnpm install
check "pnpm build riesce" pnpm build

echo
echo "=== Risultati: $PASS passati, $FAIL falliti ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
