# Turismo Platform — Specifica Progetto per GSD-2

## Visione

Piattaforma SaaS multi-verticale per il turismo italiano. Architettura modulare con core condiviso e verticali indipendenti. Il primo verticale è Hospitality (strutture ricettive). I verticali futuri (bike/e-bike, esperienze, scuole sci, ristorazione) usano lo stesso core ma hanno schema DB, logica e UI propri.

## Stack Tecnologico

- **Database + Auth + Storage**: Supabase Pro
- **Deploy + SSR**: Vercel Pro
- **CDN + DNS**: Cloudflare
- **Object Storage media**: Cloudflare R2
- **Frontend**: Next.js 14+ (App Router)
- **Linguaggio**: TypeScript strict (no `any`, no `as` inutili)
- **UI**: Tailwind CSS + Radix UI
- **Validazione**: Zod su ogni input
- **State client**: Zustand
- **Monorepo**: pnpm workspaces + Turborepo
- **Pagamenti**: Stripe Connect (destination charges)
- **Email**: Resend

## Architettura Repository

```
turismo-platform/
├── apps/
│   ├── web/                    # App principale Next.js
│   ├── admin/                  # Super admin panel
│   └── embed/                  # Widget booking embeddabili
├── packages/
│   ├── core/
│   │   ├── auth/               # Autenticazione + sessioni
│   │   ├── tenants/            # Multi-tenant + org + agenzie
│   │   ├── roles/              # RBAC permessi
│   │   ├── billing/            # Abbonamenti + commissioni
│   │   ├── booking/            # Primitive di prenotazione
│   │   ├── portals/            # Primitive portali territoriali
│   │   ├── seo/                # SEO base (sitemap, meta, schema.org)
│   │   ├── media/              # Upload, ottimizzazione, R2
│   │   ├── audit/              # Audit log
│   │   ├── settings/           # Settings globali e per tenant
│   │   ├── notifications/      # Email, push, in-app
│   │   ├── integrations/       # Framework integrazioni esterne
│   │   ├── admin-framework/    # Componenti admin riusabili
│   │   ├── widget/             # Framework embed/widget
│   │   ├── security/           # Rate limiting, CSRF, CSP, sanitize
│   │   └── ui/                 # Componenti UI condivisi
│   ├── db/                     # Schema Supabase, migrazioni, seed
│   ├── config/                 # Config condivise (eslint, ts, tailwind)
│   └── types/                  # Tipi TypeScript condivisi
├── verticals/
│   ├── hospitality/            # Primo verticale
│   │   ├── components/
│   │   ├── lib/
│   │   ├── api/
│   │   ├── db/
│   │   └── types/
│   ├── bike/                   # (futuro)
│   ├── experiences/            # (futuro)
│   ├── ski-schools/            # (futuro)
│   └── restaurants/            # (futuro)
├── infra/
│   ├── supabase/
│   ├── vercel/
│   └── cloudflare/
├── docs/
└── scripts/
```

## Ruoli e Permessi

- **super_admin**: Globale. Tutto. Gestione piattaforma, billing globale, impersonation.
- **agency_owner**: Gestisce strutture/attività dell'agenzia, portali, sotto-utenti.
- **agency_member**: Operazioni limitate nell'agenzia.
- **owner**: Gestisce la propria struttura/attività.
- **manager**: Gestione operativa senza billing.
- **staff**: Operazioni quotidiane.
- **portal_admin**: Gestisce portale territoriale.

## Multi-Tenant

- Ogni tenant isolato via RLS (Row Level Security) a livello database.
- Le agenzie raggruppano più tenant.
- I portali aggregano tenant di una zona geografica.
- Un tenant non vede MAI dati di un altro.
- Super admin bypassa RLS solo via service_role key lato server.

## Schema Database Core

### tenants
id uuid PK, slug text UNIQUE, name text, type text (hospitality/bike/experience...), status text (active/suspended/trial), agency_id uuid FK agencies, settings jsonb, metadata jsonb, created_at, updated_at.

### agencies
id uuid PK, slug text UNIQUE, name text, status text, settings jsonb, created_at, updated_at.

### profiles (estende auth.users)
id uuid PK FK auth.users, email text, full_name text, avatar_url text, phone text, locale text default 'it', metadata jsonb, created_at, updated_at.

### memberships (utenti → tenant con ruolo)
id uuid PK, user_id FK profiles, tenant_id FK tenants, role text (owner/manager/staff), permissions jsonb, status text, created_at. UNIQUE(user_id, tenant_id).

