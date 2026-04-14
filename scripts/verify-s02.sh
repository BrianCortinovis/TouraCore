#!/usr/bin/env bash
# Script di verifica per la slice S02: shared configs + UI components + types
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

echo "=== Verifica S02: Shared Configs, UI Components, Types ==="
echo

# Shared tsconfig presets
check "tsconfig/base.json esiste" test -f packages/config/tsconfig/base.json
check "tsconfig/nextjs.json esiste" test -f packages/config/tsconfig/nextjs.json
check "tsconfig/library.json esiste" test -f packages/config/tsconfig/library.json
check "base.json contiene noUncheckedIndexedAccess" grep -q "noUncheckedIndexedAccess" packages/config/tsconfig/base.json

# ESLint config
check "eslint.config.mjs root esiste" test -f eslint.config.mjs
check "packages/config/eslint/index.mjs esiste" test -f packages/config/eslint/index.mjs

# Tailwind shared CSS
check "packages/config/tailwind/globals.css esiste" test -f packages/config/tailwind/globals.css
check "apps/web/src/app/globals.css importa shared tokens" grep -q "@touracore/config/tailwind/tokens.css" apps/web/src/app/globals.css

# UI components (8 attesi)
check "Button.tsx esiste" test -f packages/core/ui/src/components/Button.tsx
check "Card.tsx esiste" test -f packages/core/ui/src/components/Card.tsx
check "Input.tsx esiste" test -f packages/core/ui/src/components/Input.tsx
check "Select.tsx esiste" test -f packages/core/ui/src/components/Select.tsx
check "Badge.tsx esiste" test -f packages/core/ui/src/components/Badge.tsx
check "Modal.tsx esiste" test -f packages/core/ui/src/components/Modal.tsx
check "DataTable.tsx esiste" test -f packages/core/ui/src/components/DataTable.tsx
check "InlineHelp.tsx esiste" test -f packages/core/ui/src/components/InlineHelp.tsx

# cn utility
check "cn.ts utility esiste" test -f packages/core/ui/src/lib/cn.ts

# Zod schemas
check "schemas/common.ts esiste" test -f packages/types/src/schemas/common.ts

# Build, typecheck, lint
check "pnpm install riesce" pnpm install
check "pnpm build riesce" pnpm build
check "pnpm typecheck riesce" pnpm run typecheck
check "pnpm lint riesce" pnpm lint

echo
echo "=== Risultati: $PASS passati, $FAIL falliti ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
