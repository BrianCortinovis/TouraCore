# Roadmap Hospitality — Gap Analysis vs Booking/Airbnb/PMS Pro

**Data**: 2026-04-17
**Scope**: colmare gap TouraCore per essere competitivi con Booking.com Extranet, Airbnb Host, Mews, Cloudbeds, Guesty, Lodgify, Smoobu.

---

## Stato attuale TouraCore

Core DB + UI pronto end-to-end: 47 migrations, reservations/bookings dual-model, rooms/room-types/properties, rate plans+seasonal+dynamic pricing 6 rules, channel_manager schema, guests CRM completo, Stripe Connect+invoices+SDI, message templates 10 trigger, tourist tax+Alloggiati Web DB, housekeeping tasks, upsell catalog, agency multi-tenant.

**Gap**: integrazioni HTTP esterne (OTA API, identity, locks, competitor), UI guest-facing (portal, mobile), analytics dashboard real-time, reviews system assente, compliance IT avanzata incompleta, RBAC enforcement.

---

## 🔴 CRITICO — Table Stakes Mancanti

### 1. Channel Manager reale
- Booking.com Connectivity API (availability/rates push, reservations pull)
- Airbnb Host API integration
- Expedia PartnerCentral
- iCal sync bidirezionale (import + export)
- Cron auto-sync + overbooking conflict resolution
- **DB**: pronto (`channel_connections`, `channel_room_mappings`, `channel_sync_logs`)
- **Manca**: SDK/HTTP client, webhook handlers reali, cron worker

### 2. Booking Engine pubblico completo
- Calendar availability UI con prezzi live per date range
- Rate comparison multi-room
- Search disponibilità per date/ospiti/pax
- Checkout flow con Stripe PaymentIntent + 3DS
- iCal pubblico per property
- **Esiste**: widget base `/book/[slug]`
- **Manca**: calendar component, availability query real-time, checkout flow

### 3. Inbox unificata 2-way
- Thread guest↔host aggregato
- Integrazione Booking messages API, Airbnb messages, email inbound, WhatsApp Business
- Quick replies + template insertion
- Guest communication history timeline
- **Esiste**: `message_templates`, `sent_messages` (outbound)
- **Manca**: `message_threads`, `inbound_messages`, polling/webhook inbound

