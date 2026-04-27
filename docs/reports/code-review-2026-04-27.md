# Code Review TouraCore — 2026-04-27

**Scope**: full codebase (1017 file TS/TSX, 26 package core, 4 verticali, ~30 route group). 4 agent paralleli (security/performance/correctness/frontend) + verifica LIVE browser su `touracore.vercel.app`.

**Branch**: `main` @ `ac3e36b` (pulito, 1 untracked HTML report).

---

## Verdict

**Request Changes** — postura globale buona, ma 6 issue P0 da chiudere prima di onboarding produzione di nuovi tenant non-demo.

| Dominio | P0 | P1 | P2 |
|---|---|---|---|
| Security | 3 | 5 | 4 |
| Performance | 4 | 9 | 8 |
| Correctness | 6 | 8 | 12 |
| Frontend/UX | 3 | 3 | 9 |
| Browser LIVE | 0 | 1 | 1 |

---

## P0 — Blocker (chiudere subito)

| # | Dominio | File | Issue | Fix |
|---|---|---|---|---|
| 1 | Sec | `packages/core/security/src/rate-limiter.ts:8` | Rate limiter `Map` in-memory → su Vercel multi-instance brute-force auth è bypass-by-design | Migrare a Upstash Redis / Vercel KV (`@upstash/ratelimit` sliding window) |
| 2 | Sec | tutti `/api/*` POST cookie-auth | CSRF cookie generato ma `assertCsrf()` mai chiamato. `/api/user/delete`, `/api/user/export`, `/api/cookie-consent` CSRF-vulnerabili | Aggiungere `await assertCsrf()` in tutti i POST/DELETE/PUT cookie-auth |
| 3 | Sec | `apps/web/src/app/(auth)/reset-password/page.tsx:41-50` | Gating debole: utente loggato (sessione qualsiasi) può cambiare password senza link recovery | Verificare `session.user.amr.includes('recovery')` o JWT `aud=recovery` |
| 4 | Sec | `apps/web/src/app/api/public/booking/{create,checkout}/route.ts` | Endpoint pubblici keyless: chiunque con UUID può creare booking / triggerare Stripe checkout | `validatePublicKey(extractKey(req), origin)` + cookie origin-bound |
| 5 | Corr | `apps/web/src/app/book/[slug]/actions.ts:361,620` + `verticals/bike-rental/.../create-reservation.ts:43` + `dine/.../waitlist/actions.ts:107` | **Overbooking**: hospitality + bike + restaurant fanno check-then-insert non atomico. Solo experience ha RPC atomica (`experience_timeslot_try_book`) | RPC SQL con `SELECT FOR UPDATE` o `EXCLUDE USING gist (tstzrange)` per ciascun verticale |
| 6 | Corr | `apps/web/src/app/(auth)/onboarding/actions.ts:337` + `webhooks/stripe/route.ts:187` + `book/multi/.../unified-booking-client.tsx:300,401` + `api/v1/bundles/route.ts:178` | 4 TODO in payment path: Stripe SetupIntent onboarding non collegato, webhook non idempotente, prezzi hardcoded multi-booking, bundle price tampering | Wire Stripe + idempotency key event.id + recompute price server-side |

---

## P1 — High (prima del prossimo deploy importante)

### Security
- **#6** `api/public/booking/_shared.ts:42` hash compare non timing-safe → `crypto.timingSafeEqual`
- **#7** `lib/webhook-dedup.ts:13` race check-then-insert → UNIQUE `(provider, external_event_id)` + `ON CONFLICT DO NOTHING`
- **#8** Cron secret compare non timing-safe (tutti `apps/web/src/app/api/cron/**`)
- **#9** Webhook Octorate: solo API key statica, no HMAC body — replay possibile
- **#5 / #11** AI endpoint (`api/v1/ai/suggest-reply`, `analyze-review`) senza tenant scope né per-tenant rate limit → cost amplification

### Performance
- **#1+#2** `cron/loyalty-recalc/route.ts` N+1 nidificato O(programs × reservations × 4) → batch via JOIN + `ON CONFLICT (guest_loyalty_id, source_type, source_id)`
- **#3** `cron/billing-snapshots` 100 tenant × 7 mod = 2100 round-trip → GROUP BY entities counts
- **#4** `cron/lock-pins` refetch metadata duplicato + N+1
- **#5** `cron/auto-charge-bookings` 4 query sequenziali per riga → pre-join entities/restaurants
- **#17** `platform/messaging/logs/page.tsx:9,15` select unbounded → `.limit(100)` (rischio crash)
- **#19** `platform/clients/[tenantId]/page.tsx:55` aggregazione totale in JS invece di `select sum()` → spostare a Postgres
- **Index mancanti**: `guest_loyalty(program_id, points_balance)`, `loyalty_transactions UNIQUE (guest_loyalty_id, source_type, source_id)`, `notifications_queue(status, scheduled_at, priority DESC)`, `entities(tenant_id, kind, is_active)`
- **#15** `sitemap-listings.xml/route.ts` hard-cap 5000 senza sharding → sitemap index sharded
- **Cron sequenziali**: solo `reviews-ingest` usa `Promise.all`. Altri 7 cron multi-tenant sequenziali → `Promise.allSettled` con concurrency cap

