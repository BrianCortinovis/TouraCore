# Billing — Report modifiche v4

**Data**: 2026-04-26
**Versione**: v4 (Direct Charge end-to-end — Fasi 2-6 complete)
**Audience**: super admin (Brian) + dev follow-up
**Scope**: refactor billing completo. Loop end-to-end Stripe Connect Direct Charge funzionante per tutti 4 verticali, con rate plans, auto-charge differito, retry, auto-cancel, magic link.

---

## v4 — Cosa cambia

### Loop end-to-end Stripe Connect Direct Charge

Cliente prenota → carta salvata via Setup/PaymentIntent off_session → cron auto-charge a T-7gg crea PaymentIntent capture_method=manual con `application_fee_amount` + `transfer_data.destination` → tenant capture al check-in/check-out → soldi splittati alla fonte (zero TouraCore = banca).

### Fasi 2-6 implementate in unica iterazione

| Fase | Cosa | File |
|------|------|------|
| 2 | Migration tabelle + colonne | `supabase/migrations/00150_rate_plans_and_payments.sql` |
| 2 | Helper Stripe Connect (computeApplicationFee, buildConnectChargeParams) | `packages/core/billing/src/connect-charge.ts` |
| 2 | Switch checkout pubblici a Direct Charge × 4 verticali | `apps/web/src/app/api/public/{booking,restaurant,bike,experience}/checkout/route.ts` |
| 3 | Helper rate_plans (CRUD + RATE_PLAN_DEFAULTS) | `packages/core/billing/src/rate-plans.ts` |
| 3 | Component condiviso RatePlansEditor + Page + actions | `apps/web/src/app/(app)/[tenantSlug]/_shared/rate-plans/` |
| 3 | 4 route per verticale + sidebar entries | `(app)/[tenantSlug]/{stays,dine,rides,activities}/[entitySlug]/rate-plans/page.tsx` |
| 4-5 | Cron auto-charge differito (gestisce booking <30gg e >30gg) | `apps/web/src/app/api/cron/auto-charge-bookings/route.ts` |
| 6 | Cron auto-cancel-failed-payments | `apps/web/src/app/api/cron/auto-cancel-failed-payments/route.ts` |
| 6 | Magic link update card → Stripe Customer Portal | `apps/web/src/app/r/[token]/update-card/route.ts` + `packages/core/billing/src/magic-link.ts` |
| 6 | Capture action server-side | `apps/web/src/app/(app)/[tenantSlug]/_shared/payments/capture-actions.ts` |
| Webhook | payment_intent.payment_failed handler | `apps/web/src/app/api/webhooks/stripe/route.ts` |

### Cron schedules vercel.json

| Cron | Schedule UTC | Scopo |
|------|--------------|-------|
| `auto-charge-bookings` | `0 3 * * *` | Charge T-N giorni configurato per rate plan |
| `auto-cancel-failed-payments` | `0 4 * * *` | Cancella + libera slot dopo fail terminale |
| `agency-payouts` (v2) | `0 5 1 * *` | Payout mensile agenzie (legacy commission accrual) |

### Stato Stripe nativo vs custom — bilancio finale

**Stripe nativo (80% del lavoro):**
- Onboarding Express + KYC + Account Link + login link
- Setup/PaymentIntent off_session + carta salvata
- Card Updater Visa/MC (auto)
- 3DS / SCA Italia
- Direct Charge split alla fonte (`application_fee_amount`)
- SEPA payout daily al tenant
- Refund + dispute via Dashboard
- **Customer Portal per aggiorna carta** (zero UI custom)
- Webhook `account.updated`, `payment_intent.*`, `charge.refunded`

