#!/usr/bin/env bash
# M032 — Hospitality + Restaurant auto-compiled templates E2E
# Usage: bash scripts/verify-m032.sh

set -u
BASE="${BASE:-http://localhost:3000}"
FAIL=0
pass() { echo "✅ PASS — $1"; }
fail() { echo "❌ FAIL — $1"; FAIL=$((FAIL + 1)); }

echo "M032 — verify kind-specific templates · $BASE"
echo

ACC_HTML=$(curl -s "$BASE/s/villa-irabo/villa-irabo")
REST_HTML=$(curl -s "$BASE/s/villa-irabo/trattoria-del-borgo")

# ─── ACCOMMODATION ───────────────────────────────────
echo "[Accommodation /s/villa-irabo/villa-irabo]"
echo "$ACC_HTML" | grep -q "Casa vacanze" && pass "Property type label 'Casa vacanze'" || fail "Property type missing"
echo "$ACC_HTML" | grep -q "Gardone Riviera" && pass "City rendered 'Gardone Riviera'" || fail "City missing"
echo "$ACC_HTML" | grep -qE "dalle [0-9]{2}:[0-9]{2}" && pass "Check-in time rendered" || fail "Check-in time missing"
echo "$ACC_HTML" | grep -qE "entro [0-9]{2}:[0-9]{2}" && pass "Check-out time rendered" || fail "Check-out time missing"
echo "$ACC_HTML" | grep -q "Piscina" && pass "Amenity Piscina rendered" || fail "Piscina missing"
echo "$ACC_HTML" | grep -q "Vista lago" && pass "Amenity Vista lago rendered" || fail "Vista lago missing"
echo "$ACC_HTML" | grep -q "Wi-Fi" && pass "Amenity Wi-Fi rendered" || fail "Wi-Fi missing"
echo "$ACC_HTML" | grep -q "Giardino" && pass "Amenity Giardino rendered" || fail "Giardino missing"
echo "$ACC_HTML" | grep -q '"@type":"LodgingBusiness"' && pass "JSON-LD LodgingBusiness" || fail "LodgingBusiness missing"
echo "$ACC_HTML" | grep -q '"addressLocality":"Gardone Riviera"' && pass "JSON-LD addressLocality" || fail "addressLocality missing"
echo "$ACC_HTML" | grep -q '"checkinTime"' && pass "JSON-LD checkinTime" || fail "checkinTime missing"
echo "$ACC_HTML" | grep -q '"checkoutTime"' && pass "JSON-LD checkoutTime" || fail "checkoutTime missing"

echo
echo "[Restaurant /s/villa-irabo/trattoria-del-borgo]"
echo "$REST_HTML" | grep -q "Italiana" && pass "Cuisine tag 'Italiana'" || fail "Italiana missing"
echo "$REST_HTML" | grep -q "Pesce" && pass "Cuisine tag 'Pesce'" || fail "Pesce missing"
echo "$REST_HTML" | grep -q "Pizza" && pass "Cuisine tag 'Pizza'" || fail "Pizza missing"
echo "$REST_HTML" | grep -q "€€€" && pass "Price range €€€" || fail "Price range missing"
echo "$REST_HTML" | grep -q "80 coperti" && pass "Capacity 80 coperti" || fail "Capacity missing"
for DAY in Lunedì Martedì Mercoledì Giovedì Venerdì Sabato Domenica; do
  echo "$REST_HTML" | grep -q "$DAY" && pass "Weekday $DAY rendered" || fail "Weekday $DAY missing"
done
echo "$REST_HTML" | grep -q "Oggi" && pass "Today marker rendered" || fail "Oggi missing"
echo "$REST_HTML" | grep -q "12:00" && pass "Lunch slot 12:00 rendered" || fail "12:00 missing"
echo "$REST_HTML" | grep -q "19:00" && pass "Dinner slot 19:00 rendered" || fail "19:00 missing"
echo "$REST_HTML" | grep -q '"@type":"Restaurant"' && pass "JSON-LD Restaurant" || fail "Restaurant missing"
echo "$REST_HTML" | grep -q '"servesCuisine"' && pass "JSON-LD servesCuisine" || fail "servesCuisine missing"
echo "$REST_HTML" | grep -q '"priceRange":"€€€"' && pass "JSON-LD priceRange €€€" || fail "priceRange missing"
echo "$REST_HTML" | grep -q '"OpeningHoursSpecification"' && pass "JSON-LD OpeningHoursSpecification" || fail "OpeningHoursSpec missing"

echo
echo "[Regression previous M031 assertions still green]"
echo "$ACC_HTML" | grep -q "/book/multi/villa-irabo" && pass "CTA booking engine accommodation" || fail "CTA accommodation missing"
echo "$REST_HTML" | grep -q "/book/multi/villa-irabo" && pass "CTA booking engine restaurant" || fail "CTA restaurant missing"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/s/villa-irabo/nonesiste")
[[ "$CODE" == "404" ]] && pass "404 for missing entity" || fail "404 regression (got $CODE)"

echo
if [[ "$FAIL" -gt 0 ]]; then
  echo "❌ $FAIL failure(s)"
  exit 1
fi
echo "ALL PASS"