### Correctness
- **Race**: `dine/.../waitlist/actions.ts:107` walk-in concorrenti possono ricevere stesso table_id → `pg_advisory_xact_lock(restaurant_id)` o RPC
- **Money/Precision**: bike usa euro decimale + `Math.round(*100)/100`, hospitality usa `total_amount: number`, experience+fiscal usano cents int. Convergere su cents int
- **VAT hardcoded**: `verticals/bike-rental/.../create-reservation.ts:177` `* 0.22` → usare `@touracore/fiscal/vat`
- **Date/DST**: `Math.ceil((checkOut - checkIn)/86400000)` su `book/[slug]/actions.ts:282,378` → `differenceInCalendarDays` o normalizzare UTC midnight
- **Errore silenzioso**: bike `create-reservation:136-152,205-208` ignora insert errors → reservation orfana senza items. Idem `book/[slug]/actions.ts:651` upsell, 5 file con `try{logAudit}catch{}`
- **`as unknown as` × 93**: pattern dominante per Supabase joins → `supabase gen types typescript` + `Database['public']['Tables'][...]['Row']`
- **Sandbox in prod path**: `dine/.../fiscal/actions.ts:105` produce successo finto se non in sandbox env → throw esplicito
- **Test coverage**: 0 test su 25/26 package core (solo `compliance` ha test). P0 = `billing`, `fiscal`, `pricing`, `vouchers`, `partners`, `security`

### Frontend
- **Sidebar non responsive mobile**: `components/SharedSidebar.tsx:48` w-72 sempre, no hamburger → CMS rotto su smartphone
- **7 pagine `/book/*` senza `generateMetadata`** → title duplicati su SERP, no OG share preview
- **Solo 1 `error.tsx`** in tutto app router (`(dashboard)/`) → throw fuori da quel group → fallback generico

---

## P2 — Medium (cleanup pianificato)

### Security
- CSP `script-src 'unsafe-inline'` (limit Next.js RSC) → migrare a nonce strategy
- Trust `x-forwarded-for` senza whitelist proxy → IP spoofable per rate-limit bypass
- API key sha256 lookup: garantire entropy ≥128 bit alla generation (`randomBytes(24)`)
- `cookie-consent` POST anonimo senza rate-limit dedicato

### Performance
- `superadmin/page.tsx:80` 25 query parallele senza cache → `unstable_cache` TTL 60s
- `platform/agencies/page.tsx:23`, `platform/seo/listings/page.tsx:14`, `platform/reviews/page.tsx:24` select senza limit
- `competitive-actions.ts` 16 query `select('*')` senza limit
- `r/[agencySlug]/page.tsx` no `revalidate` → ISR mancante landing pubblica
- `u/[username]/page.tsx` no cache wrapper su `getProfileListings`
- Recharts: verificare bundle output `du -sh .next/static/chunks` per chunk effettivo
- Hero photos `images.unsplash.com?w=2000` su `/discover` → cache locale R2 + priority solo hero corrente
- `notifications/pipeline.ts:406` dispatch sequenziale → `Promise.allSettled` con `p-limit(5)`

### Correctness / Maintainability
- `as any` × 7 + `: any` × 145 (concentrato in `verticals/hospitality/.../templates/*` 46 occ) → `interface BookingStepProps`
- `formatCurrency/formatMoney/formatEUR/fmtCurrency` × 6+ file → centralizzare `packages/core/ui/src/format.ts`
- `formatDate` × 3 file
- `computeQuote` duplicato bike vs experiences con signature diverse → `computeBikeQuote`/`computeExperienceQuote`
- File >900 righe (`stays/.../settings-form.tsx:1022`, `structure-operations-section.tsx:1485`) → spezzare
- knip: 3 file dead, 2 dep unused (`@touracore/config`, `@touracore/security` in apps/web — sospetto), 2 devDep (`@aws-sdk/client-s3`, `dotenv`), 61 export unused, 57 type unused
- i18n: ~10 string italiano hardcoded in `packages/core/{integrations,ui,hospitality-config,billing}` (riusabili) → spostare in verticals o locale dict
- Adapter Bokun stub (`verticals/bike-rental/src/channels/adapters/bokun.ts:51`) appare come provider reale nel registry tier → marcare come stub

### Frontend
- ~30 input/select/textarea con `<label>` non associato (htmlFor mancante) in `platform/{billing,seo,messaging}/*`
- Bottoni icon-only senza `aria-label` (modal close, action icons)
- `<select>` filtro reviews senza label visibile
- 5+ tabelle senza `overflow-x-auto` → break mobile
- Dark mode 0 occorrenze → solo light, dashboard CMS abbagliante in serale
- `loading="lazy"` su immagine above-fold `/u/[username]:158`
- 2 `<img>` raw (branding form + agency referral) → `next/image`
- `confirm()` nativo in `redirects-manager.tsx:43` → modal styled
- Solo 3 `loading.tsx` in tutta l'app
- Mancano `noindex` espliciti su `/checkin/[token]`, `/embed/*`, `/widget/*`
- `/discover?kind=...` senza `generateMetadata` dinamico per filtro

