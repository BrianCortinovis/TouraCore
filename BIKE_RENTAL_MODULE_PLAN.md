# TouraCore — Modulo Bike / E-Bike Rental

Progetto tecnico modulo noleggio bici / e-bike enterprise, integrato in suite multi-vertical (hospitality + restaurant + bike) con core unico.

**Stato core**: 92 migrations, entity abstraction stabile, `bike_rental` già presente in `ENTITY_KINDS` enum (slot pre-allocato). Unified booking engine + fiscal + pricing + listings già multi-vertical ready.

**Benchmark competitor**: bike.rent Manager, Booqable, Rentrax, Jugnoo, Twice Commerce, BikeSquare, SpinLister, Sharefox, Checkfront, Bókun.

---

## 1. Scope funzionale (pari o sopra top competitor)

### 1.1 Inventory fleet mgmt
- Per-bike serial tracking (non solo per-type pool) — barcode/QR
- Modelli: road, gravel, mtb, e-mtb, e-city, e-cargo, folding, kids, tandem, handbike
- Foto, numero seriale, telaio, stato condizione (new/good/fair/damaged/retired)
- Multi-location fleet (più depositi per tenant, assegnazione bike→depot)
- Maintenance log: km percorsi, cicli batteria, revisioni, costi ricambi, prossima manutenzione
- **E-bike specific**: % carica al checkout/return, ciclo batteria, health %, slot ricarica, pianificatore swap batteria
- Fleet calendar: down-time (manutenzione programmata) blocca booking
- Utilization dashboard: % usage per bike, revenue per bike, ROI payback
- GPS tracking (opzionale, integrazione IoT)

### 1.2 Booking engine
- Slot-based su ore (non solo giornate): 1h / 2h / 4h / half-day / full-day / multi-day / weekly
- Pickup/return time precisi (non solo date)
- Multi-location: pickup depot A → return depot B (one-way fee calcolato per distanza)
- Disponibilità real-time per tipo e per serial
- Waitlist automatica se tipo esaurito
- Auto-assign serial su tipo (FIFO rotation per equalizzare usura) o manual pick da admin
- Group booking (famiglia, gruppo organizzato): cart multi-bike con sconto scala
- Prenotazione con delivery (consegna hotel/albergo) o pickup al depot
- Buffer time configurabile tra prenotazioni (cleanup + charge)
- Guest data capture: altezza, taglia, esperienza, peso (per size suggestion automatica)

### 1.3 Pricing engine avanzato
- Base hourly/daily/weekly rate per tipo
- Tier durata automatici (4h = giornata / 3d = week discount)
- Seasonal rules (alta/bassa stagione, festività, weekend)
- Peak hours (9-17 +15%, 17-22 -10%)
- Dynamic surge pricing (demand-based, Jugnoo style) — richiede pricing engine esteso
- Multi-day package discount scala (3d −10%, 7d −20%, 14d −30%)
- Group discount (3+ bike, 5+, 10+)
- Loyalty/repeat customer pricing
- One-way fee (pickup ≠ return) = base + km distanza
- Promo codes, early-bird, last-minute
- Insurance pricing come add-on % del valore bike
- Deposito cauzionale pre-auth Stripe (hold, no capture)

### 1.4 Add-ons + bundles
- Casco (obbligatorio minorenni), lucchetto, seggiolino bambino, carrello, borse laterali, rack auto, GPS device, kit riparazione, impermeabile, occhiali
- Bundle: "Family pack" (2 adulti + 2 kids bikes + 2 seggiolini + 4 caschi), "Tour pack" (bike + GPS + mappa + snack)
- Guided tour add-on (bike + guida + mezza giornata pacchetto)
- Delivery/pickup fee configurabile per distanza
- Insurance tier: basic (furto), premium (furto+danni+RC)

### 1.5 Rental agreement + compliance
- Contratto digitale firmato in app (e-signature touch/mouse)
- Scan documento identità (OCR opzionale, KYC light)
- Age verification (≥18 minorenni con tutore)
- T&C PDF multi-lingua, versionato
- Liberatoria responsabilità, informativa rischi
- Privacy GDPR consent granulare (marketing opt-in separato)
- Deposito cauzionale pre-autorizzato carta (Stripe hold)
- Policy noleggio: cancel, no-show, ritardo restituzione (late fee)

### 1.6 Check-in / check-out ops
- Admin app mobile (bike shop staff): scan QR → apri noleggio → scan bike serial → pre-check foto (condizione + % batteria e-bike) → firma contratto → consegna
- Self-checkin guest (opzionale, smart lock integration): link SMS → verifica ID → unlock bike via app
- Return: scan QR → foto post (damage scan) → verifica integrità → rilascio deposito o addebito danni → scontrino/fattura
- Damage workflow: foto danno → classificazione (estetico/funzionale/grave) → preventivo automatico da listino → claim a insurance partner se premium
- Late return: alert automatico SMS cliente + cron late fee calcolo

### 1.7 Portale guest self-service
- Profilo cliente: storico noleggi, punti loyalty, preferenze (altezza/taglia salvate)
- Booking management: modifica/cancella, contatta staff
- E-signature rental agreement pre-pickup (velocizza consegna)
- Photo upload pre-return (optional self-check-in)
- Review post-return

### 1.8 Route / tour integration
- Libreria route GPX cross-tenant (importabili da Komoot, Strava, Wikiloc)
- Suggested itineraries per tipo bike (e-bike = lunghe / mtb = trail)
- Route difficulty (easy/medium/hard/expert)
- POI lungo percorso (bar, ristoranti, punti panoramici) — se ristorante stesso tenant link diretto cross-sell
- Print-friendly PDF mappa
- Integrazione meteo lungo route
- Ride history cliente (se GPS device rilasciato con bike)

### 1.9 Marketing + distribuzione
- Booking widget embeddable (riuso portals existing)
- Listing pubblico `/s/[t]/[e]` con BikeRentalTemplate + JSON-LD (Product/Service/LocalBusiness)
- Aggregatore `/discover?kind=bike_rental` filtri città/tipo/prezzo/data
- **Channel manager + OTA** (Phase 2, dettaglio in sezione 16): hub Bókun/Rezdy/Regiondo + direct GetYourGuide/Viator/FareHarbor + OCTO server-side + bike-pure Bikesbooking/ListNRide + route-cross Komoot/BikeMap + long-tail Klook/Musement/Tiqets/Civitatis
- Cross-sell hospitality: hotel stesso tenant suggerisce bike rental, pacchetto "stay+ride"
- Cross-sell restaurant: percorso bike termina a ristorante gruppo (dinner bundle)
- Email/SMS campagne: reminder pickup, sconto stagionale, post-ride review
- Google Maps / Apple Maps claiming

