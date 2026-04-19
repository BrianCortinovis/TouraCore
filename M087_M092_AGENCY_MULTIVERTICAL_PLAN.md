# M087-M092 — Agency split + Multi-vertical onboarding + Modules hub

Plan date: 2026-04-19. Post-M086 (messaging suite). Migration count base: 00126.

## M087 — Agency signup split + intent capture

### Vision
Register divide tenant vs agency. Intent in `user_metadata`. Router post-login decide wizard (`/agency-onboarding` vs `/onboarding`). Agency wizard ridotto a name+slug. Fiscali/Stripe/branding opzionali post-creation con badge completamento in `/a/{slug}/settings`.

### Slices

**S01 — Register intent picker**
- Modifica `apps/web/src/app/(auth)/register/page.tsx`: radio group 3 opzioni (Struttura, Attività, Agenzia) + vertical sub-pick (7 tile) se non agenzia
- `auth.signUp` passa `options.data.intent_scope` ('tenant'|'agency') + `intent_module` (string|null)
- Demo: signup 3 intent, verify `auth.users.raw_user_meta_data` in dashboard Supabase
- DoD: intent salvato, register backward-compatible senza selezione (defaults tenant)

**S02 — Post-login router intent-aware**
- Modifica `apps/web/src/app/page.tsx` linea 41: legge `user.user_metadata.intent_scope`
- Ordine decisione: platform_admin → tenant esistente → agency membership → intent_scope → fallback `/onboarding`
- Demo: 4 combo test (intent=agency+no_agency, intent=agency+has_agency, intent=tenant+no_tenant, intent=tenant+has_tenant)
- DoD: nessun break su account esistenti senza intent_scope

**S03 — Agency wizard 2-step**
- Riduce `apps/web/src/app/(app)/agency-onboarding/wizard.tsx` da 4 step a 2 (nome+slug → confirm)
- `createAgencyOnboardingAction` mantiene signature ma rende opzionali: legalName, vatId, country (default 'IT'), brandingColor, stripe_onboarding (toggle "setup dopo")
- Salva metadata.minimal=true se skip fiscali
- Demo: 2 path create (minimal + stripe opt-in)
- DoD: agenzia created in ≤2 click, redirect `/a/{slug}` immediato

**S04 — Settings completion badges**
- Modifica `apps/web/src/app/(app)/a/[agencySlug]/settings/page.tsx`: 3 card "Da completare" se field vuoto
  - Card Fiscale: se `legal_name` OR `billing_email` vuoti
  - Card Stripe: se `stripe_connect_account_id` null
  - Card Branding: se `branding.logo_url` null
- Click card → apre form esistente inline
- Gate: `logAgencyAction` billing write blocked se legal_name null
- Demo: agency fresh 3 badge vs agency completa 0 badge

**S05 — E2E signup split regression**
- Playwright test `tests/e2e/M087-signup-split.spec.ts`:
  1. Signup struttura hospitality → `/onboarding/step-1`
  2. Signup attività bike → `/onboarding/step-1`
  3. Signup agenzia → `/agency-onboarding` 2-step → `/a/{slug}`
- Target: 3/3 PASS Vercel preview
- Run: `pnpm test:e2e --grep M087`

### Key risks
- `intent` client-controlled: server gate su membership reali, no RLS basate su metadata
- Legacy users senza intent_scope: fallback flow esistente
- Semplificazione nasconde obblighi fiscali: badge bloccante su billing-write

---

## M088 — Agency client invite + attribuzione

### Vision
Agency aggiunge cliente in 2 modi: (a) internal-create tenant + invito owner, (b) invite-link `/register?client_invite=<token>`. Signup da link popola `tenants.agency_id` + `agency_tenant_links` auto. Landing `/r/{agencySlug}` alt flow con cookie 7gg.

### Slices

**S01 — Migration `00127_agency_client_invitations.sql`**
- Tabella `agency_client_invitations` (agency_id, email, token, vertical_hint, expires_at, accepted_at, accepted_tenant_id)
- RPC `agency_client_invitation_accept(p_token, p_user_id, p_tenant_id)` SECURITY DEFINER
- RLS: agency members read own, service role write
- Index unique token where not accepted/revoked

