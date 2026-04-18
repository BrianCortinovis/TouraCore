#!/usr/bin/env bash
# M031/S03 — E2E verify route /s/[tenantSlug]/[entitySlug]
# Usage: (with dev server already running on localhost:3000)
#   bash scripts/verify-m031-s03.sh

set -u
BASE="${BASE:-http://localhost:3000}"
FAIL=0

run() {
  local label="$1" path="$2" want_status="$3" want_grep="$4"
  local tmp
  tmp="$(mktemp)"
  local code
  code=$(curl -s -o "$tmp" -w "%{http_code}" "$BASE$path")
  if [[ "$code" != "$want_status" ]]; then
    echo "❌ FAIL — $label · got status $code, want $want_status"
    rm -f "$tmp"
    FAIL=$((FAIL + 1))
    return
  fi
  if [[ -n "$want_grep" ]] && ! grep -q "$want_grep" "$tmp"; then
    echo "❌ FAIL — $label · status ok but missing grep '$want_grep'"
    rm -f "$tmp"
    FAIL=$((FAIL + 1))
    return
  fi
  echo "✅ PASS — $label ($code)"
  rm -f "$tmp"
}

echo "M031/S03 — verify public listing routes · $BASE"
echo

run "Accommodation listing 200 + H1"              "/s/villa-irabo/villa-irabo"             "200" "<h1[^>]*>Villa Irabo</h1>"
run "Restaurant listing 200 + H1"                 "/s/villa-irabo/trattoria-del-borgo"     "200" "<h1[^>]*>Trattoria del Borgo</h1>"
run "Accommodation SEO title set from seed"       "/s/villa-irabo/villa-irabo"             "200" "<title>Villa Irabo — Suite Vista Lago"
run "Restaurant SEO title set from seed"          "/s/villa-irabo/trattoria-del-borgo"     "200" "<title>Trattoria del Borgo — Cucina lombarda"
run "Listing 404 when entity slug missing"        "/s/villa-irabo/nonesiste"               "404" ""
run "Listing 404 when tenant slug missing"        "/s/nope-tenant/villa-irabo"             "404" ""
run "CTA link to booking engine present"          "/s/villa-irabo/villa-irabo"             "200" "/book/multi/villa-irabo"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "❌ $FAIL failure(s)"
  exit 1
fi

echo ""
echo "ALL PASS"
exit 0