### 1.10 CRM noleggio
- Guest unificato tabella `guests` comune con hospitality/restaurant
- Storico: numero noleggi, km totali, spesa totale, preferred bike type
- Segment: occasionale / frequent / pro (ciclista serio)
- Note staff private (es. "danneggia spesso, deposito maggiorato")
- Blacklist/whitelist

### 1.11 Staff + turni
- Ruoli: mechanic, rental desk, tour guide, delivery driver
- Shift scheduling (riuso staff engine restaurant)
- Clock in/out, ore lavorate
- Commissioni upsell (insurance premium, add-on)

### 1.12 Analytics enterprise
- Utilization % per bike / per tipo / per location / per periodo
- Revenue per bike (RevPAB = revenue per available bike-day)
- Downtime analysis (manutenzione + damaged)
- Maintenance cost per bike → TCO → ROI payback calculator
- Damage claim rate + insurance payout ratio
- No-show rate, late return rate
- Average rental duration, average party size
- Forecast domanda AI (weather + event locali + storico)
- Route popolarità (se GPS integrato)

### 1.13 Compliance IT
- **Fatturazione Italia**: Prestazione Occasionale privato / SDI XML business (riuso @touracore/fiscal)
- **RT scontrino** ADE se corrispettivi abilitati
- **Sicurezza**: registro noleggi con ID cliente (obbligo autorità in alcune città/eventi)
- **Assicurazione RC** operatore noleggio (vincolo legale)
- **Codice della Strada**: casco obbligatorio minorenni su e-bike >25km/h
- **Registro manutenzione** HACCP-style se previsto da regolamento comunale

---

## 2. Architettura DB

**Migrations** (continua da 00092): 00093 → 00098

### 00093 — bike_rental entities core
```sql
CREATE TABLE public.bike_rentals (
  id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  bike_types TEXT[] NOT NULL DEFAULT '{}',   -- road, mtb, ebike, ecity, ecargo, folding, kids, tandem, handbike
  capacity_total INT NOT NULL DEFAULT 0,
  avg_rental_hours INT NOT NULL DEFAULT 4,
  address TEXT, city TEXT, zip TEXT, country TEXT DEFAULT 'IT',
  latitude NUMERIC, longitude NUMERIC,
  opening_hours JSONB DEFAULT '{}',
  buffer_minutes INT DEFAULT 15,
  deposit_policy JSONB DEFAULT '{}',        -- {mode: 'preauth'|'cash'|'card_hold', amount_per_bike, per_type}
  cancellation_policy JSONB DEFAULT '{}',
  late_fee_policy JSONB DEFAULT '{}',       -- {per_hour: 10, grace_minutes: 15}
  insurance_config JSONB DEFAULT '{}',      -- {tiers: [{name, price, coverage}]}
  rental_agreement_md TEXT,                 -- template versionato
  agreement_version INT DEFAULT 1,
  delivery_config JSONB DEFAULT '{}',       -- {enabled, max_km, price_per_km}
  one_way_config JSONB DEFAULT '{}',        -- {enabled, base_fee, per_km}
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: tenant isolation, +agency override, +super_admin
```

