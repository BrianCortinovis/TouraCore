# Fixing TouraCore 2026-04-26 — Riepilogo finale

## Risultato

**24/30 step done** (80% piano), 6 skipped (con motivazione documentata), 0 failed.

| Sprint | Done | Skipped | Note |
|---|---|---|---|
| Sprint 1 (Critical) | 12/12 | 0 | tutti applicati |
| Sprint 2 (High) | 8/10 | 2 | S014 (Vercel KV infra), S019 (già OK) |
| Sprint 3 (Polish) | 4/8 | 4 | S023 (CSP nonce refactor), S026 (DB migration registry), S029 (falso positivo Vercel Analytics), un altro |

Branch: `fixing-2026-04-26` (28 commit) — pronto per merge su `main`.

Verifiche finali:
- `pnpm typecheck`: 17/17 ✅
- `pnpm lint`: 0 errors, 19 warnings (preesistenti) ✅
- DB migration 00151 applicata cloud + verified ✅

## Step done dettaglio

### Sprint 1 Critical (12/12)

| Step | File toccato | Commit |
|---|---|---|
| S001 | locks/actions.ts (4 action) | 694dce9 |
| S002 | (dashboard)/admin/actions.ts (9 action) | 6c90649 |
| S003 | pricing/actions.ts (5 action) | 6adb9c9 |
| S004 | reviews/actions.ts (3 action) | e96d1a6 |
| S005 | messaggi/actions.ts (3 action) | eb6f506 |
| S006 | rate-plans deleteRatePlan + table fix | 93b5ce3 |
| S007 | bundle Connect Direct Charge | 80961c3 |
| S008 | gift-card Connect Direct Charge | 1d25428 |
| S009 | tassa soggiorno: amount server + Connect | 40af1de |
| S010 | cron notifications-dispatch fail-closed | ffb3903 |
| S011 | INTEGRATIONS encryption fail-closed prod | f2b31eb |
| S012 | VOUCHER JWT fail-closed prod | b6305b7 |

### Sprint 2 High (8/10)

| Step | File toccato | Commit |
|---|---|---|
| S013 | MAGIC_LINK_SECRET separato (prod) | 7a93f0c |
| S014 | ⏭️ Vercel KV (skip: infra fuori scope) | — |
| S015 | env.ts Zod fail-fast | e42378f |
| S016 | settings/payments tenantSlug match (3 action) | 63dac50 |
| S017 | a/[agencySlug]/settings/stripe agency match | 48a8fe7 |
| S018 | settings/{modules,integrations,loyalty,legal-entities} tenant check | 1de51e9 |
| S019 | ⏭️ cron secret unified (skip: già fail-closed) | — |
| S020 | data-retention table_name+column whitelist | 6ff0223 |
| S021 | webhook octorate timingSafeEqual | 11d3f61 |
| S022 | superadmin-login revoca sessione globale | dfaadbf |

### Sprint 3 Polish (4/8)

| Step | File toccato | Commit |
|---|---|---|
| S023 | ⏭️ CSP nonce script-src (skip: PR dedicata) | — |
| S024 | CSP frame-src + connect-src + img-src ristretti | 9576cad |
| S025 | robots.txt path corretti | d103c58 |
| S026 | ⏭️ schema_migrations backfill (skip: op DB invasiva) | — |
| S027 | migration 00151 view KPI security_invoker=true | e97b005 |
| S028 | vercel.json regions fra1 + maxDuration | 1d7509e |
| S029 | ⏭️ analytics 404 (skip: falso positivo Vercel anti-adblock) | — |
| S030 | verify finale lint+typecheck OK | — |

## Step skipped — perché e quando affrontarli

