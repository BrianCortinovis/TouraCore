# Deploy State

Snapshot configurazione produzione + setup esterni pendenti.

Ultimo aggiornamento: **2026-04-27** post commit `b160d0c`.

## Cloud attivi

| Service | Status | Note |
|---|---|---|
| Vercel | ✅ LIVE | `touracore.vercel.app` · auto-deploy da `main` push GitHub |
| Supabase | ✅ LIVE | Project `dysnrgnqzliodqrsohoz` · 152 migration applicate |
| Cloudflare R2 | ✅ LIVE | Bucket `touracore` EU · 5 env settate (`R2_*` con suffix `.eu`) |
| Stripe Connect | ✅ LIVE | Direct Charge attivo per 4 verticali |
| Resend (email) | ✅ LIVE | Magic link Customer Portal + transactional |

## Setup esterni pendenti

### 1. Upstash Redis (rate limiter multi-instance)

**Status**: ⚠️ Codice pronto, env mancanti → fallback in-memory attivo (= comportamento pre-fix su Vercel multi-instance).

**Impatto se non attivato**: Brute-force protection su `/login`, `/api/auth/login`, `/forgot-password` resta inefficace su multi-instance Vercel (ogni istanza ha la sua Map locale, attacker round-robin bypassa).

**Setup**:
1. Creare account Upstash → nuovo Redis database (region EU)
2. Copiare `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. Settare su Vercel su 3 env: Production, Preview, Development
4. Deploy auto-applica al prossimo push (o manualmente Vercel Dashboard → Redeploy)

**Verifica post-setup**: dopo deploy, fare 50 login fail rapidi → 429 Too Many Requests dovrebbe scattare al ~10°.

**Verifica codice**: `packages/core/security/src/rate-limiter.ts` riga `getUpstash()`. Se return null → fallback memory.

### 2. Vercel Web Analytics

**Status**: ⚠️ Feature non abilitata → script `/ac54f900c99dbdee/script.js` 404 in console (noise innocuo).

**Setup**: Vercel Dashboard → progetto TouraCore → Analytics → Enable. Auto-attiva dopo redeploy.

## Env vars riferimento

Lista env critiche già settate (verificare presenza):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # mai esposta frontend
SUPABASE_ACCESS_TOKEN=...            # Management API (per skill supabase-cloud-ops)
NEXT_PUBLIC_APP_URL=https://touracore.vercel.app
CRON_SECRET=...                      # cron auth Vercel
ENCRYPTION_KEY=...                   # AES-256-GCM separate da SR key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
RESEND_API_KEY=re_...
R2_ACCOUNT_ID=...                    # con suffix .eu
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=touracore
R2_PUBLIC_URL=...
VOUCHER_JWT_SECRET=...               # opzionale, fallback a SR key
PUBLIC_BOOKING_ALLOWED_ORIGINS=...   # CSV origin whitelist (opzionale, default same-origin)

# DA AGGIUNGERE:
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

## Cron Vercel attivi

22 cron registrati in `vercel.json`. Tutti usano `verifyCronSecret()` timing-safe da `apps/web/src/lib/cron-auth.ts`.

Schedule: vedi `vercel.json` (region `fra1`, maxDuration 300s).

## Webhook attivi

| Provider | Path | Auth |
|---|---|---|
| Stripe | `/api/webhooks/stripe` | HMAC firma + atomic dedup UNIQUE `webhook_events` |
| Octorate (PMS) | `/api/webhooks/octorate` | API key statica (TODO: HMAC body — P1 deferred) |
| Mailgun | `/api/webhooks/mailgun/*` | HMAC firma |
| TheFork (restaurant) | `/api/webhooks/restaurant/thefork` | API key + dedup legacy |
| Google Reserve | `/api/webhooks/restaurant/google_reserve` | API key + dedup legacy |

## Smoke test prod (verificato 2026-04-27 post b160d0c)

```bash
# Tutti 200
curl -sI https://touracore.vercel.app/ | head -1
curl -sI https://touracore.vercel.app/discover | head -1
curl -sI https://touracore.vercel.app/s/villa-irabo/alpina-bikes | head -1

# Headers sicurezza
curl -sI https://touracore.vercel.app/ | grep -iE "strict-transport|x-frame|x-content-type"
# Atteso: HSTS preload + X-Frame DENY + nosniff

# CSRF cookie
curl -sI https://touracore.vercel.app/login | grep -i set-cookie
# Atteso: __touracore_csrf=...; Secure; SameSite=strict

# Public booking gate
curl -s -X POST https://touracore.vercel.app/api/public/booking/create -H "Content-Type: application/json" -d '{}'
# Atteso: {"error":"API key or trusted Origin required"}

# Webhook stripe sig invalida
curl -s -X POST https://touracore.vercel.app/api/webhooks/stripe -H "stripe-signature: invalid" -d '{}' -o /dev/null -w "%{http_code}\n"
# Atteso: 400
```