### 00094 — bike fleet (per-unit)
```sql
CREATE TABLE public.bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  location_id UUID REFERENCES public.bike_locations(id),  -- multi-depot
  name TEXT NOT NULL,                     -- "eBike Red #3"
  bike_type TEXT NOT NULL,                -- ebike, mtb, road...
  brand TEXT, model TEXT, year INT,
  serial_number TEXT UNIQUE,
  frame_size TEXT,                        -- S/M/L/XL or 48/52/56/60
  wheel_size TEXT,                        -- 26/27.5/28/29
  color TEXT,
  purchase_price NUMERIC(10,2),
  purchase_date DATE,
  insurance_value NUMERIC(10,2),
  -- E-bike specific
  is_electric BOOLEAN DEFAULT FALSE,
  battery_capacity_wh INT,
  battery_cycles INT DEFAULT 0,
  battery_health_pct INT DEFAULT 100,
  last_charge_pct INT,
  last_charged_at TIMESTAMPTZ,
  motor_brand TEXT,                       -- Bosch, Shimano, Yamaha...
  -- Stato
  status TEXT DEFAULT 'available' CHECK (status IN ('available','rented','maintenance','damaged','charging','retired','lost')),
  condition_grade TEXT DEFAULT 'A' CHECK (condition_grade IN ('A','B','C','D')),
  total_km NUMERIC(10,2) DEFAULT 0,
  last_maintenance_at TIMESTAMPTZ,
  next_maintenance_at TIMESTAMPTZ,
  maintenance_notes TEXT,
  gps_device_id TEXT,                     -- se integrato IoT
  photos TEXT[] DEFAULT '{}',
  qr_code TEXT UNIQUE,                    -- per scan fast check-in
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bike_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,                     -- "Depot Centro", "Depot Lungolago"
  address TEXT,
  latitude NUMERIC, longitude NUMERIC,
  opening_hours JSONB,
  is_pickup BOOLEAN DEFAULT TRUE,
  is_return BOOLEAN DEFAULT TRUE,
  capacity INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 00095 — bike_rental_reservations
```sql
CREATE TABLE public.bike_rental_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  reference_code TEXT UNIQUE NOT NULL,    -- BK-2026-00001
  guest_id UUID REFERENCES public.guests(id),
  guest_name TEXT, guest_email TEXT, guest_phone TEXT,
  guest_document_type TEXT, guest_document_number TEXT,  -- ID scan
  guest_height_cm INT, guest_weight_kg INT, guest_experience TEXT,
  -- Tempi
  rental_start TIMESTAMPTZ NOT NULL,
  rental_end TIMESTAMPTZ NOT NULL,
  actual_pickup_at TIMESTAMPTZ,
  actual_return_at TIMESTAMPTZ,
  duration_hours NUMERIC(6,2) GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (rental_end - rental_start)) / 3600
  ) STORED,
  -- Location
  pickup_location_id UUID REFERENCES public.bike_locations(id),
  return_location_id UUID REFERENCES public.bike_locations(id),
  is_one_way BOOLEAN GENERATED ALWAYS AS (pickup_location_id IS DISTINCT FROM return_location_id) STORED,
  delivery_address TEXT,                  -- se delivery
  delivery_km NUMERIC(6,2),
  -- Pricing
  subtotal NUMERIC(12,2) DEFAULT 0,
  addons_total NUMERIC(12,2) DEFAULT 0,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  one_way_fee NUMERIC(10,2) DEFAULT 0,
  discount NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL,
  paid_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_payment_intent TEXT,             -- Stripe PaymentIntent preauth
  deposit_released_at TIMESTAMPTZ,
  deposit_captured_amount NUMERIC(10,2) DEFAULT 0,
  insurance_tier TEXT,
  -- Stato
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','checked_in','active','returned','cancelled','no_show','late','completed')),
  agreement_signed_at TIMESTAMPTZ,
  agreement_signature_data JSONB,          -- {url, version, ip, timestamp}
  -- Return / damage
  damage_report JSONB,                     -- {items: [...], photos: [...]}
  damage_cost_total NUMERIC(10,2) DEFAULT 0,
  late_fee NUMERIC(10,2) DEFAULT 0,
  insurance_claim_id TEXT,
  -- Source
  source TEXT DEFAULT 'direct',            -- direct, widget, ota_gyg, ota_viator...
  channel_booking_ref TEXT,
  notes_internal TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bike_rental_reservation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.bike_rental_reservations(id) ON DELETE CASCADE,
  bike_id UUID REFERENCES public.bikes(id),    -- assegnato al pickup
  bike_type TEXT NOT NULL,                     -- tipo prenotato (anche se serial non ancora assegnato)
  frame_size TEXT,
  rider_name TEXT,                             -- per group booking multi-bike
  rider_height_cm INT, rider_experience TEXT,
  base_price NUMERIC(10,2),
  discount NUMERIC(10,2) DEFAULT 0,
  line_total NUMERIC(10,2),
  pickup_photos TEXT[], return_photos TEXT[],
  pickup_battery_pct INT, return_battery_pct INT,
  pickup_km NUMERIC(8,2), return_km NUMERIC(8,2),
  condition_at_pickup TEXT, condition_at_return TEXT,
  damage_noted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bike_rental_reservation_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.bike_rental_reservations(id) ON DELETE CASCADE,
  addon_key TEXT NOT NULL,                -- helmet, lock, child_seat, gps, insurance_premium...
  quantity INT DEFAULT 1,
  unit_price NUMERIC(10,2),
  line_total NUMERIC(10,2)
);
```

### 00096 — pricing + add-ons catalog
```sql
CREATE TABLE public.bike_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  type_key TEXT NOT NULL,                 -- ebike, mtb, road...
  display_name TEXT NOT NULL,
  description TEXT,
  photo TEXT,
  hourly_rate NUMERIC(10,2),
  half_day_rate NUMERIC(10,2),
  daily_rate NUMERIC(10,2),
  weekly_rate NUMERIC(10,2),
  deposit_amount NUMERIC(10,2),
  age_min INT, age_max INT,
  height_min INT, height_max INT,
  active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  UNIQUE (bike_rental_id, type_key)
);

CREATE TABLE public.bike_rental_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  addon_key TEXT NOT NULL,                -- helmet, lock, child_seat, gps, insurance_basic, insurance_premium
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT,                          -- safety, comfort, navigation, insurance
  pricing_mode TEXT DEFAULT 'per_rental' CHECK (pricing_mode IN ('per_rental','per_day','per_hour','per_bike','percent_of_total')),
  unit_price NUMERIC(10,2),
  mandatory_for TEXT[],                   -- ['minor','ebike_over_25kmh']
  stock_total INT,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (bike_rental_id, addon_key)
);

CREATE TABLE public.bike_rental_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  rule_name TEXT,
  rule_type TEXT,                         -- seasonal, day_of_week, time_of_day, duration_tier, group_size, surge, promo
  applies_to TEXT[],                      -- ['bike','ebike'] or type_key list
  config JSONB,                           -- {start_date, end_date, weekdays, time_range, min_qty, discount...}
  adjustment_type TEXT,                   -- percent, amount
  adjustment_value NUMERIC(10,2),
  priority INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  valid_from DATE, valid_to DATE
);
```

### 00097 — maintenance + damage tracking
```sql
CREATE TABLE public.bike_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id UUID NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  type TEXT,                              -- scheduled, repair, damage_fix, battery_swap, tire, brake
  performed_at TIMESTAMPTZ,
  performed_by TEXT,
  km_at_service NUMERIC(10,2),
  cost NUMERIC(10,2),
  parts JSONB,
  notes TEXT,
  next_due_at TIMESTAMPTZ,
  next_due_km NUMERIC(10,2),
  photos TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.bike_damage_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.bike_rental_reservations(id),
  bike_id UUID REFERENCES public.bikes(id),
  tenant_id UUID NOT NULL,
  claim_code TEXT UNIQUE,
  damage_type TEXT,                       -- cosmetic, mechanical, major, lost, stolen
  severity TEXT,                          -- low, medium, high, critical
  description TEXT,
  photos TEXT[],
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  charged_to_deposit NUMERIC(10,2),
  insurance_covered NUMERIC(10,2),
  insurance_provider TEXT,
  insurance_claim_ref TEXT,
  status TEXT DEFAULT 'pending',          -- pending, assessed, charged, resolved, disputed
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 00098 — public views + JSON-LD
```sql
CREATE VIEW public.bike_rental_public_details AS
SELECT
  br.id, br.bike_types, br.capacity_total, br.address, br.city,
  br.latitude, br.longitude, br.opening_hours,
  br.delivery_config, br.one_way_config
FROM public.bike_rentals br
JOIN public.public_listings pl ON pl.entity_id = br.id AND pl.is_public = TRUE;

-- Types + addons views
CREATE VIEW public.bike_types_public AS
SELECT bt.* FROM public.bike_types bt
JOIN public.public_listings pl ON pl.entity_id = bt.bike_rental_id AND pl.is_public = TRUE
WHERE bt.active = TRUE;

GRANT SELECT ON public.bike_rental_public_details, public.bike_types_public TO anon, authenticated;
```