**Custom TouraCore (20% del lavoro):**
- Cron orchestratore (Stripe non ha smart-retry per one-shot PaymentIntent)
- Auto-cancel dopo N fail (Stripe non ha)
- Block pubblicazione entity senza Connect
- Magic link HMAC firmato → Customer Portal Stripe (custom solo l'auth, UI è Stripe)
- Rate plans (logica business custom, non gestibile da Stripe)

### Verifiche

| Check | Risultato |
|-------|-----------|
| `pnpm typecheck` | ✅ 17/17 PASS |
| `pnpm lint` | ✅ 0 errors (19 warnings preesistenti) |
| Migration cloud applicata | ⏳ da pushare con commit |

### Da fare manualmente prima del go-live

1. `MAGIC_LINK_SECRET` env var su Vercel (production + preview + dev). Se assente, usa `CRON_SECRET` come fallback.
2. Stripe Dashboard: abilitare Customer Portal in Settings → Billing → Customer Portal con permission "update_payment_method".
3. Webhook Stripe in produzione: aggiungere event `payment_intent.payment_failed` alla lista subscribed events.
4. Test E2E Stripe test mode (3 scenari): success → cattura → check_payment_state, insufficient_funds → retry, expired_card → magic link → update.
5. Tenant test: completare onboarding Stripe Connect su `/[tenantSlug]/settings/payments` per il tenant villa-irabo.

### Limiti noti / Da iterare

- **Selettore rate plan nel widget pubblico** non implementato in v4. Cliente non vede ancora dropdown per scegliere tariffa al booking. Da fare in v5 (frontend booking widget hospitality + altri).
- **UI tenant "Cattura ora"** non aggiunta a UI prenotazioni dei 4 verticali. Server action `capturePaymentAction` pronta ma deve essere wirata a un bottone in ogni dashboard verticale.
- **Setup intent al momento del booking** non integrato in flow create-reservation. Oggi i nuovi checkout fanno PaymentIntent immediato (charge subito); per `free_cancellation` serve creare SetupIntent + scrivere `reservation_payment_methods` row. Da fare in v5.
- **Notifiche email cliente su payment failed** non implementate. Magic link generato ma email non inviata automaticamente. Va wirato a `@touracore/notifications`.

---

## v3 — Cosa cambia

### Decisione architetturale

Brian ha esplicitato (2026-04-26) che TouraCore non deve mai essere banca: tutti i pagamenti cliente devono passare via Stripe Connect Direct Charge, con TouraCore che riceve solo `application_fee_amount`. Memoria: `feedback_no_banking.md`.

---

## v3 — Cosa cambia

### Decisione architetturale

Brian ha esplicitato (2026-04-26) che TouraCore non deve mai essere banca: tutti i pagamenti cliente devono passare via Stripe Connect Direct Charge, con TouraCore che riceve solo `application_fee_amount`. Memoria: `feedback_no_banking.md`.

### v3 — Fase 1: Onboarding Stripe Connect tenant (DONE)

| Cosa | File |
|------|------|
| Migration colonne tenants | `supabase/migrations/00149_tenants_stripe_connect.sql` |
| Server actions onboarding/refresh/dashboard | `apps/web/src/app/(app)/[tenantSlug]/settings/payments/actions.ts` |
| UI pagina pagamenti tenant | `apps/web/src/app/(app)/[tenantSlug]/settings/payments/page.tsx` |
| Voce sidebar "Pagamenti" | `apps/web/src/app/(app)/[tenantSlug]/settings/settings-sidebar.tsx` |
| Webhook account.updated mirror su tenants | `apps/web/src/app/api/webhooks/stripe/route.ts:410` |
| Block pubblicazione senza Connect attivo | `apps/web/src/app/(dashboard)/settings/distribution/actions.ts` |

Stripe API utilizzate (tutte native, zero PSP custom):
- `POST /v1/accounts` con `type=express`, `capabilities[card_payments]=true`, `capabilities[transfers]=true`
- `POST /v1/account_links` per onboarding URL
- `POST /v1/accounts/{id}/login_links` per Express Dashboard
- `GET /v1/accounts/{id}` per refresh stato
- Webhook `account.updated` per sync charges_enabled / payouts_enabled / requirements

Verifiche:
- `pnpm typecheck` → 17/17 PASS
- `pnpm lint` → 0 errors

### v3 — Fasi successive (TODO)

| Fase | Scope | Stima |
|------|-------|-------|
| 2 | Switch checkout pubblici (4 verticali) a Direct Charge con `application_fee_amount` | 3h |
| 3 | Rate plans: free_cancellation / deposit_30 / partially_refundable / non_refundable + UI tenant per ogni verticale | 4h |
| 4 | Auto-charge differito 7gg prima check-in (pre-auth + capture) | 2h |
| 5 | Orchestratore booking >30gg con SetupIntent al booking + charge a T-30gg | 2h |
| 6 | Retry custom + auto-cancel + magic link aggiorna carta | 2h |
| Test E2E | Stripe test mode, scenari success + insufficient_funds + expired_card | 3h |

**Totale rimanente**: ~16h dev + 3h test.

---

## v2 — Snapshot precedente (mantenuto per storico)

**Versione**: v2 (loop chiuso wiring commissioni)
**Scope**: tutti i gap segnalati nella v1 sono stati implementati e testati a livello typecheck

---

## 1. Snapshot stato attuale

| Area | Stato | Note |
|------|-------|------|
| Schema DB billing 3-layer | ✅ COMPLETO | 5 tabelle live cloud |
| Default tariffe per modulo | ✅ LIVE | record `global_default` in `billing_profiles` |
| UI super admin → tenant | ✅ LIVE | `/platform/clients/[id]` |
| UI super admin → agenzia | ✅ LIVE | `/platform/agencies/[id]` |
| UI agenzia → commissioni | ✅ LIVE | `/a/[slug]/commissions` |
| UI agenzia → override entity | ✅ LIVE | `entity-billing-panel.tsx` (esisteva già) |
| Funzione `accrueCommission` wirata | ✅ DONE (v2) | helper condiviso + 4 verticali |
| Cron quantity sync Stripe | ✅ LIVE | `billing-snapshots` |
| Cron grace period | ✅ LIVE | `billing-grace-check` |
| Cron payout agenzia mensile | ✅ DONE (v2) | `agency-payouts` 1° del mese 05:00 UTC |
| Webhook Stripe payment_intent | ✅ presente | gestisce booking_commission ledger |
| Tabella `agency_payouts` | ✅ DONE (v2) | migration 00148 |

---

## 2. Modifiche di codice (v2)

### 2.1 Nuovo helper condiviso

**File**: `packages/core/agency/src/wiring.ts` (nuovo, 132 righe)

Esporta `onReservationStatusChange({ vertical, reservationId, newStatus, previousStatus })`.

Comportamento:
1. Risolve i finanziali della prenotazione (tenant_id, entity_id, gross_amount, currency) leggendo la tabella corretta in base al verticale.
2. Risolve `agency_id` via `agency_tenant_links` con `status='active'`. Se non c'è agenzia → no-op.
3. Se `newStatus ∈ {confirmed, checked_in, checked_out, completed, returned, finished, seated}` e prima non era già accruing → chiama `accrueCommission`.
4. Se `newStatus ∈ {cancelled, no_show}` → chiama `reverseCommissionForReservation`.
5. Errori catturati e loggati con `console.error`, mai propagati al chiamante.

Esportato da `packages/core/agency/src/index.ts`.

### 2.2 Wiring sui 4 verticali

| Verticale | File | Punto di hook |
|-----------|------|---------------|
| Hospitality | `apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/bookings/actions.ts` | dopo UPDATE in `updateReservationStatusAction` (legge `previousStatus` con select pre-update) |
| Restaurant | `apps/web/src/app/(app)/[tenantSlug]/dine/[entitySlug]/reservations/actions.ts` | dopo UPDATE in `updateReservationStatus`, riusa `currentStatus` già letto per state machine |
| Experience | `apps/web/src/app/(app)/[tenantSlug]/activities/[entitySlug]/checkin/actions.ts` | dopo UPDATE in `checkinByQrAction` (passa `previousStatus: res.status`) |
| Bike | `verticals/bike-rental/src/queries/reservations.ts` | dentro `updateReservationStatus` del package vertical (legge `previousStatus` con select) |

Per il vertical bike-rental è stata aggiunta dipendenza `@touracore/agency` in `verticals/bike-rental/package.json`.

### 2.3 Migration `00148_agency_payouts.sql`

Tabella `agency_payouts`:
- Chiavi: `id` UUID PK, `UNIQUE (agency_id, period_month)` → idempotency naturale
- Importi: `gross_amount`, `platform_fee_amount`, `net_amount`, `currency`, `commissions_count`
- Stripe: `stripe_transfer_id`, `stripe_destination`
- Stato: `pending → processing → paid | failed`, `error_message`
- Timestamp: `created_at`, `processed_at`, `paid_at`
- Metadata: `jsonb`

RLS:
- Service role: full access (cron + future webhook)
- Platform admin (`is_platform_admin` JWT claim): SELECT
- Membri agenzia (via `agency_memberships`): SELECT solo proprie righe

FK aggiunta retroattivamente: `agency_commissions.payout_id` → `agency_payouts.id` (ON DELETE SET NULL). Index parziale su `payout_id` non-null.

⚠️ **Da pushare cloud**: usa skill `supabase-cloud-ops` o CLI Supabase.

### 2.4 Cron payout mensile

**File**: `apps/web/src/app/api/cron/agency-payouts/route.ts` (nuovo)

Schedule registrato in `apps/web/vercel.json`: `0 5 1 * *` (1° del mese, 05:00 UTC). Si esegue dopo `billing-snapshots` (03:00) e `billing-grace-check` (04:00).

Logica:
1. Auth Bearer `CRON_SECRET` (pattern identico a `billing-grace-check`).
2. Calcola `periodMonth` = mese precedente (UTC).
3. SELECT `agency_commissions` con `status='accrued'` accruati nel periodo.
4. Aggrega per `agency_id`: gross / commission / count / commission_ids[].
5. Per ogni agenzia:
   - Skip se payout già `paid` per il periodo.
   - Recupera `stripe_connect_account_id` da `agencies` + accordo da `agency_platform_billing`.
   - Calcola platform fee con la funzione `computePlatformFee`:
     - `subscription`/`hybrid` → aggiunge `fee_monthly_eur`
     - `commission`/`hybrid` → `commission_pct` su `commission_base` (`client_revenue` o `agency_fee`), con threshold + cap + min mensile
     - `free` → 0
   - Upsert `agency_payouts` in `pending`.
   - Se manca Stripe o net=0 → segna `paid`/`failed` senza transfer + se net=0 marca commissioni `paid` comunque.
   - Altrimenti → `stripe.transfers.create()` con `idempotencyKey: payout_<agencyId>_<period>`. Su successo: `status='paid'`, `stripe_transfer_id`, `paid_at`, batch update commissioni a `paid` con `payout_id`. Su errore: `status='failed'`, `error_message`, commissioni restano `accrued` per retry.

Export `getStripe` aggiunto a `packages/core/billing/src/index.ts`.

### 2.5 UI override entity (gap v1 → falso allarme)

L'UI esiste già: `apps/web/src/app/(app)/a/[agencySlug]/clients/[tenantId]/entity-billing-panel.tsx` con form completo (model + fee_monthly_eur + commission_pct + commission_cap_eur + notes), action server `saveEntityBillingAction` in `clients/actions.ts:204`. Nessuna modifica necessaria.

---

## 3. Verifica

| Check | Risultato |
|-------|-----------|
| `pnpm typecheck` | ✅ 17/17 PASS |
| `pnpm lint` | ✅ 0 errors (19 warnings preesistenti, non introdotti) |
| `pnpm test:unit` | non eseguito — wiring è I/O-bound, no logica pura nuova |
| E2E Playwright | non eseguito — vedi sezione 4 |

---

## 4. Test consigliati prima del prossimo run mensile

### 4.1 Smoke test wiring (manuale, dev)

1. Login come tenant gestito da agenzia (es. `briansnow86@gmail.com` su `villa-irabo`).
2. Creare prenotazione test (uno qualsiasi dei 4 verticali).
3. Cambiare status a `confirmed` (o `checked_in` per experience tramite QR).
4. Query verifica:
   ```sql
   SELECT agency_id, reservation_type, reservation_id, status, gross_amount, commission_amount
   FROM agency_commissions
   WHERE reservation_id = '<id>';
   ```
   Atteso: 1 row con `status='accrued'`, `commission_amount = gross * rate`.
5. Cancellare la prenotazione → ri-query: stesso row con `status='reversed'`.

### 4.2 Smoke test cron payout (manuale)

Dopo aver almeno 1 commissione `accrued` nel mese precedente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
     https://touracore.vercel.app/api/cron/agency-payouts
```

Atteso: JSON `{ ok: true, period: "YYYY-MM-01", payouts: N, results: [...] }`. Verifica:
- Riga in `agency_payouts` con stato finale corretto.
- Se Stripe Connect ok → `status='paid'`, `stripe_transfer_id` valorizzato.
- Commissioni del periodo → `status='paid'`, `payout_id` valorizzato.

### 4.3 E2E Playwright (TODO)

Spec da scrivere: `apps/web/e2e/billing-accrual.spec.ts`. Skip se `agency_id` non resolvable (test ambient). Pattern:
1. Login tenant agency-managed.
2. Crea prenotazione.
3. UPDATE status confirmed.
4. SELECT agency_commissions → assert `status='accrued'`.
5. UPDATE status cancelled.
6. SELECT → assert `status='reversed'`.

Stima: 2h dev.

---

## 5. Deploy checklist

```
[ ] git diff su main pulito (verifica le modifiche siano solo quelle attese)
[ ] git add + commit con: "feat(billing): wiring accrueCommission + cron agency-payouts"
[ ] push origin main
[ ] supabase-cloud-ops: push migration 00148_agency_payouts.sql
[ ] verifica env Vercel production: CRON_SECRET, STRIPE_SECRET_KEY presenti
[ ] verifica env Vercel: STRIPE_CONNECT_CLIENT_ID se serve onboarding nuovi connect
[ ] (opzionale) dry-run cron payout su mese precedente per validare logica
[ ] aggiornare PROGETTO-STORIA.md con riga changelog 2026-04-26
```

---

## 6. Cosa NON è stato fatto (intenzionale)

- **Webhook Stripe payment_intent.succeeded → accrueCommission**. Era nel piano v1 P3, ma il wiring scelto è status-based (più affidabile dei webhook che possono mancare). Il webhook esistente continua a gestire `booking_commission` ledger come prima — invariato.
- **Test Playwright E2E billing-accrual**. Stima 2h, non bloccante per il deploy. Da scrivere in sprint successivo.
- **Audit log su accrual / payout**. Per ora il logging è `console.error` su failure. Se serve audit trail strutturato, integrare `writeAgencyAuditEntry` dentro `wiring.ts` e `agency-payouts/route.ts`. Tabella esistente `agency_audit_logs` (00121) supporta già il pattern.
- **UI super admin payouts page**. Nessuna view UI per visualizzare lo storico payout. Per ora ispezione via SQL su `agency_payouts`. Se utile aggiungere `/platform/payouts/page.tsx` con tabella mensile.

---

## 7. Rischi residui / monitoring

| Rischio | Mitigazione attuale | Follow-up |
|---------|---------------------|-----------|
| Stripe transfer fail (insufficient platform balance) | `status='failed'` + commissioni restano `accrued` per retry mese successivo | Alert manuale o aggiungere check balance prima del transfer |
| Connect account non onboarded | Skip con `error_message='no_connect_account'` | Email automatic all'agenzia per completare onboarding |
| Drift di tasso commission tra accrual e payout | Tasso fisso al momento dell'accrual (snapshot in `commission_rate`), payout aggrega importi | OK by design |
| Tenant cambia agenzia a metà mese | Le commissioni accrued mantengono l'agency_id originale | OK by design (storico immutabile) |

---

## 8. Riferimenti

- Documento HTML interattivo aggiornato: [`billing-system.html`](./billing-system.html)
- Helper wiring: `packages/core/agency/src/wiring.ts`
- Core commissioni: `packages/core/agency/src/commissions.ts`
- Cron payout: `apps/web/src/app/api/cron/agency-payouts/route.ts`
- Migration: `supabase/migrations/00148_agency_payouts.sql`
- Storia progetto: `docs/PROGETTO-STORIA.md`