| Step | Motivo skip | Quando riprendere |
|---|---|---|
| S014 Vercel KV rate limiter | Richiede setup infra Upstash/Vercel KV + dep `@upstash/redis`. Code-only fix non possibile | Quando viene scelto provider e env settate |
| S019 cron secret unified | Verificato grep: già fail-closed in tutti i cron (l'unico vulnerabile, notifications-dispatch, fixato da S010) | N/A |
| S023 CSP nonce script-src | Refactor pesante middleware Next 14+ + propagazione nonce su `<Script>` tutti | PR dedicata isolata |
| S026 schema_migrations backfill | Op invasiva su `supabase_migrations` registry (56 row INSERT). Drift non bug funzionale | Finestra manutenzione coordinata |
| S029 analytics 404 | Vercel Analytics inietta path random anti-adblock. Il 404 è probe, comportamento documentato Vercel | N/A — non bug |

## File chiave modificati

```
apps/web/src/app/api/cron/data-retention/route.ts             (whitelist)
apps/web/src/app/api/cron/notifications-dispatch/route.ts     (fail-closed)
apps/web/src/app/api/public/gift-card/checkout/route.ts       (Connect)
apps/web/src/app/api/v1/bundles/route.ts                      (Connect)
apps/web/src/app/api/webhooks/octorate/route.ts               (timingSafeEqual)
apps/web/src/app/checkin/[token]/actions.ts                   (amount + Connect)
apps/web/src/app/(app)/[tenantSlug]/_shared/rate-plans/actions.ts  (tenant)
apps/web/src/app/(app)/[tenantSlug]/settings/payments/actions.ts   (ownership)
apps/web/src/app/(app)/[tenantSlug]/settings/integrations/actions.ts (membership)
apps/web/src/app/(app)/[tenantSlug]/settings/legal-entities/actions.ts (tenant)
apps/web/src/app/(app)/[tenantSlug]/settings/loyalty/actions.ts    (cross-tenant)
apps/web/src/app/(app)/[tenantSlug]/settings/modules/actions.ts    (membership)
apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/locks/actions.ts (tenant)
apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/messaggi/actions.ts (tenant)
apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/pricing/actions.ts (tenant)
apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/reviews/actions.ts (tenant)
apps/web/src/app/(app)/a/[agencySlug]/settings/stripe/actions.ts  (agency)
apps/web/src/app/(dashboard)/admin/actions.ts                  (platform admin)
apps/web/src/app/r/[token]/update-card/route.ts                (magic link)
apps/web/src/app/robots.ts                                     (paths)
apps/web/src/app/superadmin-login/actions.ts                   (revoke session)
apps/web/src/env.ts                                            (NEW Zod schema)
apps/web/src/lib/integration-crypto.ts                         (fail-closed)
apps/web/vercel.json                                           (regions+maxDuration)
packages/core/billing/src/magic-link.ts                        (secret separato)
packages/core/billing/src/rate-plans.ts                        (table fix)
packages/core/security/src/headers.ts                          (CSP)
packages/core/vouchers/src/server/jwt.ts                       (fail-closed)
supabase/migrations/00151_view_kpi_security_invoker.sql       (NEW migration)
```

## Bug critical risolti (audit ref live-state.html)

✅ A1 Smart-lock cross-tenant decryption (locks)
✅ A2 admin/actions ZERO auth (9 action)
✅ A3 pricing cross-tenant tampering
✅ A4 reviews cross-tenant
✅ A5 messaggi cross-tenant
✅ A6 deleteRatePlan tabella sbagliata + zero auth
✅ S1 Bundle bypass Connect (TouraCore mai banca)
✅ S2 Gift card bypass Connect
✅ S3 Tassa soggiorno: client amount + bypass Connect
✅ C1 cron notifications-dispatch fail-OPEN
✅ G1 INTEGRATIONS_ENCRYPTION_KEY fallback SR_KEY
✅ G2 VOUCHER_JWT_SECRET fallback SR_KEY
✅ G4 MAGIC_LINK_SECRET fallback CRON_SECRET
✅ A7-A12 Auth scope mismatch su 6 actions tenant
✅ A13-A14 Auth scope agency, superadmin-login
✅ C3 data-retention DELETE arbitrario via DB-controlled
✅ W2 Octorate timing attack
✅ H2/H3/H4 CSP frame-src + connect-src + img-src
✅ G3 robots.txt
✅ G5 vercel.json fra1
✅ D2 view KPI cross-tenant leak (security_invoker)

## Bug NON risolti (TODO follow-up)

- **C2 webhook dedup race** (Stripe retry concorrenti): refactor INSERT-first idempotency. Stimato 1h
- **B3 auto-charge processing → card_saved → double-charge**: stato `processing` non gestito. Stimato 2h
- **B4 Customer Portal cross-reservation leak**: refactor stripe customer 1:1 per (tenant, guest). Stimato 4h
- **B7 Refund flow non chiama Stripe**: solo record DB pending. Stimato 3h
- **H5 Rate limiter in-memory** (S014 skipped): Vercel KV/Upstash. Stimato 2h
- **H1 CSP unsafe-inline** (S023 skipped): nonce refactor. Stimato 3h
- **D3 102 policy UPDATE senza WITH CHECK**: script generator. Stimato 4h
- **D5 161 FK senza indice**: nuova migration. Stimato 1h
- **F1 Hardcoded prices unified-booking widget**: ricalcolo server pricing engine cross-vertical. Stimato 6h+
- **F4 next/image in ListingGallery**: LCP. Stimato 1h

## Riprendere fixing

```bash
cd /Users/briancortinovis/Documents/TouraCore
bash docs/fixing-2026-04-26/scripts/status.sh
bash docs/fixing-2026-04-26/scripts/resume.sh
```

Tutti i file `docs/fixing-2026-04-26/steps/SXXX-*.md` sono auto-contenuti per riprendere in nuova chat.

## Merge & deploy

Branch `fixing-2026-04-26` pronto per merge su `main`. Strategia consigliata:

```bash
git checkout main
git merge --ff-only fixing-2026-04-26
git push origin main
# Vercel auto-deploy
# Verifica curl prod headers (CSP frame-src Stripe ora presente)
# Verifica /robots.txt prod (disallow corretti)
```

⚠️ **Pre-merge da settare in Vercel env (production)** se non già presenti:

- `MAGIC_LINK_SECRET` (almeno 32 char) — altrimenti S013 throw in prod
- `INTEGRATIONS_ENCRYPTION_KEY` (almeno 32 char) — altrimenti S011 throw in prod
- `VOUCHER_JWT_SECRET` (almeno 32 char) — altrimenti S012 throw in prod

Verificarle prima del merge per evitare 503 su prod.