### 00099 — channel manager OTA distribution
```sql
-- Connessioni channel manager per bike rental (stesso pattern Octorate hospitality)
CREATE TABLE public.bike_channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_rental_id UUID NOT NULL REFERENCES public.bike_rentals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL,                    -- bokun, rezdy, octo_ventrata, getyourguide, viator, fareharbor, checkfront, regiondo, listnride, civitatis, klook, musement, tiqets, headout, bikesbooking
  provider_product_id TEXT,                  -- ID esterno prodotto/experience
  provider_supplier_id TEXT,
  provider_api_key_ref UUID REFERENCES public.integration_credentials(id),
  integration_mode TEXT DEFAULT 'push_pull' CHECK (integration_mode IN ('push_pull','webhook','polling','passive')),
  sync_enabled BOOLEAN DEFAULT FALSE,
  commission_rate NUMERIC(5,2),              -- % commissione OTA (per report netto)
  commission_included_in_price BOOLEAN DEFAULT FALSE,
  pricing_strategy TEXT DEFAULT 'parity' CHECK (pricing_strategy IN ('parity','markup','markdown','custom')),
  pricing_adjustment NUMERIC(5,2) DEFAULT 0, -- % da applicare a rate standard
  currency TEXT DEFAULT 'EUR',
  cutoff_minutes INT DEFAULT 60,             -- anticipo minimo booking ammesso
  last_availability_push_at TIMESTAMPTZ,
  last_booking_pull_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  settings JSONB DEFAULT '{}',               -- provider-specific config
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (bike_rental_id, provider, provider_product_id)
);

-- Mapping bike_type interno → product esterno OTA (ogni OTA vuole suo SKU)
CREATE TABLE public.bike_channel_product_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.bike_channel_connections(id) ON DELETE CASCADE,
  bike_type_id UUID NOT NULL REFERENCES public.bike_types(id) ON DELETE CASCADE,
  external_product_id TEXT NOT NULL,
  external_rate_plan_id TEXT,
  external_product_name TEXT,
  inventory_allocation INT,                  -- quante bikes dedicare a canale (yield mgmt)
  rate_override NUMERIC(10,2),               -- override rate su canale (se pricing strategy=custom)
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (connection_id, bike_type_id)
);

-- Bookings ricevuti da OTA (import inbound)
CREATE TABLE public.bike_channel_bookings_inbound (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES public.bike_channel_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  provider TEXT NOT NULL,
  external_booking_ref TEXT NOT NULL,        -- BKN-ABC123, GYG-xxx
  raw_payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','mapped','converted','failed','cancelled','dedup_skipped')),
  reservation_id UUID REFERENCES public.bike_rental_reservations(id),  -- popolato dopo conversione
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  UNIQUE (provider, external_booking_ref)
);

-- Log sync operations (troubleshooting + audit)
CREATE TABLE public.bike_channel_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  connection_id UUID REFERENCES public.bike_channel_connections(id) ON DELETE CASCADE,
  tenant_id UUID,
  operation TEXT NOT NULL,                   -- availability_push, pricing_push, booking_pull, booking_ack, cancel_push, webhook_recv
  direction TEXT CHECK (direction IN ('outbound','inbound')),
  http_status INT,
  success BOOLEAN,
  request_summary JSONB,
  response_summary JSONB,
  error_message TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Riuso bike_rental_reservations: aggiungi solo channel_booking_ref già previsto + campi commissione
ALTER TABLE public.bike_rental_reservations
  ADD COLUMN IF NOT EXISTS channel_connection_id UUID REFERENCES public.bike_channel_connections(id),
  ADD COLUMN IF NOT EXISTS channel_commission_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS channel_net_amount NUMERIC(12,2);

CREATE INDEX idx_bike_channel_conn_tenant ON public.bike_channel_connections(tenant_id, sync_enabled);
CREATE INDEX idx_bike_channel_inbound_status ON public.bike_channel_bookings_inbound(status, received_at);
CREATE INDEX idx_bike_channel_sync_logs_conn ON public.bike_channel_sync_logs(connection_id, created_at DESC);

-- RLS tenant isolation standard (policy identiche pattern 00043 integrations)
```

---

## 3. Package vertical `@touracore/bike-rental`

Struttura parallela a `verticals/hospitality/` e `verticals/restaurant/`:

```
verticals/bike-rental/
├── package.json                     @touracore/bike-rental
├── src/
│   ├── index.ts                     barrel export
│   ├── constants.ts                 BIKE_TYPES, ADDON_KEYS, INSURANCE_TIERS
│   ├── types/
│   │   ├── database.ts              BikeRow, ReservationRow, AddonRow, ...
│   │   └── domain.ts                BikeType, RentalStatus, DamageSeverity
│   ├── config/
│   │   ├── bike-types.ts            enum + display_name + icon + age/height limits
│   │   ├── addons.ts                default catalog
│   │   ├── rental-policies.ts       cancel, late-fee, deposit defaults
│   │   ├── fiscal-rules.ts          IVA noleggio IT 22% / prestazione occasionale
│   │   ├── insurance-tiers.ts       basic / standard / premium
│   │   └── index.ts
│   ├── queries/
│   │   ├── reservations.ts          create/get/list/update/cancel
│   │   ├── availability.ts          available bikes in range, double-book check
│   │   ├── bikes.ts                 inventory CRUD, status transitions
│   │   ├── pricing.ts               quote engine (base+rules+addons+deposit+one-way)
│   │   ├── addons.ts                catalog CRUD
│   │   ├── maintenance.ts           log CRUD, scheduler
│   │   ├── damage.ts                claim CRUD, insurance workflow
│   │   ├── reports.ts               utilization, revenue-per-bike, damage-rate
│   │   ├── locations.ts             multi-depot
│   │   └── index.ts
│   ├── components/
│   │   ├── booking/
│   │   │   ├── BikeTypeSelector.tsx
│   │   │   ├── DurationPicker.tsx          hour/half/day/week
│   │   │   ├── TimeSlotCalendar.tsx        slot-based
│   │   │   ├── AddonPicker.tsx
│   │   │   ├── InsuranceChoice.tsx
│   │   │   ├── RiderDetails.tsx            height/age/experience
│   │   │   ├── MultiRiderCart.tsx          group booking
│   │   │   └── BookingFlow.tsx             orchestrator
│   │   ├── operations/
│   │   │   ├── CheckInScreen.tsx           scan QR + bike assign + photo + sign
│   │   │   ├── CheckOutScreen.tsx          return + photo + damage + release deposit
│   │   │   ├── DamageReporter.tsx
│   │   │   ├── AgreementSigner.tsx         e-signature canvas
│   │   │   └── FleetMap.tsx                availability per location
│   │   ├── admin/
│   │   │   ├── BikeList.tsx
│   │   │   ├── BikeForm.tsx
│   │   │   ├── MaintenanceLog.tsx
│   │   │   ├── UtilizationDashboard.tsx
│   │   │   ├── RevenuePerBikeChart.tsx
│   │   │   └── DamageClaimsList.tsx
│   │   └── public/
│   │       ├── BikeRentalTemplate.tsx      per /s/[t]/[e]
│   │       └── BikeRentalCard.tsx          per /discover
│   ├── auth/
│   │   └── access.ts
│   ├── actions/
│   │   ├── create-reservation.ts
│   │   ├── check-in.ts
│   │   ├── check-out.ts
│   │   ├── report-damage.ts
│   │   ├── process-deposit.ts
│   │   └── index.ts
│   ├── stores/
│   │   ├── booking-store.ts                Zustand cart
│   │   └── check-in-store.ts
│   ├── compliance/
│   │   ├── rental-agreement-generator.ts
│   │   ├── id-verification.ts
│   │   └── age-check.ts
│   └── stubs/
│       ├── ourania-client.ts               bike rental management
│       ├── komoot-routes.ts                route library
│       └── insurance-partner.ts
```

