#!/usr/bin/env bash
# M031/S04 — JSON-LD + sitemap + robots verification
# Usage: bash scripts/verify-m031-s04.sh

set -u
BASE="${BASE:-http://localhost:3000}"
FAIL=0

pass() { echo "✅ PASS — $1"; }
fail() { echo "❌ FAIL — $1"; FAIL=$((FAIL + 1)); }

echo "M031/S04 — verify SEO + sitemap + robots · $BASE"
echo

# 1. JSON-LD LodgingBusiness on accommodation listing
HTML=$(curl -s "$BASE/s/villa-irabo/villa-irabo")
if echo "$HTML" | grep -q 'application/ld+json' && echo "$HTML" | grep -q '"@type":"LodgingBusiness"'; then
  pass "Accommodation page contains JSON-LD LodgingBusiness"
else
  fail "Accommodation JSON-LD LodgingBusiness missing"
fi

# 2. JSON-LD Restaurant on restaurant listing
HTML=$(curl -s "$BASE/s/villa-irabo/trattoria-del-borgo")
if echo "$HTML" | grep -q 'application/ld+json' && echo "$HTML" | grep -q '"@type":"Restaurant"'; then
  pass "Restaurant page contains JSON-LD Restaurant"
else
  fail "Restaurant JSON-LD Restaurant missing"
fi

# 3. JSON-LD contains ReserveAction with booking engine URL
if echo "$HTML" | grep -q 'ReserveAction' && echo "$HTML" | grep -q '/book/multi/villa-irabo'; then
  pass "JSON-LD contains ReserveAction pointing to booking engine"
else
  fail "ReserveAction or booking target missing"
fi

# 4. Sitemap returns 200 + XML
HEADERS=$(curl -s -I "$BASE/sitemap-listings.xml")
CODE=$(echo "$HEADERS" | head -1 | awk '{print $2}')
CT=$(echo "$HEADERS" | grep -i "^content-type:" | head -1)
if [[ "$CODE" == "200" ]] && echo "$CT" | grep -qi "application/xml"; then
  pass "Sitemap 200 + application/xml"
else
  fail "Sitemap status=$CODE content-type=$CT"
fi

# 5. Sitemap contains both listings
SITEMAP=$(curl -s "$BASE/sitemap-listings.xml")
if echo "$SITEMAP" | grep -q "/s/villa-irabo/villa-irabo" && echo "$SITEMAP" | grep -q "/s/villa-irabo/trattoria-del-borgo"; then
  pass "Sitemap contains both seeded listings"
else
  fail "Sitemap missing one or both listings"
fi

# 6. Robots.txt serves with Sitemap directive
ROBOTS=$(curl -s "$BASE/robots.txt")
if echo "$ROBOTS" | grep -q "Sitemap:" && echo "$ROBOTS" | grep -q "sitemap-listings.xml"; then
  pass "robots.txt has Sitemap directive"
else
  fail "robots.txt missing Sitemap"
fi

# 7. robots.txt allows /s/ and disallows /api/
if echo "$ROBOTS" | grep -q "Allow: /s/" && echo "$ROBOTS" | grep -q "Disallow: /api/"; then
  pass "robots.txt allow/disallow rules correct"
else
  fail "robots.txt rules incorrect"
fi

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "❌ $FAIL failure(s)"
  exit 1
fi

echo ""
echo "ALL PASS"
exit 0