### Browser LIVE
- 404 page returna 307 (redirect anti-pattern SEO)
- Vercel Web Analytics script 404 (config Vercel mancante, noise console)

---

## Cosa è già OK (positives)

### Security
- HSTS preload + X-Frame DENY + X-Content-Type nosniff + CSP completa + CSRF cookie strict (verified LIVE headers)
- Encryption AES-256-GCM fail-closed in prod (`packages/db/src/crypto.ts`, `apps/web/src/lib/integration-crypto.ts`) con key separation SR
- Webhook Stripe HMAC + dedup + anti-tampering tenant_id vs customer
- Partner API: bcrypt + HMAC + IP allowlist
- 0 secrets hardcoded committati. `.env*` in `.gitignore`
- 0 SQL injection: tutti `rpc()` parametrizzati
- 0 Math.random security-sensitive (commit 18b189c confermato applicato)
- Open redirect mitigato via `sanitizeNextPath` consistente
- 176 file usano SR client ma quasi tutti dietro guard (`assertUserOwnsX`, `getVisibilityContext`, cron secret)
- Tenant isolation API v1 OK su tutte route `/api/v1/*`

### Performance
- Cache tag-based `lib/listings-cache.ts` (commit 0355d16): `react.cache` intra-render + `unstable_cache` persist
- `dynamic()` per recharts + konva — bundle iniziale alleggerito
- ISR `revalidate` impostato su pagine pubbliche (3600s discover, 60s book, 3600-86400s sitemap)
- Indici `reservations` ricchi (00044)
- next/image utilizzato in `/discover` + 10 file gallery
- CSPRNG per lock-pins (`randomInt`)

### Correctness
- 0 `@ts-expect-error/@ts-ignore` nel sorgente
- Solo 11 TODO/FIXME reali (di cui 4 critici già listati P0)
- Adapter pattern + RPC atomica `experience_timeslot_try_book` come blueprint
- `getCurrentAuthUser`/`getCurrentUser` aliasati (vecchio API mantenuto)

### Frontend / Browser LIVE
- `<SkipToContent />` in root layout (`app/layout.tsx:8`)
- `s/[tenantSlug]/[entitySlug]/page.tsx:40-72` metadata best-in-class (twitter+og+seo_title override)
- JSON-LD breadcrumb su discover, BicycleStore su listing bike
- Homepage / discover / listing / book/* tutti LIVE 200 OK
- 4 entity reali pubblicate (tour-lago-garda, alpina-bikes, trattoria-del-borgo, casa-del-sole)

---

## Top 10 fix con miglior ROI

1. **Rate limiter Redis** (P0 sec) — sblocca brute-force protection reale
2. **CSRF su /api/* mutating** (P0 sec) — chiusura attack class intera
3. **Reset-password gating** (P0 sec) — bypass account-recovery
4. **Public booking key validation** (P0 sec) — stop spam/enumeration
5. **RPC atomica overbooking** hospitality + bike + restaurant (P0 corr) — replicare pattern experience
6. **Wire Stripe SetupIntent onboarding + webhook idempotency** (P0 corr) — sblocca onboarding produzione
7. **Cron loyalty-recalc + billing-snapshots refactor** (P1 perf) — da 2100 query a ~10
8. **`.limit(100)` su `platform/messaging/logs`** (P1 perf) — protezione crash 1-line
9. **Sidebar mobile responsive** (P1 fe) — CMS usabile su smartphone
10. **Test su `@touracore/{billing,fiscal,pricing,vouchers,partners,security}`** (P1 corr) — money/security senza coverage

---

## File chiave da rivedere

```
packages/core/security/src/rate-limiter.ts          # P0 sec #1
packages/core/security/src/csrf.ts                  # P0 sec #2
apps/web/src/app/(auth)/reset-password/page.tsx     # P0 sec #3
apps/web/src/app/api/public/booking/{create,checkout}/route.ts  # P0 sec #4
apps/web/src/app/book/[slug]/actions.ts             # P0 corr #5 (hospitality)
verticals/bike-rental/src/queries/create-reservation.ts  # P0 corr #5 (bike)
apps/web/src/app/(app)/[tenantSlug]/dine/[entitySlug]/waitlist/actions.ts  # P0 corr #5 (restaurant)
apps/web/src/app/(auth)/onboarding/actions.ts:337   # P0 corr #6 (Stripe TODO)
apps/web/src/app/api/webhooks/stripe/route.ts:187   # P0 corr #6 (idempotency)
apps/web/src/app/api/v1/bundles/route.ts:178        # P0 corr #6 (price tampering)
apps/web/src/app/api/cron/loyalty-recalc/route.ts   # P1 perf
apps/web/src/app/api/cron/billing-snapshots/route.ts # P1 perf
apps/web/src/components/SharedSidebar.tsx           # P1 fe
apps/web/src/app/book/[slug]/page.tsx (+6 fratelli) # P1 fe metadata
```