---

## 4. Integrazioni core riusate

| Pezzo core | Uso bike rental |
|---|---|
| `@touracore/pricing` | quote hourly/daily/weekly + rules seasonal/peak/surge/group |
| `@touracore/fiscal` | emitter router (Prestazione Occasionale / SDI / RT) — già multi-vertical |
| `@touracore/listings` | BikeRentalTemplate + JSON-LD + amenities bike-specific |
| `@touracore/booking` | unified cart + multi-vertical checkout `/book/tenant/{slug}` |
| `@touracore/integrations` | provider registry + credenziali scoped (Ourania, Stripe, Komoot) |
| `@touracore/notifications` | email/SMS reminder pickup, return, late fee |
| `@touracore/media` | foto bike + foto danno + signature canvas upload |
| `@touracore/portals` | widget embeddable + guest portal self-service |
| `@touracore/channels` | Phase 2 OTA adapters (GYG, Viator) |
| `@touracore/audit` | traccia stato reservation + fleet |
| `@touracore/seo` | schema.org RentalCarReservation-like / Product + LocalBusiness |

---

## 5. Routes Next.js

**Public**:
- `/s/[tenantSlug]/[entitySlug]` — BikeRentalTemplate auto-compiled (SSR+ISR)
- `/book/tenant/{slug}` — cart unified, add bike rental product
- `/book/bike/[slug]` — landing dedicato con calendar hour-based
- `/discover?kind=bike_rental&city=...` — aggregatore filtri tipo/prezzo/data/location
- `/embed/listing?entityId=...&kind=bike_rental` — iframe embeddable
- `/u/[username]` — homepage personalizzabile mostra bike rentals del profilo

**Admin dashboard** `/dashboard/bike-rentals/`:
- `/` — overview KPI (utilization, revenue, pending pickups today)
- `/[brId]/fleet` — lista bike, add/edit, assign location, manutenzione
- `/[brId]/fleet/[bikeId]` — detail + history + maintenance + damage + utilization
- `/[brId]/reservations` — calendar Gantt + list + filters
- `/[brId]/reservations/[resId]` — detail + check-in/out actions
- `/[brId]/check-in` — scan QR mode (mobile-friendly)
- `/[brId]/check-out` — scan QR mode (return flow)
- `/[brId]/types` — catalogo tipi bike + rates
- `/[brId]/addons` — catalogo add-ons
- `/[brId]/pricing-rules` — rules engine UI
- `/[brId]/locations` — multi-depot CRUD
- `/[brId]/damage-claims` — workflow claim
- `/[brId]/maintenance` — log + scheduler
- `/[brId]/reports/utilization` — % usage per bike
- `/[brId]/reports/revenue` — RevPAB, per type, per period
- `/[brId]/reports/damage` — tasso, costo medio
- `/[brId]/settings` — policy, deposit, agreement template

**Guest portal** `/guest/bike/[reservationCode]`:
- pre-sign agreement
- upload ID
- booking details + modify
- post-return review

---

## 6. Booking flow unified engine

Adapter in `verticals/bike-rental/src/components/booking/`:

```typescript
// BookingFlowAdapter signature già definito
export function createBikeRentalAdapter(opts): BookingFlowAdapter {
  return {
    async searchAvailability({ entityId, start, end, partySize, preferences }) {
      // 1. fetch bike_types attivi
      // 2. per ogni tipo count bikes non occupati in range (no overlap reservations)
      // 3. applica pricing engine (base + rules)
      // 4. filtro per height/age requirements
      return BikeAvailabilityResult[]
    },
    async quote({ selections, addons, insurance, oneWay, delivery, promoCode }) {
      // pricing engine full breakdown
    },
    async createBooking({ entityId, selections, guest, agreement, depositIntentId }) {
      // 1. create reservation + items + addons rows
      // 2. generate reference_code BK-YYYY-NNNNN
      // 3. optional auto-assign bike serials (FIFO) o lascia NULL
      // 4. link fiscal document (pending)
      // 5. trigger notification email/sms confirm + pre-sign link
    },
    async confirmPayment({ reservationId, paymentIntentId }) { ... },
    async cancelBooking({ reservationId, reason }) { ... },
  }
}
```

Cart item shape unified:
```typescript
{
  vertical: 'bike_rental',
  entityId, productId: bikeTypeId,
  start, end,                                   // TIMESTAMPTZ precisi
  quantity, riders: [{ name, height, age, experience }],
  addons: [{ key, qty }],
  insuranceTier, deliveryAddress?, pickupLocationId, returnLocationId,
  priceBreakdown
}
```

---

## 7. Operations mobile (check-in/out)

Flow scan-centric minimizza friction:

