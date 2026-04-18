#!/usr/bin/env bash
# M033-M037 final comprehensive E2E
# Usage: bash scripts/verify-m033-m037.sh (dev server on :3000)

set -u
BASE="${BASE:-http://localhost:3000}"
FAIL=0
pass() { echo "✅ PASS — $1"; }
fail() { echo "❌ FAIL — $1"; FAIL=$((FAIL + 1)); }

echo "M033-M037 final verify · $BASE"
echo

ACC=$(curl -s "$BASE/s/villa-irabo/villa-irabo")
echo "$ACC" | grep -q "Villa Irabo" && pass "Accommodation still renders post-M033 refactor" || fail "Acc regression"

REST=$(curl -s "$BASE/s/villa-irabo/trattoria-del-borgo")
echo "$REST" | grep -q "Trattoria del Borgo" && pass "Restaurant still renders post-M033 refactor" || fail "Rest regression"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/settings/distribution/10000000-0000-0000-0000-000000000005")
[[ "$CODE" == "307" ]] && pass "Curation editor auth-gated (307)" || fail "Curation gate wrong ($CODE)"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/u/nonexistent-profile")
[[ "$CODE" == "404" ]] && pass "/u/nonexistent returns 404" || fail "/u 404 wrong ($CODE)"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/platform-profile")
[[ "$CODE" == "307" ]] && pass "/platform-profile auth-gated" || fail "/platform-profile gate wrong ($CODE)"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/embed/listing/villa-irabo/villa-irabo")
[[ "$CODE" == "200" ]] && pass "Embed 200" || fail "Embed status ($CODE)"

EMBED=$(curl -s "$BASE/embed/listing/villa-irabo/villa-irabo")
echo "$EMBED" | grep -q "Villa Irabo" && pass "Embed content villa-irabo" || fail "Embed content missing"
echo "$EMBED" | grep -q "Distribuito con" && pass "Embed attribution" || fail "Embed attribution missing"
echo "$EMBED" | grep -q '/book/multi/villa-irabo' && pass "Embed CTA booking link" || fail "Embed CTA missing"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/embed/listing/villa-irabo/nonexistent")
[[ "$CODE" == "404" ]] && pass "Embed 404 for missing listing" || fail "Embed 404 wrong ($CODE)"

DISC=$(curl -s "$BASE/discover")
echo "$DISC" | grep -q "Discover" && pass "/discover renders" || fail "/discover empty"
echo "$DISC" | grep -q "Villa Irabo" && pass "/discover shows Villa Irabo" || fail "Villa Irabo missing"
echo "$DISC" | grep -q "Trattoria del Borgo" && pass "/discover shows Trattoria" || fail "Trattoria missing"
echo "$DISC" | grep -q "Alloggi" && pass "/discover filter chip Alloggi" || fail "Alloggi chip missing"
echo "$DISC" | grep -q "Ristoranti" && pass "/discover filter chip Ristoranti" || fail "Ristoranti chip missing"

DISC_ACC=$(curl -s "$BASE/discover?kind=accommodation")
echo "$DISC_ACC" | grep -q "Villa Irabo" && pass "Filter kind=accommodation shows Villa" || fail "Filter acc missing Villa"
echo "$DISC_ACC" | grep -q "Trattoria del Borgo" && fail "Filter acc should not show Trattoria" || pass "Filter acc excludes Trattoria"

DISC_SEARCH=$(curl -s "$BASE/discover?q=trattoria")
echo "$DISC_SEARCH" | grep -q "Trattoria del Borgo" && pass "Search q=trattoria finds row" || fail "Search trattoria missing"

CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/sitemap-listings.xml")
[[ "$CODE" == "200" ]] && pass "Sitemap still 200" || fail "Sitemap broken"
ROBOTS=$(curl -s "$BASE/robots.txt")
echo "$ROBOTS" | grep -q "/u/" && pass "robots.txt allows /u/" || fail "robots.txt missing /u/"
echo "$ROBOTS" | grep -q "/discover" && pass "robots.txt allows /discover" || fail "robots.txt missing /discover"

echo
if [[ "$FAIL" -gt 0 ]]; then
  echo "❌ $FAIL failure(s)"
  exit 1
fi
echo "ALL PASS"