### 4. Reviews management (ZERO attuale)
- Tabelle: `reviews`, `review_responses`, `review_sources` (google/tripadvisor/booking/airbnb)
- Aggregator multi-platform via API/scraping
- Reply UI host + template
- Sentiment analysis
- Auto-request post-stay (trigger template `post_stay` già c'è)
- **Manca tutto**

### 5. Compliance IT avanzata
- **CIN/CIR** (obbligo 2025, sanzioni €800-8K): registro regionale + annuncio
- **ISTAT** report mensili automatici (movimenti, arrivi/presenze per provenienza)
- **Alloggiati Web** HTTP client PS.it (DB ready, no client)
- Ricevuta fiscale cedolare secca auto-calc + export
- **Esiste**: `police_registrations`, `tourist_tax_records`, `v_reservation_financials`
- **Manca**: CIN fields su accommodations, ISTAT export, HTTP clients

---

## 🟡 COMPETITIVI — Should-Have

### 6. Analytics dashboard real-time
- Occupancy rate, ADR, RevPAR charts (giornaliero/settimanale/mensile)
- Source mix funnel, lead time distribution
- Forecasting 30/60/90gg
- Pace report vs last year
- Cross-property rollup chain
- **Esiste**: revenue dashboard stub, `v_reservation_financials`
- **Manca**: views aggregate, chart UI, forecasting logic

### 7. Housekeeping ops avanzate
- Checklist templates pre-built per room_type
- Auto-assign post-checkout trigger
- Maintenance ticket system (ZERO)
- Equipment/supply inventory tracking
- **Esiste**: `housekeeping_tasks` con checklist JSONB
- **Manca**: `maintenance_tickets`, `supplies`, trigger automation

### 8. Upsell orders end-to-end
- Tabella `upsell_orders` + link `reservation_id`
- UI guest portal per ordinare
- Revenue report per categoria
- Inventory limits enforcement runtime
- **Esiste**: `upsell_offers` catalog
- **Manca**: orders table, UI guest, report

### 9. Online check-in + keyless
- Smart lock integration: Nuki, TTLock, Igloohome
- PIN codes auto-generati per reservation
- Identity verification: Stripe Identity / Jumio / Onfido
- **Esiste**: `checkin_tokens`, self check-in flow DB
- **Manca**: lock provider clients, identity SDK

### 10. Promotions engine
- Genius / Early Booker / Last Minute / Weekly / Monthly / Mobile / Country rate
- Promo codes (alphanumeric, usage limits, expiry)
- Stacking rules
- **Esiste**: `rate_plans` tipi (non_refundable, last_minute, early_bird)
- **Manca**: `promotions`, `promo_codes`, application engine

### 11. Dynamic pricing AI
- Competitor scraping (PriceLabs-style)
- Demand forecasting ML (historical + events + weather)
- Auto-apply suggestions con override manuale
- **Esiste**: 6 pricing rules manuali, `revenue` action
- **Manca**: scraper, ML model, auto-apply toggle

### 12. Payment avanzato
- Installment plans (split in N rate)
- Split payment group booking (per guest)
- Automated dunning (payment reminders cadenza)
- Pre-auth cards (manual capture)
- Payment links one-off
- **Esiste**: `payments`, `invoices`, Stripe Connect
- **Manca**: `installments`, dunning cron, pre-auth flow

### 13. RBAC enforcement
- Permission check runtime per resource+action
- Delegation/impersonation
- Audit trail completo (`audit_logs` table)
- **Esiste**: `memberships.permissions` JSONB, `staff_members.permissions`
- **Manca**: middleware check, audit trail table

---

## 🟢 DIFFERENZIATORI — Nice-to-Have

### 14. Guest portal post-booking
- Web app con: info stay, check-in, upsells, WiFi, guide città, contatto host, room controls
- Branded per property/agency
- **Manca**: app intera

### 15. Mobile app guest white-label
- iOS + Android (React Native / Expo)
- Messaging, check-in, upsells, room controls
- **Manca tutto**

### 16. Email marketing automation
- Campagne segmentate past guests (compleanno, stagionale, fedeltà)
- Template builder + A/B test
- Drive direct repeat booking
- **Manca**: `campaigns`, `campaign_sends`, segmentation engine

### 17. Accounting integration
- Export Xero, QuickBooks, Fattura24, TeamSystem
- Sync automatico fatture + pagamenti
- **Manca**: connector per provider

### 18. POS integration F&B/spa
- Cassa ristorante/bar/spa con addebito folio camera
- Inventory F&B, treatment scheduling
- **Manca**: modulo POS intero

### 19. Revenue Management AI enterprise
- Previsione domanda ML multi-variata (Duetto-tier)
- Ottimizzazione prezzi cross-property
- **Manca**: ML infra

### 20. Reputation AI
- Sentiment analysis multi-lingua
- Reply templates AI-generated
- Alert negative review
- **Manca**: integration LLM

### 21. AI guidebook auto-gen
- Guide locali personalizzate per property location
- Place recommendations (OpenAI + Google Places)
- **Manca tutto**

### 22. Multi-currency + multi-language
- EUR/USD/GBP/CHF conversion + display
- UI i18n: IT/EN/DE/FR/ES minimum
- **Esiste**: currency field su invoices
- **Manca**: i18n framework, FX rate updater, localized templates

### 23. Marketplace app third-party
- Store app stile Shopify
- API SDK partner
- Revenue share
- **Manca tutto**

---

## Roadmap Sprint

**Sprint 1 — Compliance+Pagamenti real** (2-3 sett)
- CIN/CIR fields + validation
- ISTAT report export (CSV/XML)
- Alloggiati Web HTTP client (PS.it submission)
- SDI flow completo end-to-end
- Installment plans

**Sprint 2 — Channel+Engine** (3-4 sett)
- Booking.com Connectivity API
- Airbnb Host API
- iCal bidirezionale
- Booking engine pubblico: calendar + checkout + Stripe

**Sprint 3 — Inbox+Reviews** (2-3 sett)
- 2-way messaging thread aggregato
- Review system (schema + aggregator + reply UI)
- Auto-request post-stay
- Guest portal base

**Sprint 4 — Analytics+Ops** (2-3 sett)
- Dashboard occupancy/ADR/RevPAR
- Forecasting 30/60/90gg
- Maintenance tickets
- Housekeeping auto-assign + templates

**Sprint 5 — Pricing+Upsell** (2-3 sett)
- Competitor scraping
- Promo engine + codes
- Upsell orders end-to-end + UI guest
- Keyless locks (Nuki/TTLock)

**Sprint 6 — Differenziatori** (4-6 sett)
- Mobile app guest
- AI reputation + guidebook
- Accounting export (Xero/Fattura24)
- Multi-currency + i18n
- Marketplace foundations
