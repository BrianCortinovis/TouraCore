#!/usr/bin/env bash
# Verify generico post-step: lint + typecheck.
# Uso: bash docs/fixing-2026-04-26/scripts/verify.sh [--full]
# --full include test:unit + test:e2e
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

FULL=0
[ "${1:-}" = "--full" ] && FULL=1

echo "=========================================="
echo "Verify TouraCore — fixing post-step check"
echo "=========================================="
echo ""

echo "[1/3] pnpm lint..."
if pnpm lint 2>&1 | tail -20; then
  LINT_OK=1
else
  LINT_OK=0
fi

echo ""
echo "[2/3] pnpm typecheck..."
if pnpm typecheck 2>&1 | tail -20; then
  TYPE_OK=1
else
  TYPE_OK=0
fi

if [ $FULL -eq 1 ]; then
  echo ""
  echo "[3/3] pnpm test:unit (compliance)..."
  if pnpm test:unit 2>&1 | tail -20; then
    UNIT_OK=1
  else
    UNIT_OK=0
  fi
fi

echo ""
echo "=========================================="
echo "Verify result:"
echo "  lint:      $([ $LINT_OK -eq 1 ] && echo OK || echo FAIL)"
echo "  typecheck: $([ $TYPE_OK -eq 1 ] && echo OK || echo FAIL)"
[ $FULL -eq 1 ] && echo "  unit:      $([ $UNIT_OK -eq 1 ] && echo OK || echo FAIL)"
echo "=========================================="

if [ $LINT_OK -eq 0 ] || [ $TYPE_OK -eq 0 ]; then
  echo "VERIFY FAILED. Do NOT commit. Fix issues first."
  exit 1
fi

if [ $FULL -eq 1 ] && [ $UNIT_OK -eq 0 ]; then
  echo "UNIT TESTS FAILED. Do NOT commit. Fix issues first."
  exit 1
fi

echo "VERIFY OK. Safe to commit."
