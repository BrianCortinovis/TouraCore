# S010 — Cron `notifications-dispatch` fail-closed

**Sprint:** 1 (smoke test)
**Severity originale:** 🔴 Critical
**Effort stimato:** 5 minuti
**Categoria:** cron
**Audit ref:** `docs/audit-2026-04-26/live-state.html` C1

## Bug

`apps/web/src/app/api/cron/notifications-dispatch/route.ts:11`

```ts
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

Se `process.env.CRON_SECRET` è undefined → `cronSecret &&` è falsy → blocco saltato → endpoint pubblico.

Impatto: chiunque può triggerare invio massivo notifiche email/SMS via Resend/Twilio. Costi + leak PII (recipient_email, recipient_phone, body).

## PRE-CHECK

```bash
grep -n "if (cronSecret &&" apps/web/src/app/api/cron/notifications-dispatch/route.ts
```

Se ritorna riga con quel pattern → bug presente, procedere APPLY.
Se ritorna `if (!cronSecret) return` come prima riga → già fixato → skip.

## APPLY

Sostituire il blocco di check secret con pattern fail-closed (come gli altri cron tipo `auto-charge-bookings`).

File: `apps/web/src/app/api/cron/notifications-dispatch/route.ts`

Cercare:
```ts
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

Sostituire con:
```ts
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET
if (!cronSecret) {
  return new Response('CRON_SECRET not configured', { status: 503 })
}
if (authHeader !== `Bearer ${cronSecret}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

## POST-CHECK

1. Verifica grep:
```bash
grep -n "if (!cronSecret)" apps/web/src/app/api/cron/notifications-dispatch/route.ts
```
Deve ritornare la nuova riga.

2. Lint+typecheck:
```bash
bash docs/fixing-2026-04-26/scripts/verify.sh
```
Deve uscire con `VERIFY OK`.

3. (Opzionale prod) Curl prod no auth:
```bash
curl -sI https://touracore.vercel.app/api/cron/notifications-dispatch
```
Dovrebbe rispondere 401 (CRON_SECRET è settato in Vercel quindi return 401 con header mancante, NON 503).

## COMMIT

```
fix(cron): notifications-dispatch fail-closed se CRON_SECRET unset

Pattern uniforme con auto-charge-bookings: 503 se env mancante, 401 se header errato. Era fail-OPEN se env unset (chiunque triggerava mass send).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## STATE UPDATE

```bash
bash docs/fixing-2026-04-26/scripts/state-update.sh S010 done <commit-hash> "fail-closed pattern applied"
```

## Rollback

```bash
git revert <commit-hash>
bash docs/fixing-2026-04-26/scripts/state-update.sh S010 pending
```
