# TouraCore — Foundation Multi-Module + Billing + Free Override

Piano propedeutico al modulo Ristorazione. Scope: rendere core pronto per N moduli, onboarding multi-vertical, billing modulare, free override super-admin + agency.

Stato attuale: 5 piani hardcoded (trial/starter/pro/enterprise), subscription 1:1 tenant, no free flag, no per-module pricing, no entitlements granulari, onboarding senza step vertical/plan.

---

## Obiettivi

1. Onboarding: profile → vertical picker → entity → piano → pagamento → CMS
2. Billing modulare: subscription con N items (1 per modulo attivo)
3. Free override: super-admin (globale) + agency (su suoi tenant)
4. Hospitality ready per toggle vertical + switcher
5. Route guard per modulo attivo
6. Sidebar top-bar + vertical switcher
7. Settings/modules UI funzionante con activation flow

Zero breaking: tenants esistenti backfill hospitality attivo.

---

## Module catalog (decisione iniziale 7 moduli)

| code | label | prezzo mese EUR | entity_kind | dipendenze |
|------|-------|-----------------|-------------|------------|
| hospitality | Struttura ricettiva | 29 | accommodation | — |
| restaurant | Ristorazione | 29 | restaurant | — |
| wellness | Wellness/SPA | 19 | wellness | — |
| bike_rental | Bike/E-bike | 15 | bike_rental | — |
| moto_rental | Moto | 19 | moto_rental | — |
| experiences | Esperienze/Tour | 19 | activity | — |
| ski_school | Scuola sci | 15 | ski_school | — |

Bundle: 2 moduli -10%, 3 moduli -15%, 4+ moduli -20%. Trial 14gg per modulo (card-on-file, charge a scadenza). Moduli pausabili per stagione (ski, bike).

Prezzi + bundle configurabili runtime via tabella, non hardcoded.

---

## Schema DB (migrations 00058-00062)

### 00058 — module_catalog + entity kind extension
```sql
ALTER TABLE public.entities DROP CONSTRAINT entities_kind_check;
ALTER TABLE public.entities ADD CONSTRAINT entities_kind_check 
  CHECK (kind IN ('accommodation','activity','restaurant','wellness','bike_rental','moto_rental','ski_school'));

CREATE TABLE public.module_catalog (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  base_price_eur NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_price_id TEXT,
  entity_kind TEXT,
  dependencies TEXT[] DEFAULT '{}',
  trial_days INT DEFAULT 14,
  active BOOLEAN DEFAULT TRUE,
  order_idx INT DEFAULT 0,
  pausable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO module_catalog (code, label, base_price_eur, entity_kind, order_idx, pausable) VALUES
 ('hospitality','Struttura ricettiva',29,'accommodation',1,false),
 ('restaurant','Ristorazione',29,'restaurant',2,false),
 ('wellness','Wellness/SPA',19,'wellness',3,false),
 ('experiences','Esperienze/Tour',19,'activity',4,false),
 ('bike_rental','Bike/E-bike',15,'bike_rental',5,true),
 ('moto_rental','Moto',19,'moto_rental',6,true),
 ('ski_school','Scuola sci',15,'ski_school',7,true);

CREATE TABLE public.bundle_discounts (
  id UUID PK DEFAULT gen_random_uuid(),
  min_modules INT NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE
);
INSERT INTO bundle_discounts (min_modules, discount_percent) VALUES (2,10),(3,15),(4,20);
```