**Check-in** (staff app):
1. Staff scan QR prenotazione o cerca reference code
2. Verifica ID cliente (foto doc upload se primo noleggio, skip se already verified)
3. Guest firma agreement su touch (se non pre-firmato da portale)
4. Pre-auth deposito Stripe (hold, non capture)
5. Per ogni bike: scan QR bike → foto stato (4 angoli + dettagli) → nota condizione → e-bike: % carica
6. Print/email ricevuta + agreement PDF
7. Status reservation → `active`, bike → `rented`

**Check-out (return)**:
1. Scan QR bike o reference code
2. Foto post (stesse angoli)
3. Confronto automatico condizione: damage flag se differenze
4. Se damage → apri claim flow (severity + cost estimate da listino)
5. Calcola late fee se applicabile
6. Capture deposito parziale se danni, altrimenti release
7. Emit fiscal document via router
8. Trigger email ricevuta + review request
9. Bike → `available` (o `maintenance` se damage)

---

## 8. Pricing engine estensioni

@touracore/pricing già universale. Aggiungere:

```typescript
// Nuovi RuleType
'duration_tier'     // {tier_hours: [1,4,8,24,72,168], discount_pct: [0,5,10,15,25,35]}
'group_size'        // {min_qty: 3, discount_pct: 10}
'surge'             // {demand_threshold, multiplier}
'one_way_fee'       // {base, per_km}
'delivery_fee'      // {base, per_km, max_km}
'seasonal'          // {start_date, end_date, adjust_pct}
'peak_hours'        // {weekdays: [5,6], time_range, adjust_pct}

// Resource context bike
{
  vertical: 'bike_rental',
  bikeTypeKey: 'ebike',
  durationHours: 4,
  quantity: 3,
  pickupLocationId, returnLocationId,
  distanceKm: 12,   // se one-way
  serviceDate, serviceTime
}
```

---

## 9. Compliance + fiscale IT

- **IVA 22%** standard noleggio veicoli (bike incluso).
- **Deposito cauzionale** fuori campo IVA (art. 15 DPR 633/72) — emit documento separato "ricevuta cauzione" non fiscale.
- **Prestazione occasionale** privato < €5.000 annui possibile per piccoli operatori, altrimenti P.IVA + fattura.
- **SDI**: business con P.IVA riceve fattura elettronica (riuso emitter `sdi`).
- **RT scontrino** ADE se shop con registratore telematico.
- **Codice strada**: e-bike pedelec ≤25km/h = bici (no casco obbligo adulti), S-pedelec >25km/h = motoveicolo (casco + patente AM).
- **Assicurazione RC** operatore noleggio obbligatoria (normativa regionale varia).
- **Registro noleggi** con ID cliente: richiesto in alcuni comuni turistici (controllo municipale).

---

## 10. Integrazioni esterne (phase plan)

**Phase 1 (MVP)**:
- **Stripe Connect** — deposito pre-auth, capture parziale per danni
- **Twilio SMS** — confirm, reminder, late alert, deposit release
- **Google Maps** — location picker, distance one-way calc
- **Resend email** — agreement PDF, confirm, review request

**Phase 2**:
- **GetYourGuide, Viator, Bikesbooking** — OTA distribution (channel adapter)
- **Komoot API** — route library import GPX
- **Strava Business** — cross-post promo
- **Insurance partner**: Europ Assistance / AIG / Allianz Italia API per claim automatici

**Phase 3**:
- **Ourania** o **Bici Italia Network** — fleet management integration
- **Smart lock IoT**: Linka, Bitlock, Velocia — unlock via app
- **GPS tracker**: Invoxia, PowUnity, Velco — theft prevention + route history

---

## 11. Discover + listing pubblico

- Extend `@touracore/listings` AMENITY_KEYS con bike-specifics:
  - `bike_helmet_included`, `lock_included`, `child_seat_available`, `gps_tracker_available`, `ebike_available`, `guided_tour_available`, `delivery_service`, `one_way_rental`, `charging_station`, `repair_kit_included`, `maps_included`
- `BikeRentalTemplate.tsx`: hero + gallery + tipi bike cards + pricing tiers + add-ons list + opening hours + location map + route suggestions + reviews + book CTA
- JSON-LD: `LocalBusiness` + `Service` (rental) + `Offer` per tipo bike + `GeoCoordinates` + `openingHoursSpecification`
- `/discover?kind=bike_rental` filters: città, tipo bike, data/ora, durata, prezzo range, e-bike sì/no, delivery sì/no
- Cross-sell: se tenant ha hotel nella stessa località → suggerisci pacchetto stay+ride

---

## 12. Analytics KPI

- **Utilization** = (ore rented) / (ore disponibili non maintenance) × 100
- **RevPAB** (Revenue per Available Bike-day) = revenue totale / (bikes × giorni attivi)
- **ADR noleggio** = revenue / numero noleggi
- **Avg rental duration** ore
- **Damage rate** = claims / noleggi × 100
- **Maintenance cost ratio** = costo manutenzione / revenue per bike
- **ROI payback months** per bike = purchase_price / (monthly revenue − monthly maintenance)
- **No-show rate**, **late return rate**
- **Conversion funnel** discover → listing → cart → checkout → paid
- **Repeat customer rate**

---

## 13. Roadmap GSD (M038-M045)

Continua numerazione milestone:

| M | Titolo | Contenuto principale |
|---|---|---|
| **M038** | Bike rental foundation | Migrations 00093+00094+00095, RLS, seed demo, entity registration |
| **M039** | Fleet mgmt + multi-depot | 00096 + queries bikes/locations/maintenance + admin UI BikeList/BikeForm |
| **M040** | Booking engine bike | availability + pricing engine extensions (duration_tier, group_size, surge) + BookingFlowAdapter + cart item shape |
| **M041** | Check-in/out ops mobile | CheckInScreen + CheckOutScreen + AgreementSigner + scan QR flow + photo pre/post + damage flag |
| **M042** | Public listing + template | BikeRentalTemplate + JSON-LD + amenities extend + /discover filter + /s/[t]/[e] route |
| **M043** | Deposito + damage claims | Stripe pre-auth + 00097 + DamageReporter + insurance workflow + late fee cron |
| **M044** | Guest portal + compliance | portale self-service + e-signature + ID upload + rental agreement generator + fiscal emitter (riuso) |
| **M045** | Analytics + reports | UtilizationDashboard + RevPAB + damage-rate + forecast AI + demo completo Alpina Bikes |
| **M046** (Phase 2) | OTA distribution + route integration | Bókun/GYG adapter + Komoot routes + smart lock stub |

