# TouraCore Memory

## Scopo

TouraCore e un monorepo multi-verticale per il turismo. La repo contiene una web app Next.js, moduli core condivisi, verticali dedicati e supporto Supabase.

Stato: **M001-M106 completate** (mix GSD/ChatGPT/Claude, disordine tracking pre-M107). Da M107 in poi tracking ordinato — vedi `docs/PROGETTO-STORIA.md` per storia completa e convenzioni.

**Hardening attivo (post code-review 2026-04-27, commit `b160d0c` LIVE)**:
- Rate limiter: Upstash REST (`packages/core/security/src/rate-limiter.ts`). Attiva auto se env `UPSTASH_REDIS_REST_URL`+`_TOKEN`. Senza → fallback in-memory.
- CSRF: `assertCsrf()` / `verifyCsrf()` da `@touracore/security/csrf-server` su `/api/user/{delete,export}` mutating. Client: `csrfHeaders()` da `@touracore/security/csrf-client`.
- Reset-password: cookie httpOnly `__touracore_pwd_recovery` (TTL 15min) settato da `auth/callback?type=recovery`. Page server component verifica cookie + render `ResetPasswordClient`.
- Public booking: `gatePublicBooking()` in `apps/web/src/app/api/public/booking/_shared.ts`. Accept = API key valida OR origin in `PUBLIC_BOOKING_ALLOWED_ORIGINS` OR same-origin `NEXT_PUBLIC_APP_URL`. Hash compare `crypto.timingSafeEqual`.
- Migration 00152 LIVE su cloud: 3 RPC anti-overbooking (`hospitality_room_check_availability`, `bike_rental_check_availability`, `restaurant_table_acquire_lock`) — pattern `pg_advisory_xact_lock` + recheck. Wirate in `book/[slug]/actions.ts`, `verticals/bike-rental/.../create-reservation.ts`, `dine/.../waitlist/actions.ts`.
- Webhook stripe: atomic dedup via UNIQUE `(provider, external_event_id)` + `tryRecordWebhookEvent()` in `lib/webhook-dedup.ts`.
- Bundle anti price-tampering: cap €5k/item + €50k/bundle in `api/v1/bundles/route.ts`.
- Cron secret timing-safe: `verifyCronSecret()` in `apps/web/src/lib/cron-auth.ts` (22 cron migrati).
- Bike VAT: `@touracore/fiscal/defaultVatRate('bike_rental')`, mai hardcode 0.22.
- Bike create-reservation: rollback parent reservation se items/addons insert fallisce.
- Sidebar: `SharedSidebar.tsx` responsive (hamburger mobile + drawer, hidden md:block desktop).
- Error boundaries: `error.tsx` su `(app)/`, `book/`, `discover/`, `(auth)/`. Loading: `(app)/loading.tsx`, `book/loading.tsx`.
- Metadata + noindex: layout su `book/`, `embed/`, `widget/`, `checkin/`.

**P2 noti ancora aperti** (tracciati in `docs/reports/code-review-2026-04-27.html`):
- 93 `as unknown as` su Supabase joins (fix one-shot via `supabase gen types typescript`)
- 0 test su 25/26 package core (solo `@touracore/compliance`)
- CSP `script-src 'unsafe-inline'` (migrare a nonce strategy)
- ~~Dark mode~~ → scelta prodotto: solo light mode (non è debito)
- Cron `loyalty-recalc` + `billing-snapshots` N+1 deferred

**Setup esterni richiesti (manuale Brian)**:
- Account Upstash → env Vercel `UPSTASH_REDIS_REST_URL` + `_TOKEN` su 3 env (sennò rate limit fallback in-memory).
- Vercel Web Analytics: abilitare dal dashboard (rimuove 404 noise script.js).

## Mappa Rapida

- `apps/web`: UI, route handlers, server actions, Playwright e flussi utente
- `packages/core/*`: logica condivisa per auth, booking, billing, compliance, media, notifications, security, UI
- `packages/db`: supporto database
- `verticals/*`: logica e asset specifici di verticale
- `supabase/migrations`: evoluzione schema
- `docs/`: documentazione viva

## Come Lavorare

- Parti sempre dal package, verticale o route group impattato.
- Per modifiche cross-package o architetturali, fai prima un piano breve.
- Preferisci modifiche piccole, locali e reversibili.
- Riusa pattern e naming gia presenti prima di introdurre nuove astrazioni.
- Se cambi struttura repo, workflow o convenzioni, aggiorna la documentazione in `docs/`.

### Quando usare GSD vs Claude normale

- **Claude normale (commit diretto su main)**: bugfix, piccole feature, rename, refactor locale, docs, fix UI.
- **GSD milestone** (`gsd_plan_milestone` + slice + `gsd_complete_milestone`): feature grossa multi-pacchetto, nuovo modulo, nuovo verticale, migrazione importante.
- Regola pratica: se non riesci a descriverlo in un commit title, è una milestone GSD.
- Numerazione milestone: prossima libera dopo M106.

### Convenzione commit (Conventional Commits)

Formato: `tipo(scope): descrizione breve in italiano`.

Tipi: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.
Scope comuni: `stays`, `dine`, `rides`, `activities`, `agency`, `platform`, `auth`, `billing`, `compliance`, `db`, `ui`, `middleware`, `ci`.

Per slice GSD: `feat(scope): M107 S01 descrizione`.

## Guardrail Architetturali

- Mantieni espliciti tenant scope ed entity scope.
- Valida input esterni e server actions con Zod o pattern gia presenti.
- La business logic riusabile deve stare in package o moduli condivisi, non duplicata in pagine o componenti.
- Le modifiche database passano da `supabase/migrations`.
- Non introdurre nuovi framework di test o state management senza forte motivo.

## Verifica Minima

- Base: `pnpm lint` e `pnpm typecheck`
- Logica pura o compliance: `pnpm test:unit` (solo `@touracore/compliance`)
- UI e flussi web: `pnpm test:e2e` o `pnpm test:e2e:public` — dettagli in `docs/testing.md`
- Full check: `pnpm verify` = lint + typecheck + test:unit
- Se un check non viene eseguito, spiega sempre cosa manca e perche

## Regole Scoped

Claude applica automaticamente in base al path modificato:

- `.claude/rules/backend.md` — packages core, db, verticals, route handlers
- `.claude/rules/frontend.md` — apps/web .ts/.tsx
- `.claude/rules/migrations.md` — supabase/migrations, packages/db
- `.claude/rules/tests.md` — e2e, .test.ts, .spec.ts

## Output Atteso

Quando chiudi un task:

1. riassumi scope e aree toccate
2. indica i comandi eseguiti
3. segnala test passati o saltati
4. evidenzia rischi residui o follow-up

## Per Sessioni Con Agenti

- Claude Code: usa `CLAUDE.md` per memoria stabile, `.claude/rules/` per regole mirate e `.claude/skills/` per procedure ripetibili.
- Antigravity: usa task piccoli, review degli artifact e aggiorna `docs/` quando emerge conoscenza stabile che non deve restare solo nella knowledge base del tool.