### 00059 — tenants.modules JSONB + subscription_items
```sql
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '{}';

-- Backfill tenants esistenti: hospitality attivo legacy
UPDATE tenants SET modules = jsonb_build_object(
  'hospitality', jsonb_build_object(
    'active', true, 'source', 'legacy', 
    'since', COALESCE(created_at::text, NOW()::text)
  )
) WHERE modules = '{}'::jsonb;

CREATE TABLE public.subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES module_catalog(code),
  stripe_subscription_item_id TEXT,
  quantity INT NOT NULL DEFAULT 1,
  unit_amount_eur NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trialing','active','paused','past_due','canceled')) DEFAULT 'trialing',
  trial_end TIMESTAMPTZ,
  paused_until TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, module_code)
);
CREATE INDEX ON subscription_items (tenant_id);
CREATE INDEX ON subscription_items (stripe_subscription_item_id);

CREATE TABLE public.module_activation_log (
  id UUID PK DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  module_code TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('activated','deactivated','paused','resumed','trial_started','trial_ended','payment_failed','free_granted','free_revoked')),
  actor_user_id UUID REFERENCES auth.users(id),
  actor_scope TEXT CHECK (actor_scope IN ('super_admin','agency','tenant_owner','system')),
  stripe_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 00060 — free override (super-admin + agency)
```sql
CREATE TABLE public.module_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES module_catalog(code),
  override_type TEXT NOT NULL CHECK (override_type IN ('free','discount_percent','discount_flat','extended_trial')),
  override_value NUMERIC(10,2), -- % sconto o flat importo, o giorni extra trial
  reason TEXT NOT NULL, -- obbligatorio per audit
  granted_by_user_id UUID REFERENCES auth.users(id),
  granted_by_scope TEXT NOT NULL CHECK (granted_by_scope IN ('super_admin','agency')),
  granted_by_agency_id UUID REFERENCES agencies(id), -- se agency
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ, -- NULL = permanente
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID REFERENCES auth.users(id),
  revoked_reason TEXT
);
CREATE INDEX ON module_overrides (tenant_id, module_code) WHERE active = TRUE;

-- RLS: super_admin full access; agency_owner solo su propri tenant (agency_tenant_links)
ALTER TABLE module_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all" ON module_overrides FOR ALL USING (is_platform_admin());

CREATE POLICY "agency_own_tenants" ON module_overrides 
  FOR ALL USING (
    granted_by_scope = 'agency' AND EXISTS (
      SELECT 1 FROM agency_tenant_links atl
      JOIN agency_members am ON am.agency_id = atl.agency_id
      WHERE atl.tenant_id = module_overrides.tenant_id
        AND atl.status = 'active'
        AND am.user_id = auth.uid()
        AND am.role IN ('owner','manager')
    )
  );

-- Tenant owner read-only su override propri
CREATE POLICY "tenant_read_own" ON module_overrides 
  FOR SELECT USING (
    tenant_id = ANY(get_user_tenant_ids())
  );
```

### 00061 — agency modules (agency attiva moduli per tenant sotto)
```sql
ALTER TABLE public.agencies 
  ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'agency_starter',
  ADD COLUMN IF NOT EXISTS max_tenants INT,
  ADD COLUMN IF NOT EXISTS white_label_domain TEXT,
  ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS can_grant_free BOOLEAN DEFAULT TRUE, -- flag super-admin per disabilitare free-grant
  ADD COLUMN IF NOT EXISTS free_grant_quota INT, -- es max 5 tenant free, NULL=illimitato
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Agency subscription items (agency paga moduli che può rivendere)
CREATE TABLE public.agency_subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL REFERENCES module_catalog(code),
  stripe_subscription_item_id TEXT,
  tenant_slots INT DEFAULT 1, -- quanti tenant può attivare per questo modulo
  status TEXT CHECK (status IN ('active','canceled','past_due')) DEFAULT 'active',
  UNIQUE(agency_id, module_code)
);
```

### 00062 — entity_links (comunicazione cross-module)
```sql
CREATE TABLE public.entity_links (
  id UUID PK DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  from_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL CHECK (link_type IN ('parent_child','partner','folio_bridge','shared_guest','cross_sell','upsell_package')),
  config JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_entity_id, to_entity_id, link_type)
);

ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS isolation_mode TEXT 
  CHECK (isolation_mode IN ('none','partial','strict')) DEFAULT 'none';