**S02 — Internal create tenant**
- Nuovo server action `createTenantForClientAction(agencySlug, clientEmail, tenantName, tenantSlug)` in `clients/actions.ts`
- Flow: crea `tenants` + `agency_tenant_links` active + invito email owner via enqueueNotification template `agency.client.tenant_created`
- Link accept → `/login?tenant={slug}&token={token}` → associa user a tenant membership role=owner

**S03 — Invite link signup flow**
- Nuovo server action `createClientInviteAction(agencySlug, email, verticalHint)` genera token 32byte
- Link: `{NEXT_PUBLIC_SITE_URL}/register?client_invite={token}`
- Register page legge query param → preselect intent=tenant + vertical_hint → salva `user_metadata.pending_client_invite=<token>`
- Post-email confirm → onboarding step-2 consumes token via RPC → `tenants.agency_id` populated + link created

**S04 — Landing `/r/{agencySlug}` + cookie**
- Route public `/r/[agencySlug]/page.tsx`: landing branded (legge agency.branding) + CTA "Inizia con [AgencyName]"
- Setta cookie `ref_agency=<agency_id>` 7gg httpOnly secure
- Register page legge cookie → auto-fill intent=tenant + agency attribution
- Fallback organico (user non da link)

**S05 — Onboarding hook populate agency_id**
- Modifica `apps/web/src/app/(auth)/onboarding/actions.ts` `createTenantWithLegalAction`:
  - Legge `user.user_metadata.pending_client_invite` OR cookie `ref_agency`
  - Valida token agency_client_invitations (se presente) + consume
  - Insert `tenants` con `agency_id` populated
  - Insert `agency_tenant_links` active
  - Log `agency.client.onboarded`

### Key risks
- Token race condition multi-accept: RPC lock FOR UPDATE
- Cookie spoofing: verify agency_id exists + is_active
- User già in altra agency: error explicit, no silent replace

---

## M089 — Step-3 kind-aware wizard

### Vision
Step-3 onboarding oggi hardcoded accommodation. Router per primary module attivo → wizard specifico (accommodation/restaurant/bike/experience/wellness/moto/ski). Ogni wizard insert `entities` kind + subtype table.

### Slices

**S01 — Router kind dispatcher**
- Refactor `apps/web/src/app/(auth)/onboarding/step-3/page.tsx`: legge `tenant.modules` → identifica primary (first active)
- Redirect a sub-route `/onboarding/step-3/{kind}` based su module_catalog.entity_kind
- Fallback: no primary → dashboard vuoto (utente configura manuale)

**S02 — Wizard restaurant**
- Nuovo `/onboarding/step-3/restaurant/page.tsx` + form
- Campi: name, cucina type, sale count, coperti count
- Insert `entities` kind='restaurant' + `restaurants` subtype + staff_members owner

**S03 — Wizard bike**
- Nuovo `/onboarding/step-3/bike/page.tsx`
- Campi: name location, fleet_start_count, address
- Insert `entities` kind='bike_rental' + `bike_rentals` subtype

**S04 — Wizard experience**
- Nuovo `/onboarding/step-3/experience/page.tsx`
- Campi: name, booking_mode (timeslot_capacity|private|asset_rental)
- Insert `entities` kind='activity' + `experience_entities` subtype

**S05 — Wizard wellness/moto/ski**
- 3 wizard minimal (name + address only per ognuno)
- Insert `entities` kind corretto + subtype se esiste, altrimenti solo entity base

### Key risks
- Subtype table missing per alcuni moduli: MVP fallback entity base only
- Multi-module primary conflict: deterministic pick (first by order_idx)

---

## M090 — Modules hub tenant post-onboarding

### Vision
Route `/{tenantSlug}/settings/modules`: lista moduli attivi + prezzo runtime + add/remove/pause con Stripe proration. CTA nuova entità per modulo.

### Slices

**S01 — Hub UI**
- Nuovo `/{tenantSlug}/settings/modules/page.tsx`
- Lista da `tenant.modules` JSONB + join `module_catalog` + `bundle_discounts`
- Card per modulo: nome, prezzo, stato (active/trial/paused), trial_until, CTA add-entity
- Summary: totale mensile + sconto bundle applicato

**S02 — Add module Stripe proration**
- Server action `addModuleAction(tenantSlug, moduleCode)`:
  - Valida non duplicato
  - Se `subscription_items` esiste → Stripe `subscription.items.create` con `proration_behavior=always_invoice`
  - Update `tenants.modules[code]` active source=subscription
  - Insert `module_activation_log`

