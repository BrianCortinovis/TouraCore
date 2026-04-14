#!/usr/bin/env bash
set -uo pipefail

cd "$(dirname "$0")/.."

ERRORS=0
pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; ERRORS=$((ERRORS + 1)); }

echo "=== S04 Verification Script ==="

# 1. Check component file counts
RATES=$(find verticals/hospitality/src/components/rates -name "*.tsx" | wc -l | tr -d ' ')
[ "$RATES" -ge 5 ] && pass "rates/ has $RATES component files" || fail "rates/ has $RATES files (expected >= 5)"

RESERVATIONS=$(find verticals/hospitality/src/components/reservations -name "*.tsx" | wc -l | tr -d ' ')
[ "$RESERVATIONS" -ge 4 ] && pass "reservations/ has $RESERVATIONS component files" || fail "reservations/ has $RESERVATIONS files (expected >= 4)"

SETTINGS=$(find verticals/hospitality/src/components/settings -name "*.tsx" | wc -l | tr -d ' ')
[ "$SETTINGS" -ge 4 ] && pass "settings/ has $SETTINGS component files" || fail "settings/ has $SETTINGS files (expected >= 4)"

BOOKING=$(find verticals/hospitality/src/components/booking -name "*.tsx" | wc -l | tr -d ' ')
[ "$BOOKING" -ge 1 ] && pass "booking/ has $BOOKING component files" || fail "booking/ missing"

PROPERTY=$(find verticals/hospitality/src/components/property -name "*.tsx" | wc -l | tr -d ' ')
[ "$PROPERTY" -ge 1 ] && pass "property/ has $PROPERTY component files" || fail "property/ missing"

COMPLIANCE_COMP=$(find verticals/hospitality/src/components/compliance -name "*.tsx" | wc -l | tr -d ' ')
[ "$COMPLIANCE_COMP" -ge 2 ] && pass "compliance/ has $COMPLIANCE_COMP component files" || fail "compliance/ has $COMPLIANCE_COMP files (expected >= 2)"

PAYMENTS=$(find verticals/hospitality/src/components/payments -name "*.tsx" | wc -l | tr -d ' ')
[ "$PAYMENTS" -ge 1 ] && pass "payments/ has $PAYMENTS component files" || fail "payments/ missing"

# 2. Check barrel exports exist
[ -f verticals/hospitality/src/components/index.ts ] && pass "components barrel exists" || fail "components barrel missing"
[ -f verticals/hospitality/src/index.ts ] && pass "main barrel exists" || fail "main barrel missing"

# 3. Check main barrel re-exports key modules
for mod in types/database config queries auth stores hooks components; do
  grep -q "$mod" verticals/hospitality/src/index.ts && pass "barrel re-exports $mod" || fail "barrel missing $mod"
done

# 4. No leftover @/lib/ imports
STALE=$(grep -r "from '@/lib/" verticals/hospitality/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
[ "$STALE" -eq 0 ] && pass "no @/lib/ imports remain" || fail "$STALE files still have @/lib/ imports"

# 5. No organization_id (should be property_id)
ORG_IDS=$(grep -r "organization_id" verticals/hospitality/src/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
[ "$ORG_IDS" -eq 0 ] && pass "no organization_id references" || fail "$ORG_IDS organization_id references remain"

# 6. Wiring proof page
[ -f apps/web/src/app/wiring-proof/page.tsx ] && pass "wiring proof page exists" || fail "wiring proof page missing"

# 7. apps/web depends on @touracore/hospitality
grep -q '"@touracore/hospitality"' apps/web/package.json && pass "apps/web depends on @touracore/hospitality" || fail "apps/web missing hospitality dep"
grep -q '"@touracore/db"' apps/web/package.json && pass "apps/web depends on @touracore/db" || fail "apps/web missing db dep"

# 8. Build checks
echo ""
echo "--- Running pnpm build ---"
pnpm build > /dev/null 2>&1 && pass "pnpm build passes" || fail "pnpm build failed"

echo "--- Running pnpm typecheck ---"
pnpm typecheck > /dev/null 2>&1 && pass "pnpm typecheck passes" || fail "pnpm typecheck failed"

echo "--- Running pnpm lint ---"
pnpm lint > /dev/null 2>&1 && pass "pnpm lint passes" || fail "pnpm lint failed"

echo ""
if [ "$ERRORS" -eq 0 ]; then
  echo "🎉 All S04 checks passed!"
  exit 0
else
  echo "💥 $ERRORS checks failed"
  exit 1
fi