### agency_memberships
id uuid PK, user_id FK profiles, agency_id FK agencies, role text (agency_owner/agency_member), created_at. UNIQUE(user_id, agency_id).

### portals
id uuid PK, slug text UNIQUE, name text, domain text (custom opzionale), agency_id FK agencies, settings jsonb, seo jsonb, status text, created_at, updated_at.

### portal_tenants
portal_id FK portals, tenant_id FK tenants, sort_order int, featured boolean. PK(portal_id, tenant_id).

### subscriptions
id uuid PK, tenant_id FK, agency_id FK, plan text (free/starter/pro/agency/enterprise), billing_cycle text (monthly/yearly), status text (active/past_due/canceled/trialing), current_period_start/end, stripe_subscription_id, stripe_customer_id, metadata jsonb, created_at, updated_at.

### bookings (primitive condivise)
id uuid PK, tenant_id FK, portal_id FK, vertical text, status text (pending/confirmed/canceled/completed), guest_name, guest_email, guest_phone, check_in date, check_out date, total_amount numeric, currency EUR, commission_amount, commission_rate, notes, vertical_data jsonb (dati specifici verticale), metadata jsonb, source text (direct/portal/widget/api), created_at, updated_at.

### media
id uuid PK, tenant_id FK, filename, original_name, mime_type, size_bytes, r2_key, r2_bucket, url (CDN), alt_text, metadata jsonb, created_at.

### audit_logs
id uuid PK, tenant_id, user_id, action text, entity_type, entity_id, old_data jsonb, new_data jsonb, ip_address inet, user_agent, created_at.

### notifications
id uuid PK, user_id FK, tenant_id, type text, channel text (in_app/email/push), title, body, data jsonb, read_at, sent_at, created_at.

### settings (key-value)
id uuid PK, scope text (global/tenant/agency/portal), scope_id uuid, key text, value jsonb, created_at, updated_at. UNIQUE(scope, scope_id, key).

### integrations
id uuid PK, tenant_id FK, provider text, name text, config jsonb (criptata server-side), status text, last_sync_at, created_at, updated_at.

### invoices
id uuid PK, tenant_id FK, subscription_id FK, type text (subscription/commission), amount, currency EUR, status (draft/open/paid/void), stripe_invoice_id, pdf_url, period_start/end, due_date, paid_at, created_at.

### commission_ledger
id uuid PK, booking_id FK, tenant_id FK, gross_amount, commission_rate, commission_amount, net_amount, stripe_transfer_id, status (pending/transferred/failed), created_at.

## Schema Database Hospitality

### properties
id uuid PK, tenant_id FK, name, slug, description, type text (hotel/b&b/apartment/chalet/camping), stars int, address jsonb (street/city/province/zip/country/lat/lng), contacts jsonb, amenities text[], policies jsonb, seo jsonb, status, sort_order, created_at, updated_at. UNIQUE(tenant_id, slug).

### room_types
id uuid PK, property_id FK, tenant_id FK, name, slug, description, base_occupancy int, max_occupancy int, size_sqm numeric, amenities text[], images uuid[], sort_order, status, created_at, updated_at. UNIQUE(property_id, slug).

### rooms (inventario fisico)
id uuid PK, room_type_id FK, tenant_id FK, name, floor, status (active/maintenance/blocked), notes, created_at.

### rates
id uuid PK, room_type_id FK, tenant_id FK, name, date_from, date_to, price_per_night numeric, min_stay int, max_stay int, cancellation_policy text, meal_plan text, status, created_at, updated_at.

### availability (per room_type, per data)
id uuid PK, room_type_id FK, tenant_id FK, date, total_rooms int, booked_rooms int, blocked_rooms int, price_override numeric, min_stay_override int, status (open/closed/on_request). UNIQUE(room_type_id, date).

### booking_hospitality (estende bookings core)
id uuid PK, booking_id FK bookings, property_id FK, room_type_id FK, room_id FK, guests_adults, guests_children, guests_infants, meal_plan, special_requests, created_at.

### reviews
id uuid PK, property_id FK, tenant_id FK, booking_id FK, guest_name, guest_email, rating numeric CHECK 1-5, title, body, response text, response_at, status (pending/approved/rejected), created_at.

### seasons
id uuid PK, property_id FK, tenant_id FK, name, date_from, date_to, price_modifier numeric (1.2 = +20%), min_stay int, created_at.

## Booking Engine