---

## 14. Demo tenant (seed)

**Alpina Bikes Garda** (tenant bike_rental) stesso account `briansnow86@gmail.com` (multi-vertical con villa-irabo hotel + Trattoria del Borgo restaurant):
- 1 bike_rental entity "Alpina Bikes Gardone Riviera"
- 3 location (Gardone centro, Salò, Limone)
- 30 bikes: 10 mtb, 8 e-city, 5 e-mtb, 4 road, 2 cargo, 1 tandem
- 8 bike_types con rates
- 12 add-ons (casco, lucchetto, seggiolino kids, GPS, assicurazione basic/premium, delivery, mappa, kit riparazione, gilet, borse, impermeabile)
- 5 pricing rules (seasonal alta stagione apr-ott, weekend +15%, 7d −20%, group 5+ −10%, peak hours 10-16 +10%)
- 20 reservations demo miste (active/completed/cancelled/no-show)
- 3 damage claims chiusi
- 50 maintenance logs

Cross-sell: guest che prenota villa-irabo vede widget "Aggiungi noleggio bike" in checkout.

---

## 15. Differentiator competitivi TouraCore

Rispetto a top competitor singoli, TouraCore offre:

1. **Multi-vertical unified** — stesso account gestisce hotel + ristorante + bike rental con CRM unico, fiscal unico, listing unico, discover unico. Nessun competitor bike ha questo.
2. **Cross-sell nativo** — hotel → bike (stay+ride pack), bike → restaurant (route termina a trattoria gruppo).
3. **Fiscal IT completo** — SDI + RT + Prestazione Occasionale integrati (Booqable/Rentrax non coprono).
4. **Unified guest profile** — storico cross-vertical (il cliente dell'hotel ha auto-preferenze bike salvate).
5. **Unified discover aggregator** `/discover` — bike rental insieme a hotel/exp/restaurant, SEO-boost cross-category.
6. **Pricing engine universale** con surge + group + duration tiers (solo Jugnoo ha surge, nessuno ha tutti).
7. **Agency layer** — agenzia gestisce più bike shop client con override/free tier (unico nel mercato bike).
8. **Legal entities separate** — noleggio cassa separata da hotel stesso account (già built in 00086-89).

---

## 16. Channel manager + OTA distribution

Pattern identico Octorate hospitality: **hub middleware** + **direct OTA fallback** + **OCTO standard** forward-looking.

### 16.1 Provider supportati

**Tier 1 — Hub middleware (priorità MVP)**
| Provider | Tipo | Copertura bike | Modello |
|---|---|---|---|
| **Bókun** (TripAdvisor) | Channel manager | 70+ OTA inclusi GYG/Viator/Musement/Tiqets | REST API + webhook |
| **Rezdy** | Channel manager | 100+ OTA activity | RezdyConnect supplier-hosted API |
| **Regiondo** | Channel manager DACH+IT | GYG/Viator/Musement/Tiqets | REST API |
| **Checkfront** | Booking+CM | OTA addon | REST API |

**Tier 2 — OTA diretti (alto ROI EU)**
| Provider | Rilevanza bike | Modello |
|---|---|---|
| **GetYourGuide** Supplier API | Alta (EU leader, Italia top) | REST + webhook |
| **Viator** Supplier API | Media (tour più che rental) | REST |
| **Civitatis** | Alta IT/ES/EU | via Bókun bridge |
| **Klook** | Media (APAC) | API partner |
| **Musement** | Media-alta IT | via Bókun/Regiondo |
| **Tiqets** | Media | via hub |
| **Headout** | Media | via hub |
| **Booking.com Experiences** | Alta via FareHarbor | FareHarbor bridge |

**Tier 3 — Bike-specific OTA**
| Provider | Rilevanza | Modello |
|---|---|---|
| **Bikesbooking.com** (PapayaTours) | Alta verticale pure | Partner API (approval) |
| **ListNRide** | Alta EU bike pure | Plugin + partner program |
| **BikeMap Partner** | Media (route + rental) | API light |
| **Komoot Partner** | Media (route+rental cross) | Partner API |

**Tier 4 — OCTO standard (future-proof)**
- **Ventrata OCTO** — enterprise resellers
- **Redeam** — connectivity platform
- **NEZASA** — activity connectivity
- Implementare OCTO endpoint **server-side** = compatibilità automatica con qualunque reseller OCTO-compliant.

**Tier 5 — Italy/Europa specifici**
- **Musement** (IT native) — via Regiondo/Bókun
- **Tiqets** — via hub
- **Civitatis** — via hub Bókun
- **Welcome Italy** operatori regionali — caso per caso

### 16.2 Architettura `@touracore/channels` (estensione esistente)

Registry pattern come `@touracore/integrations`. Già presente per hospitality (Octorate). Estendere per bike rental:

```
packages/core/channels/
├── src/
│   ├── registry.ts                 PROVIDER_REGISTRY (aggiungere bike providers)
│   ├── adapters/
│   │   ├── bokun/                  ★ Phase 1 priorità 1
│   │   │   ├── client.ts           fetch wrapper + HMAC signing
│   │   │   ├── push-availability.ts
│   │   │   ├── push-pricing.ts
│   │   │   ├── pull-bookings.ts
│   │   │   ├── webhook-handler.ts  /api/channels/bokun/webhook
│   │   │   └── mapper.ts           bike_type → bokun product
│   │   ├── rezdy/                  ★ Phase 1 priorità 2
│   │   │   ├── supplier-api.ts     server-hosted endpoints
│   │   │   ├── availability.ts
│   │   │   ├── bookings.ts
│   │   │   └── mapper.ts
│   │   ├── getyourguide/           ★ Phase 2
│   │   │   ├── client.ts
│   │   │   ├── availability-notify.ts
│   │   │   └── mapper.ts
│   │   ├── viator/                 Phase 2
│   │   ├── fareharbor/             Phase 2 (gate Booking.com)
│   │   ├── regiondo/               Phase 2 DACH+IT
│   │   ├── checkfront/             Phase 3
│   │   ├── octo/                   ★ Phase 2 standard
│   │   │   ├── supplier-endpoints.ts  /api/octo/v1/*
│   │   │   └── dto.ts              OCTO standard DTOs
│   │   ├── listnride/              Phase 3 plugin wrapper
│   │   ├── bikesbooking/           Phase 3 partner API
│   │   ├── komoot-partner/         Phase 3
│   │   └── bikemap/                Phase 3
│   ├── sync/
│   │   ├── availability-scheduler.ts   cron 4x day push
│   │   ├── booking-poller.ts           cron 15min pull
│   │   ├── conflict-resolver.ts        dedup + double-book prevention
│   │   └── retry-queue.ts              failed sync retry exponential
│   ├── webhooks/
│   │   └── router.ts               dispatch per provider
│   ├── commission/
│   │   └── calculator.ts           net amount post-OTA commission per report
│   └── types.ts                    ChannelAdapter interface uniforme
```

**ChannelAdapter interface** (tutti adapter implementano):
```typescript
export interface ChannelAdapter {
  provider: ChannelProvider
  pushAvailability(conn, window): Promise<SyncResult>
  pushPricing(conn, rates): Promise<SyncResult>
  pullBookings(conn, since): Promise<ChannelBooking[]>
  ackBooking(conn, externalRef, status): Promise<void>
  cancelBooking(conn, externalRef, reason): Promise<void>
  handleWebhook(payload, signature): Promise<WebhookResult>
  mapProduct(bikeType, connection): ExternalProductPayload
  mapBookingInbound(raw): NormalizedBooking
}
```

### 16.3 Sync cycle + operations

**Outbound (push)**:
- **Availability push** cron 4×/giorno (6:00, 12:00, 18:00, 24:00) + on-demand trigger (reservation create/cancel, bike status change, maintenance schedule)
- **Pricing push** cron 1×/giorno (3:00) + on-demand (pricing_rule change)
- **Booking ack** real-time dopo conversione reservation locale

**Inbound (pull/webhook)**:
- **Webhook preferito** quando supportato (Bókun, Rezdy, GYG) — endpoint `/api/channels/{provider}/webhook` con HMAC verify
- **Polling fallback** ogni 15 min per provider senza webhook
- **Booking pull** → `bike_channel_bookings_inbound` → converter → `bike_rental_reservations` (auto-assign serial se possibile, altrimenti manuale)
- **Cancellation inbound** → update status + release bike + trigger fiscal refund

**Conflict prevention**:
- Availability pool sincronizzato: allocazione per canale in `inventory_allocation` (yield mgmt) — canale X non vende più di N bikes
- Idempotency key su `external_booking_ref` (UNIQUE)
- Double-book detection: pre-insert check overlap su serial assegnato, rollback + requeue se conflitto

### 16.4 Commission + pricing parity

- **Parity mode default**: rate identica su tutti canali (no price war)
- **Markup mode**: rate OTA +X% (assorbe commission senza perdere margine)
- **Markdown mode**: rate OTA −X% (promo canale specifico)
- **Report netto**: `channel_net_amount = total_amount − channel_commission_amount` in `bike_rental_reservations` per analytics revenue reale
- **Commission rate** stored per connection, calcolata automaticamente a conversione booking

### 16.5 UI admin channel mgmt

Routes `/dashboard/bike-rentals/[brId]/channels/`:
- `/` — lista connessioni + status ultimo sync + error count + toggle sync
- `/new` — wizard: pick provider → inserisci credenziali (scope entity, riuso `integration_credentials`) → test connection → map bike_types a external products → enable
- `/[connId]` — detail: sync logs, mapping table, inventory allocation, pricing override, webhook URL copy
- `/[connId]/sync-logs` — paginated log con filter per operation/status
- `/[connId]/mappings` — tabella bike_type ↔ external product edit
- `/[connId]/bookings` — bookings inbound da quel canale + conversione status

### 16.6 OCTO endpoint server-side (future-proof)

Esporre **API pubblica OCTO-compliant** su `/api/octo/v1/` accettando header `Octo-Capabilities`:
- `GET /products` — lista bike rentals pubblicati
- `GET /products/{id}/availability` — disponibilità window
- `POST /bookings` — create reservation
- `POST /bookings/{uuid}/confirm` — conferma payment
- `DELETE /bookings/{uuid}` — cancel
- Auth: Bearer token con rotation + per-reseller rate limit

Beneficio: **qualunque reseller OCTO** (Ventrata, Redeam, NEZASA, Holibob, TourCMS) si connette senza adapter custom. Pattern emerging post-2025.

### 16.7 Distribuzione TouraCore native (own marketplace)

Oltre OTA terze: `/discover` è già aggregatore cross-tenant TouraCore → gratuito per tenant, 0% commission (driver acquisition piattaforma). Bike rental compare in:
- `/discover?kind=bike_rental` filtri città/tipo/prezzo
- Cross-sell su listing hotel/restaurant stesso tenant (stay+ride pack)
- `/embed/listing` iframe white-label per blog, hotel concierge, DMO turistici

---

## 17. Roadmap integrazioni channel (aggiornato)

| Milestone | Provider | Note |
|---|---|---|
| **M046 Phase 2A** | Bókun | MVP channel — sblocca 70+ OTA una botta, priorità assoluta |
| **M046 Phase 2B** | Rezdy | secondary hub + copertura APAC+US |
| **M047** | GetYourGuide Supplier API | direct EU leader, bypass commission hub |
| **M047** | OCTO endpoint server-side | future-proof, attira Ventrata/Redeam |
| **M048** | Viator + FareHarbor | TripAdvisor ecosystem + Booking.com gate |
| **M048** | Regiondo | DACH + Italia secondary hub |
| **M049** | ListNRide + Bikesbooking | verticale bike pure EU |
| **M049** | Komoot Partner + BikeMap | cross-sell route+rental |
| **M050** | Klook + Musement + Tiqets + Civitatis | long-tail via hub aggregato |

---

## 18. Open design decisions

1. Smart lock IoT — Phase 1 manuale con QR scan, IoT Phase 3?
2. GPS tracking bike — opt-in guest (privacy), opt-out default?
3. AI damage scan dal foto — attendere competitor move o anticipare Phase 2?
4. Marketplace P2P (owner privati affittano loro bike) — estensione futura o fuori scope?
5. Subscription membership (mensile unlimited rides) — modello Zagster/bikeshare, valutare Phase 3.
