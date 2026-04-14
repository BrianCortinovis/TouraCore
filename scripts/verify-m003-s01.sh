#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
BASE_URL="${1:-http://localhost:3000}"

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }

echo "=== M003/S01 Verification ==="
echo ""

# --- 1. Security Headers ---
echo "1. Security Headers"
HEADERS=$(curl -sI "$BASE_URL/" 2>/dev/null || echo "CURL_FAILED")

if echo "$HEADERS" | grep -qi "strict-transport-security"; then
  pass "HSTS header present"
else
  fail "HSTS header missing"
fi

if echo "$HEADERS" | grep -qi "content-security-policy"; then
  pass "CSP header present"
else
  fail "CSP header missing"
fi

if echo "$HEADERS" | grep -qi "x-frame-options"; then
  pass "X-Frame-Options header present"
else
  fail "X-Frame-Options header missing"
fi

if echo "$HEADERS" | grep -qi "x-content-type-options"; then
  pass "X-Content-Type-Options header present"
else
  fail "X-Content-Type-Options header missing"
fi

if echo "$HEADERS" | grep -qi "referrer-policy"; then
  pass "Referrer-Policy header present"
else
  fail "Referrer-Policy header missing"
fi

if echo "$HEADERS" | grep -qi "permissions-policy"; then
  pass "Permissions-Policy header present"
else
  fail "Permissions-Policy header missing"
fi

echo ""

# --- 2. Rate Limit Headers ---
echo "2. Rate Limit Headers"
if echo "$HEADERS" | grep -qi "x-ratelimit-limit"; then
  pass "X-RateLimit-Limit header present"
else
  fail "X-RateLimit-Limit header missing"
fi

if echo "$HEADERS" | grep -qi "x-ratelimit-remaining"; then
  pass "X-RateLimit-Remaining header present"
else
  fail "X-RateLimit-Remaining header missing"
fi

echo ""

# --- 3. Rate Limiting Enforcement ---
echo "3. Rate Limiting (auth endpoint — 5/min limit)"
GOT_429=false
for i in $(seq 1 8); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login" 2>/dev/null || echo "000")
  if [ "$STATUS" = "429" ]; then
    GOT_429=true
    pass "Request $i returned 429 (rate limited)"
    break
  fi
done

if [ "$GOT_429" = "false" ]; then
  fail "No 429 response after 8 rapid requests to /login"
fi

echo ""

# --- 4. CSRF Cookie ---
echo "4. CSRF Cookie"
COOKIE_HEADER=$(curl -sI "$BASE_URL/" 2>/dev/null | grep -i "set-cookie.*__touracore_csrf" || echo "")
if [ -n "$COOKIE_HEADER" ]; then
  pass "CSRF cookie set on response"
else
  fail "CSRF cookie not found"
fi

echo ""

# --- 5. Build Verification ---
echo "5. Build Verification"
echo "  (run separately: pnpm typecheck && pnpm build)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