4 tipologie:
1. **Singolo**: prenota in una singola struttura.
2. **Aggregato portale**: cerca tra tutte le strutture del portale.
3. **Widget embed**: iframe/web component su sito esterno. CSP strict, token dominio, rate limiting per dominio, CORS per domini autorizzati.
4. **API diretta**: REST API per siti custom. API Key hash SHA-256, rate limiting, webhook con firma HMAC-SHA256.

Flusso: cerca disponibilità → calcola prezzo → form prenotazione → validazione server → crea booking pending → pagamento Stripe → conferma → notifiche → audit log.

## Portali Territoriali

Landing page/mini-sito che aggrega strutture di una zona. URL: /portali/[slug] o dominio custom. Pagine: home, lista strutture, dettaglio, ricerca con booking aggregato, mappa. SEO: sitemap dedicata, Schema.org TouristDestination/LodgingBusiness/AggregateRating/Offer, Open Graph, canonical, breadcrumbs.

## Billing

Piani: Free/Trial (€0, 5% commissione), Starter (€29/mese, 3%), Pro (€79/mese, 1.5%), Agency (€199/mese, 1%), Enterprise (custom). Stripe Connect con destination charges. Onboarding KYC gestito da Stripe.

## Sicurezza

- RLS su ogni tabella, test per ogni policy.
- Validazione Zod su ogni input.
- Rate limiting: auth 5/min IP, API pubblica 60/min IP, autenticata 120/min utente, webhook 30/min, widget 100/min dominio.
- Headers: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- Dati sensibili (integrations.config): AES-256-GCM server-side.
- JWT verificati server-side.
- API keys: hash SHA-256, mostrate una sola volta.
- CSRF token per mutazioni.
- Audit log operazioni critiche.
- Server Components di default, Client solo se necessario.
- No secrets client-side MAI.

## Convenzioni Codice

- Cartelle: kebab-case
- File componenti: PascalCase.tsx
- File lib/utils: kebab-case.ts
- Tipi/interfacce: PascalCase
- Costanti: UPPER_SNAKE_CASE
- Funzioni/variabili: camelCase
- Tabelle DB: snake_case
- Commenti in italiano
- Risposta API: { success: true, data: T } o { success: false, error: { code, message, details? } }
- Lista paginata: { success: true, data: T[], meta: { total, page, limit } }

## Milestones Proposti

### M001 — Setup Monorepo + Core Base
Setup pnpm workspaces, Turborepo, config TS/ESLint/Tailwind condivise. Schema DB core con migrazioni. Supabase client. Tipi condivisi.

### M002 — Auth + Multi-Tenant + RBAC
Auth completa (login, registro, password reset, sessioni). Multi-tenant context con RLS. RBAC con middleware permessi. Profili utente.

### M003 — Security Framework + Audit
Rate limiting, CSRF, CSP, sanitize. Headers sicurezza middleware Next.js. Audit log. Encryption dati sensibili.

### M004 — Media + Settings + Notifications
Upload R2, ottimizzazione immagini. Key-value settings. Sistema notifiche email (Resend) + in-app.

### M005 — Billing + Stripe Connect
Stripe subscriptions. Stripe Connect onboarding. Commissioni prenotazioni. Invoices. Commission ledger.

### M006 — Booking Primitives + Portals
Primitive booking (CRUD, status, guest). Primitive portali (CRUD, associazione tenant). SEO base (sitemap, meta, schema.org).

### M007 — Verticale Hospitality: Schema + CRUD
Migrazioni hospitality. CRUD properties, room types, rooms, rates, seasons. Admin UI gestione struttura.

### M008 — Verticale Hospitality: Disponibilità + Booking
Griglia disponibilità. Calcolo prezzi con stagioni. Check disponibilità. Form prenotazione. Flusso completo booking con pagamento.

### M009 — Verticale Hospitality: Pubblico + Reviews
Pagine pubbliche struttura. Gallery, amenities, mappa. Reviews con moderazione. Card struttura per liste.

### M010 — Portali + Booking Aggregato
Pagine portale complete. Booking engine aggregato con filtri. Mappa interattiva. SEO portali.

### M011 — Widget Embed + API Esterna
Widget iframe booking. SDK JavaScript per siti host. API REST per siti custom. Webhook con firma HMAC.

### M012 — Admin Panel + Integrazioni
Super admin panel. Dashboard globale. Gestione tenant/agenzie/portali. Framework integrazioni. iCal sync base.

## Priorità Assolute

1. Sicurezza > Funzionalità
2. Correttezza > Performance
3. Semplicità > Astrazione
4. Tipizzazione > Flessibilità