```

---

## Packages core refactor

### packages/core/billing/src/
- **types.ts**: rimuovi PLAN_PRICES hardcoded, aggiungi ModuleCatalog, SubscriptionItem, ModuleOverride types
- **modules.ts** (nuovo): `getActiveModules(tenantId)`, `activateModule(tenantId, code, opts)`, `deactivateModule`, `pauseModule`
- **overrides.ts** (nuovo): `grantFreeOverride(tenantId, code, reason, actor)`, `revokeOverride`, `getEffectivePrice(tenantId, code)` (considera override)
- **subscriptions.ts**: `createSubscriptionWithItems(tenantId, modules[])` → crea Stripe sub con line_items, gestisce trial_end, prorata
- **bundle.ts** (nuovo): `calculateBundleDiscount(selectedModules[]): {subtotal, discount, total}`

### packages/core/auth/src/
- **permissions.ts**: `canAccessVertical(user, tenant, moduleCode): boolean` → verifica `tenant.modules[code].active` + override
- `canGrantFreeOverride(user, tenantId): boolean` → super_admin sempre, agency_owner se tenant sotto + `agency.can_grant_free`

### packages/core/tenants/src/
- **modules.ts** (nuovo): `hasModule(tenant, code)`, `getTenantModules(tenant)`, `updateTenantModule(tenantId, code, state)`

---

## Onboarding refactor (4 step)

### Step 1 — Profilo utente (NUOVO, sostituisce vecchio step 1 welcome)
Route: `/auth/onboarding/step-1`
- Form: nome, cognome, telefono, lingua, fuso orario
- Auth già fatto (email/password in /auth/signup)
- Scrive: `profiles` row
- Next → step-2

### Step 2 — Selezione moduli (NUOVO)
Route: `/auth/onboarding/step-2`
- UI grid 7 card modulo (da module_catalog), multi-select checkbox
- Preview prezzo live: `base_price × modules + bundle_discount`
- Min 1 modulo obbligatorio
- Scrive: session storage (persist per navigazione avanti/indietro)
- Next → step-3

### Step 3 — Dati tenant/business
Route: `/auth/onboarding/step-3` (era step-2 vecchio)
- Form: nome business/legal_name, slug, country, vat_number, legal_type, address
- Crea: `tenant` row + `memberships` owner link + `tenant.modules = selected_from_step2` con `active=false` (attivazione dopo pagamento)
- Next → step-4

### Step 4 — Piano + pagamento
Route: `/auth/onboarding/step-4`
- Riepilogo moduli + prezzo finale
- Opzioni:
  - **Trial 14gg**: raccoglie carta via Stripe Setup Intent, no charge, attiva moduli subito con `status=trialing`
  - **Paga subito**: Stripe Checkout, charge immediato, attiva moduli `status=active`
- Webhook `checkout.session.completed` o `setup_intent.succeeded`:
  - Crea `subscription` + `subscription_items` (1 per modulo)
  - Setta `tenant.modules[code].active = true`
  - Log `module_activation_log`
- Next → step-5

### Step 5 — Prima entity
Route: `/auth/onboarding/step-5` (era step-3 vecchio)
- Se solo 1 modulo scelto: form diretto creazione entity di quel kind
- Se più moduli: "Da dove iniziare?" → sceglie modulo → form specifico
- Altri moduli entity-creation rimandata a CMS post-onboarding
- Completa onboarding → redirect CMS `/[tenantSlug]/[vertical]/[entitySlug]/overview`

### Redirect logic `/auth/onboarding/page.tsx`
Aggiorna router:
```
if (!profile.name) → step-1
else if (!selected_modules in session && !tenant) → step-2
else if (!tenant) → step-3
else if (!subscription) → step-4
else if (!first_entity) → step-5
else → /[tenantSlug]/dashboard
```

---

## Super-admin panel — free override UI

### Pagina nuova `/superadmin/tenants/[tenantId]/modules`
- Lista moduli catalog con stato per questo tenant:
  - Attivo (subscription), Attivo (free override), Trial, Inattivo
- Action "Concedi free override":
  - Modal: modulo, reason (obbligatoria), durata (permanente | scadenza)
  - POST `/api/superadmin/tenants/:id/overrides` → insert module_overrides
  - Log audit + attiva subito modulo in `tenant.modules`
- Action "Revoca override": soft delete + log

### Pagina esistente `/superadmin/billing`
Aggiungi:
- Tab "Overrides" con lista tutti override attivi (MRR perso stimato)
- Tab "Module catalog" editor (prezzi, nuovo modulo, disattiva modulo globalmente)
- Tab "Free tenants" filter: lista tenant con almeno 1 override free

---

## Agency panel — free grant (limitato da quota)

### Pagina `/agency/[agencySlug]/clients/[tenantId]/modules`
- Stessa UI di super-admin ma scope limitato a tenant sotto agency
- Flag `agency.can_grant_free` + quota `agency.free_grant_quota` governa
- Se quota esaurita: button disabilitato con tooltip "Quota esaurita, contatta platform admin"
- Reason obbligatoria, log audit include `granted_by_agency_id`

### Pagina `/agency/[agencySlug]/settings/modules`
- Agency attiva moduli per sé (paga per slot rivendibili)
- `agency_subscription_items`: quanti tenant può attivare per modulo
- Se agency non ha modulo X attivo → tenant sotto non può attivarlo (consistency)

---

## Hospitality — modifiche necessarie

### File da toccare

**1. apps/web/src/app/(app)/app-topbar.tsx**
- Aggiungi `<VerticalSwitcher />` chip sinistra (nuovo componente)
- Entity dropdown (riga 92-123) filtra per kind del vertical attivo
- Remember-last-entity per vertical localStorage

**2. apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/entity-sidebar.tsx**
- Top switch `[Hospitality | Restaurant | …]` visibile se tenant.modules.count > 1
- Rimuovi `placeholder:true` da voce restaurant (quando modulo attivo)
- Hide voci sidebar se modulo non attivo
- Click "Restaurant" con logic: sibling entity restaurant → go, altrimenti `/dine/new`

**3. apps/web/src/app/(app)/[tenantSlug]/stays/layout.tsx**
- Route guard: se `tenant.modules.hospitality.active === false` → redirect `/settings/modules?activate=hospitality`

**4. apps/web/src/app/(app)/[tenantSlug]/settings/modules/**
- Refactor UI: grid moduli con stato, toggle, add-module flow
- Mostra override badge se presente
- Flow attivazione: Stripe prorata checkout inline
- Flow disattivazione: confirm modal + effect immediato

**5. apps/web/src/app/(app)/[tenantSlug]/settings/billing/ (NUOVO)**
- Pagina dedicata: piano, invoice history, payment method, customer portal link
- Breakdown cost per modulo
- Override badge se free

**6. apps/web/src/app/(auth)/onboarding/** 
- Riorganizza step 1-5 come sopra
- Old step-2 (legal) → step-3
- Old step-3 (property) → step-5

**7. packages/core/tenants + types**
- `TenantModules` shape, `EntityKind` enum esteso, `ModuleCode` enum

**8. apps/web/src/app/api/webhooks/stripe/route.ts**
- Handler `customer.subscription.created` → popola subscription_items
- Handler `invoice.payment_failed` → grace 7gg, poi `deactivateModule`
- Handler `customer.subscription.trial_will_end` → email reminder
- Handler `invoice.paid` → riattiva modulo se era past_due

**9. middleware.ts (nuovo se non esiste)**
- Intercept `/[tenantSlug]/stays/*`, `/dine/*`, etc. → check module active
- Eccezione: se override free attivo → bypass check billing

**10. Seed demo**
- `briansnow86` 7 strutture: `tenant.modules.hospitality.active=true`
- 1 tenant demo con override free super-admin (test)
- 1 tenant demo sotto agency con override free agency (test)

---

## Price calculation logic (priorità)

```
getEffectivePrice(tenant, moduleCode):
  1. override free attivo? → 0
  2. override discount? → base * (1 - discount%)
  3. bundle discount basato su N moduli attivi tenant
  4. base_price da module_catalog
```

Applicato sia in UI (preview step-4 onboarding) sia in `createSubscriptionWithItems` (Stripe coupon + discount item).

Stripe implementation:
- Override free → Stripe `coupon` 100% + attach a subscription_item
- Bundle → Stripe `coupon` % applicato a subscription (tutti items)
- Trial → `trial_end` per subscription_item

---

## Route guard middleware

`apps/web/src/middleware.ts`:
```
matcher: /[tenantSlug]/:vertical/:path*

VERTICAL_TO_MODULE = {
  stays: 'hospitality',
  dine: 'restaurant',
  wellness: 'wellness',
  bike: 'bike_rental',
  moto: 'moto_rental',
  experiences: 'experiences',
  ski: 'ski_school',
}

async function guard(req):
  const vertical = extractVertical(req.url)
  if (!vertical) return next()
  const tenant = await fetchTenant(tenantSlug)
  const module = VERTICAL_TO_MODULE[vertical]
  if (!tenant.modules[module]?.active) {
    // check override
    const override = await getActiveOverride(tenant.id, module)
    if (!override) return redirect(`/${tenantSlug}/settings/modules?activate=${module}`)
  }
  return next()
```

---

## Piano esecutivo (milestone)

**F1 — DB foundation (3-4gg)**
- Migration 00058-00062
- Backfill tenants esistenti
- Deploy cloud Supabase
- Test RLS super_admin + agency override

**F2 — Core packages (2-3gg)**
- packages/core/billing refactor: modules.ts, overrides.ts, bundle.ts
- packages/core/auth canAccessVertical
- packages/core/tenants modules helpers
- Types esportati tutti

**F3 — Onboarding 5-step (3-4gg)**
- Step 1 profile, Step 2 modules picker, Step 3 tenant, Step 4 plan+payment, Step 5 first entity
- Redirect logic aggiornato
- Stripe Setup Intent + Checkout integration
- Session persistence inter-step

**F4 — Settings pages (2-3gg)**
- `/settings/modules` refactor con grid attivazione
- `/settings/billing` nuova
- Stripe customer portal link

**F5 — Middleware + route guard (1-2gg)**
- middleware.ts
- Layout guards `/stays`, `/dine`, etc.
- Override bypass logic

**F6 — Top-bar + vertical switcher (2-3gg)**
- VerticalSwitcher component
- Entity dropdown filtering
- Remember-last-entity localStorage
- Breadcrumb 3 livelli agency/tenant/entity

**F7 — Super-admin panel (2-3gg)**
- `/superadmin/tenants/[id]/modules` override grant UI
- `/superadmin/billing` tab overrides + catalog editor
- `/superadmin/billing` tab free-tenants filter
- Audit log viewer

**F8 — Agency panel (2-3gg)**
- `/agency/[slug]/clients/[tenantId]/modules` con quota
- `/agency/[slug]/settings/modules` agency subscription
- Quota enforcement

**F9 — Stripe webhook refactor (2gg)**
- Nuovi handler eventi subscription_item-level
- Grace period 7gg past_due
- Trial end reminder

**F10 — Entity creation flow (1-2gg)**
- `/[tenantSlug]/new` hub con kind picker (moduli attivi)
- Form specifici per kind
- Sidebar placeholder restaurant rimosso quando modulo attivo

**F11 — Seed + testing (1-2gg)**
- briansnow86 backfill
- Tenant demo con override free
- Agency demo con free grant
- E2E test flow completi

**F12 — Docs + ritornello (1gg)**
- Update CLAUDE.md
- Aggiornare memory multi_vertical_agency_architecture.md
- Screenshot superadmin flows

**Totale: ~25 giorni lavoro**. Poi ristorazione (12 settimane piano originale).

---

## Billing models (hybrid) — super-admin governance

### 3 modelli billing configurabili per tenant/agency

1. **subscription**: mensile/annuale flat per modulo. Base + bundle discount.
2. **commission**: % su ogni prenotazione/coperto/noleggio. Zero fisso mensile.
3. **hybrid**: subscription ridotta + commission ridotta. Revenue share model.

Sceglie super-admin (o agency sui suoi tenant) quale modello applicare. Configurabile per:
- Singolo tenant (override individuale)
- Intera agency (policy default per clienti agency)
- Per-modulo (es hospitality subscription, restaurant commission)

### Schema billing_profile (migration 00063)

```sql
CREATE TABLE public.billing_profiles (
  id UUID PK DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('tenant','agency','global_default')),
  scope_id UUID, -- tenant_id o agency_id, NULL se global_default
  module_code TEXT REFERENCES module_catalog(code), -- NULL = applica a tutti moduli
  billing_model TEXT NOT NULL CHECK (billing_model IN ('subscription','commission','hybrid','free')),
  subscription_price_eur NUMERIC(10,2), -- per subscription o hybrid
  commission_percent NUMERIC(5,2), -- per commission o hybrid (es 2.5 = 2.5%)
  commission_fixed_eur NUMERIC(10,2) DEFAULT 0, -- fee fissa per transazione
  commission_applies_to TEXT[] CHECK (commission_applies_to <@ ARRAY['booking_total','booking_net','coperto','rental','upsell']),
  commission_min_eur NUMERIC(10,2), -- commissione minima
  commission_cap_eur NUMERIC(10,2), -- tetto massimo commissione
  active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_by_scope TEXT CHECK (created_by_scope IN ('super_admin','agency')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON billing_profiles (scope, scope_id, module_code) WHERE active = TRUE;

-- Default globali (applicati se no profile specifico)
INSERT INTO billing_profiles (scope, module_code, billing_model, subscription_price_eur) VALUES
 ('global_default','hospitality','subscription',29),
 ('global_default','restaurant','subscription',29),
 ('global_default','wellness','subscription',19),
 ('global_default','experiences','subscription',19),
 ('global_default','bike_rental','subscription',15),
 ('global_default','moto_rental','subscription',19),
 ('global_default','ski_school','subscription',15);
```

### Resolution priority (dal più specifico al più generico)

```
getBillingProfile(tenant, moduleCode):
  1. tenant-specific + module-specific (billing_profiles WHERE scope='tenant' AND scope_id=tenant.id AND module_code=X)
  2. tenant-specific any-module (scope='tenant' AND module_code IS NULL)
  3. agency-specific + module-specific (se tenant sotto agency)
  4. agency-specific any-module
  5. global_default + module-specific
  6. fallback hardcoded base_price da module_catalog
```

Module override `free` rimane priorità assoluta (schiaccia tutti i profili).

### Commission ledger (esistente 00021 esteso)

Tabella `commission_ledger` già c'è. Aggiungi colonne:
```sql
ALTER TABLE commission_ledger
  ADD COLUMN billing_profile_id UUID REFERENCES billing_profiles(id),
  ADD COLUMN commission_percent_applied NUMERIC(5,2),
  ADD COLUMN base_amount_eur NUMERIC(10,2), -- su cosa calcolata (booking_total, ecc)
  ADD COLUMN applies_to TEXT; -- booking/coperto/rental
```

Ogni prenotazione → trigger `calc_commission()` che:
1. Risolve billing_profile per tenant+module
2. Se model include commission → crea riga commission_ledger
3. Se hybrid → crea riga commission + subscription resta come canonical mensile Stripe

### Stripe implementation hybrid

- **Subscription part**: Stripe Subscription normale con `subscription_items` (flusso già disegnato)
- **Commission part**:
  - Destination charge Stripe Connect: booking paga via Stripe Checkout, `application_fee_amount` = commissione calcolata
  - Funds scendono diretto al tenant (Connect account), TouraCore trattiene commission
  - Ledger `commission_ledger` riga per audit + export fiscale
- **Hybrid**: entrambi meccanismi attivi simultaneamente. Utente paga sub mensile + ogni booking trattenuta %.

### Agency commission split

Se tenant è sotto agency con commission model, due percentuali:
- `platform_commission_percent`: TouraCore trattiene
- `agency_commission_percent`: agency trattiene
- Tenant riceve: booking_total - platform% - agency%

Schema estensione:
```sql
ALTER TABLE billing_profiles
  ADD COLUMN platform_commission_percent NUMERIC(5,2),
  ADD COLUMN agency_commission_percent NUMERIC(5,2);
-- commission_percent = somma (se scope=global o tenant-direct)
-- scope=agency → platform + agency separati
```

Stripe Connect con 2 transfer destinations:
- `application_fee_amount` = platform %
- Transfer separato a agency.stripe_account_id = agency %

---

## Super-admin billing panel (refactor completo)

### Route `/superadmin/billing/*`

```
/superadmin/billing/
├── overview                 # MRR, ARR, churn, top tenants per revenue
├── catalog                  # CRUD module_catalog (prezzi, nuovo modulo, disable)
├── bundles                  # CRUD bundle_discounts
├── profiles                 # lista billing_profiles (filter scope/tenant/agency/module)
│   ├── new                  # crea profile manuale
│   └── [id]                 # edit
├── tenants                  # lista tenant con billing attuale (model, effettivo prezzo, MRR)
│   └── [tenantId]           # dettaglio tenant billing
│       ├── apply-profile    # applica profilo esistente o crea custom
│       ├── grant-free       # override free (già previsto)
│       ├── commissions      # storico commission_ledger filtrato
│       └── invoices         # storico fatture tenant
├── agencies                 # lista agency con billing attuale
│   └── [agencyId]
│       ├── apply-profile
│       ├── set-commission-split  # platform% vs agency%
│       ├── subscription     # agency sub
│       └── quota-free       # set can_grant_free + quota
├── commissions              # global commission_ledger dashboard
│   ├── by-tenant, by-agency, by-module, by-period
│   └── export CSV/XML fiscale
├── overrides                # lista module_overrides attivi (MRR perso)
├── invoices                 # tutte invoices platform-side
├── payouts                  # Stripe Connect payouts tenant + agency
├── refunds                  # refund management
└── audit                    # log tutte action billing (module_activation_log + billing_profile_log)
```

### Pagina `/superadmin/billing/tenants/[tenantId]` features chiave

- Card stato: modello corrente (subscription/commission/hybrid/free), moduli attivi, MRR teorico, MRR reale (dopo override), commission 30gg
- Section "Cambia modello":
  - Dropdown: subscription | commission | hybrid | free
  - Input subscription_price_eur (se sub/hybrid)
  - Input commission_percent (se comm/hybrid) + applies_to checkbox
  - Scope: tenant-only o applica a tutti tenant agency?
  - Validità: da X a Y (NULL=permanente)
  - Reason obbligatoria
  - Submit → crea billing_profile + aggiorna Stripe subscription (se cambiano price)
- Timeline billing_profile_log storico modifiche
- Button "Ricalcola commissioni" (batch retro-attivo opzionale)

### Pagina `/superadmin/billing/catalog` — editor moduli

- Tabella module_catalog inline-editable
- Add new module (code, label, price, kind, order)
- Disable module globally (esistente tenants con modulo mantengono fino a revoca manuale)
- Re-seed Stripe Prices (sync button crea `Stripe.prices.create` se manca stripe_price_id)

### Pagina `/superadmin/billing/commissions` — dashboard

- Chart: commission revenue 30/90/365gg
- Breakdown per module, per agency, per tenant, per country
- Top earner tenant/agency
- Anomaly detection (drop >30% MoM)
- Export CSV + XML ADE (corrispettivi electronic-invoice per commission)

### Pagina `/superadmin/billing/agencies/[id]/set-commission-split`

- Input platform_commission_percent + agency_commission_percent
- Preview su booking esempio: 100€ booking → platform X%, agency Y%, tenant net
- Stripe Connect config auto-update (transfer destination)

---

## Agency billing panel

### Route `/agency/[agencySlug]/billing/*`

- `subscription`: agency sub mensile (quanto paga agency a platform)
- `revenue`: commissioni agency trattenute da tenant clienti
- `tenant-plans`: applica billing_profile ai propri tenant (subscription/commission/hybrid) — scope agency
- `invoices-clienti`: agency emette fattura ai tenant clienti (white-label)
- `payouts`: Stripe Connect agency account payouts
- `overrides`: free grant con quota

Agency NON vede global billing platform. Scope-limited a `scope IN ('agency','tenant')` WHERE agency_link esiste.

---

## Tenant billing panel (utente finale)

`/[tenantSlug]/settings/billing`:
- Piano corrente (subscription/commission/hybrid) + prezzo effettivo
- Breakdown: quanto paga per sub, quanto % commission (se applicabile)
- Prossima fattura + payment method
- Storico invoice + download PDF
- Commission history (se commission attiva)
- Link Stripe customer portal
- Badge "Free" o "Discount applicato" se override attivo

---

## Workflow esempio (caso d'uso combinato)

**Scenario**: Agency X gestisce 20 hotel + 5 ristoranti. Super-admin decide:
- Agency X paga platform $199/mese (agency subscription)
- Agency X può trattenere 3% su ogni booking dei suoi tenant
- Platform trattiene 2% su ogni booking (totale 5%)
- Tenant sotto agency X hanno subscription free (agency grant, billing_model=free per tenants ma commission attiva per agency+platform)

Schema risultante:
```
billing_profiles:
  - scope=agency, scope_id=X, module_code=NULL, billing_model=hybrid, 
    subscription_price_eur=199, platform_commission=2, agency_commission=3
  - scope=tenant, scope_id=<tenantY>, module_code=NULL, billing_model=commission
    (tenant non paga sub, ma commissioni attive)

module_overrides:
  - 20 righe scope=agency grant free subscription per tenant clients

commission_ledger (automatica per ogni booking):
  - tenant pays 5% → 2% platform + 3% agency
```

### Scenario alternativo: cliente diretto subscription

- Cliente privato hotel single → billing_profile scope=global_default → subscription 29€/mese
- No commission
- Paga solo sub mensile

### Scenario ibrido: ristorante premium

- Ristorante luxury: super-admin applica hybrid profile
- 50€/mese subscription ridotta + 1% commission su booking engine
- Cliente accetta perché booking engine porta alto volume

---

## Decisioni ancora aperte

1. **Bundle sconto**: 10/15/20% progressivo? O flat "bundle 3+ -20%"? (raccomando progressivo)
2. **Trial obbligatorio o opt-in** in step-4? (raccomando default trial 14gg, opt-in "paga subito" per early revenue)
3. **Override free permanente default o richiede scadenza**? (raccomando scadenza opt-in, default permanente con revisione annuale automatica)
4. **Agency quota free default**: 0 (nessuna), 5, illimitato? (raccomando 5 di default, super-admin modifica)
5. **Moduli dipendenze**: wellness forza hospitality? (raccomando no, standalone, ma UX suggerisce)
6. **Prezzo agency**: agency_starter / agency_pro / agency_enterprise? Prezzi?
7. **Grace past_due**: 7gg o 14gg? (raccomando 7gg)
8. **Entity kind activity vs experiences**: esiste già `activity`, modulo si chiama `experiences`. Mapping 1:1 o rinominare kind? (raccomando kind resti `activity`, solo modulo chiamato experiences)

Conferma 1-8 + ordine milestone F1-F12 → parto con F1 (migrations).