**S03 — Remove/pause module**
- Server action `removeModuleAction(tenantSlug, moduleCode)`:
  - Check entity count attive per module.entity_kind
  - Se >0: ritorna error + lista entità da disattivare
  - Se 0 o pausable: Stripe `subscription.items.del` + update modules[code].active=false

**S04 — Add entity per module from hub**
- CTA in card: "Aggiungi struttura/attività/mezzo"
- Riusa wizard step-3 kind-aware (M089) ma in modal/route in-app
- Insert entity + conta per billing snapshot (M091)

**S05 — Webhook payment_failed grace**
- Modifica `api/webhooks/stripe/route.ts`:
  - `invoice.payment_failed` → set `tenants.billing_grace_until = now() + 7d`
  - Dopo 7gg cron disable modules → UI mostra banner "Aggiorna pagamento"
  - `invoice.paid` → clear grace

### Key risks
- Stripe proration calc errata → invoice anomala: test con Stripe CLI fixtures
- Concurrent add/remove same module: DB lock
- Webhook ordering payment_failed → paid same billing cycle: check timestamp

---

## M091 — Billing per-unit + entity snapshots

### Vision
Alcuni moduli scalano per entità (2 bike location = 2× prezzo base). Snapshot mensile + Stripe quantity update.

### Slices

**S01 — Migration `00128_module_billing_units.sql`**
- `module_catalog` ADD COLUMN `price_per_unit_eur numeric(10,2) DEFAULT 0`
- Nuova tabella `entity_billing_snapshots` (tenant_id, module_code, entity_count, period_month date, unit_price_eur, total_eur, stripe_subitem_id)
- Index (tenant_id, period_month)

**S02 — Cron snapshot mensile**
- Nuovo `/api/cron/billing-snapshots/route.ts` (gated `CRON_SECRET`)
- Run primo giorno mese: per ogni tenant attivo, count entities attive per module.entity_kind
- Insert snapshot row + trigger M091/S03

**S03 — Stripe subscription qty sync**
- Dopo snapshot: `stripe.subscriptionItems.update(subitem_id, {quantity: count, proration_behavior: 'always_invoice'})`
- Log in `module_activation_log` action='qty_updated'
- Error handling: retry 3× con backoff

**S04 — Admin view snapshot history**
- Route `/{tenantSlug}/settings/modules/history`: timeline snapshot con delta entity count + billing impact
- CSV export per accountant

### Key risks
- Double-count entities soft-deleted: filter is_active=true
- Mid-month entity creation billed intero: pro-rata? decision: bill next snapshot (semplicità)
- Stripe rate limit 100 req/s: batch processing tenant

---

## M092 — E2E Playwright multi-vertical

### Vision
5 scenari Playwright copre flow completo post-M087-M091.

### Slices

**S01 — Signup 3 vertical**
- Scenario: signup hospitality / bike / restaurant → onboarding kind-aware → dashboard entity created

**S02 — Agency invite flow**
- Scenario: agency create invite → user receives email → register via link → tenant created con agency_id

**S03 — Add/remove module runtime**
- Scenario: tenant signed-up → add module → Stripe proration → add entity → remove module → block se entity active

**S04 — Run Vercel preview 5/5 PASS**
- `pnpm test:e2e --project=vercel-preview`
- Target: 5/5 GREEN
- Memory save commit + result

### Key risks
- Stripe test mode fixtures timing: use `stripe.test_clocks`
- Email confirm in CI: mock via inbox trap o disable email_confirm temporarily

---

## Dependency graph

```
M087 ──┬── M088 (agency split required)
       └── M089 (router intent-aware used for vertical dispatch)
M089 ── M090 (hub reuses kind-aware wizards)
M090 ── M091 (per-unit needs hub infrastructure)
M087+M088+M089+M090+M091 ── M092 (E2E validates all)
```

## Migration counter finale
- M088: `00127_agency_client_invitations.sql`
- M091: `00128_module_billing_units.sql`
- Totale post-M092: 128 migrations

## Estimated effort
- M087: 1 chat session (2-3h)
- M088: 1 session (3-4h, RPC + flow)
- M089: 1 session (3h, 5 wizard simili)
- M090: 2 sessions (Stripe wiring critico)
- M091: 1 session (cron + snapshot)
- M092: 1 session (Playwright)

Totale: 7 session circa, ~15-20h lavoro effettivo.
