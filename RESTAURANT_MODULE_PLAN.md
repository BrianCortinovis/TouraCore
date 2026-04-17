# TouraCore — Modulo Ristorazione (Restaurant)

Progetto tecnico per modulo ristorazione enterprise, compatibile con core + hospitality esistente.

**Stato core**: 57 migrations, entity abstraction stabile, reservations/guests/integrations/billing già multi-vertical ready. Sidebar già predispone `restaurant` placeholder.

**Benchmark**: Toast, Resy, OpenTable, SevenRooms, TheFork Manager, Lightspeed Restaurant, Square for Restaurants, Mews F&B.

---

## 1. Scope funzionale (pari o sopra top competitor)

### 1.1 Prenotazione tavolo
- Floor plan visuale (pianta sala) drag-drop, multi-sala (sala principale, terrazza, privé, dehors)
- Tavoli con: seats min/max, forma (round/square/rect), unibili (join tables), zona (smoking/pet/quiet/VIP), altezza (bar/standard/lounge)
- Slot-based booking (lunch/dinner service, turni fissi o rolling 15/30min)
- Party size → tavolo auto-assign (ottimizzatore: minimizza spreco seat)
- Shift pacing (max coperti per slot per evitare cucina ingolfata)
- Deposito/carta preautorizzata (no-show protection via Stripe)
- Waitlist live + SMS/WhatsApp notify "tavolo pronto"
- Walk-in vs booked, merge prenotazioni
- Allergie/intolleranze/occasioni (birthday, anniversary) per coperto

### 1.2 POS + ordini
- Menu engineering: categorie, items, varianti, modifiers (senza cipolla, extra), combo, prezzi per turno (lunch/dinner/happy hour)
- Tavolo → conto aperto → invio cucina (KDS kitchen display)
- Stampa fiscale Italia (RT integrato, lottery code, scontrino elettronico ADE)
- Split bill (per item, per coperto, %)
- Mance, coperto, service charge configurabili
- Operatore/cameriere tracking (commissioni)

### 1.3 Kitchen Display System (KDS)
- Bump screen per stazione (cold, hot, grill, pastry, bar)
- Course timing (antipasto→primo→secondo), fire manuale/auto
- Order status: received→preparing→ready→served
- Allergie highlight rosso

### 1.4 Inventory + ricette
- Ingredienti, fornitori, costi, stock
- Ricette: item menu → ingredienti + quantità → depletion auto su vendita
- Food cost %, margine per piatto
- Alert scorte basse, scadenze lotti HACCP

### 1.5 Menu pubblico + QR
- QR al tavolo → menu mobile (foto, allergeni, provenienza)
- Ordine dal tavolo (opt-in, auto-invia a POS)
- Multi-lingua (IT/EN/DE/FR/ES)
- Pagamento al tavolo (Stripe Terminal o link)

### 1.6 CRM ristorazione
- Guest profile unificato con hospitality (stessa tabella `guests`)
- Storico visite, spesa media, piatti preferiti, allergie, note staff
- Lifetime value, RFM segmentation
- Marketing: email/SMS campagne compleanno, re-engagement

### 1.7 Marketing + acquisizione
- Booking widget embeddable (riusa booking-engine 3 template)
- Integrazione TheFork, OpenTable, Google Reserve (ingestion reservation via API)
- Recensioni aggregator (TripAdvisor, Google, TheFork) via channel manager
- Offers/promo (early bird -20% 18-19:30)

### 1.8 Analytics enterprise
- Coperti, scontrino medio, food/beverage cost, turn rate (rotazione tavolo), no-show rate
- Heat map tavoli (quali performano)
- Menu engineering: stars/plowhorses/puzzles/dogs (Kasavana-Smith)
- Forecast coperti AI (weather + eventi locali + storico)

### 1.9 Staff + turni
- Turni (shift scheduling), clock in/out, ore lavorate
- Ruolo: chef, sous, line, pastry, dishwasher, maitre, waiter, sommelier, barman
- Mance pool/distribution
- Compensi + commissioni su upsell (vino bottiglia, dessert)

### 1.10 Compliance IT
- HACCP: registro temperature frigo/freezer, scadenze, sanificazioni
- Fiscale: RT registratore telematico, corrispettivi ADE, scontrino lotteria
- Allergeni reg. UE 1169/2011 su menu
- Tracciabilità lotti ingredienti

---

## 1.bis Casi d'uso registrazione + navigation multi-vertical

### Caso 1 — Ristoratore puro (no hospitality)
- Signup: sceglie **vertical = Restaurant** in onboarding step 1
- Tenant.modules = `{hospitality: false, restaurant: true, experiences: false}`
- Onboarding step 3 crea `entity kind=restaurant` (non accommodation)
- Redirect post-signup: `/[tenantSlug]/dine/[entitySlug]/overview`
- Sidebar root mostra solo: Dine, Guests, Settings, Billing (hospitality nascosto)
- Prezzo: piano Restaurant-only (es. $29/mese base)

### Caso 2 — Operatore multi-vertical (PIVA con strutture + ristorante)
- Signup: sceglie **"Hospitality + Restaurant"** (o attiva restaurant dopo da Settings→Modules)
- Tenant.modules = `{hospitality: true, restaurant: true}`
- Stesso account, stesso tenant, N entities miste (3 hotel + 2 ristoranti)
- Navigation: **un unico CMS**, switch senza logout, 2 livelli di switch:

**Switch livello 1 — Vertical chip (top-bar sinistra)**
- Chip "Hospitality | Restaurant | Activities" sempre visibile se più moduli attivi
- Click → cambia area CMS: route passa da `/stays/[slug]/...` → `/dine/[slug]/...`
- Remember last-visited entity per vertical (localStorage): click "Restaurant" → ti porta al ristorante su cui eri ultimo
- Se 0 entities in quel vertical: landing "Crea il tuo primo [restaurant/hotel]"

**Switch livello 2 — Entity chip (top-bar centro)**
- Dropdown già esistente in `app-topbar.tsx:92-123`, filtra per kind del vertical attivo
- Se vertical=Hospitality → lista solo entities kind=accommodation
- Se vertical=Restaurant → lista solo entities kind=restaurant
- Quick action "+ Nuova entity" in fondo dropdown

### Toggle in Hospitality per passare a Restaurant

**Richiesta esplicita utente**: dentro hospitality, tab/toggle che porta direttamente al CMS ristorazione della stessa entity (se ristorante è linked) o del tenant.

Implementazione:

**A. Toggle vertical in entity-sidebar hospitality (`stays/[entitySlug]/entity-sidebar.tsx`)**
- In cima sidebar, sotto entity chip, piccolo switch **[Hospitality | Restaurant]**
- Se entity hotel ha ristorante linked (child entity `parent_entity_id = thisEntity.id` con kind=restaurant):
  - Click "Restaurant" → redirect a `/[tenantSlug]/dine/[restaurant-entity-slug]/overview`
- Se entity hotel NON ha ristorante linked ma tenant ha altri ristoranti:
  - Click "Restaurant" → dropdown lista ristoranti tenant
- Se tenant non ha ristorante e modulo restaurant attivo:
  - Click "Restaurant" → `/[tenantSlug]/dine/new` (crea primo)
- Se modulo restaurant OFF:
  - Tab "Restaurant" mostra badge "Attiva modulo" → link a `/settings/modules`

**B. Toggle speculare in restaurant-sidebar (`dine/[entitySlug]/restaurant-sidebar.tsx`)**
- Stesso switch, ritorno a hospitality parent o sibling

**C. Properties tab interna (come chiesto): "passa da struttura interna delle strutture"**
- Dentro `stays/[entitySlug]` → voce sidebar "Altre entità" o chip entity → lista entities sorelle dello stesso tenant/parent
- Pattern breadcrumb: `TenantName > StaysGroup > HotelX > RestaurantY (child)`

### Modules settings (Caso 2 attivazione runtime)
- Pagina `/[tenantSlug]/settings/modules` (esiste già)
- Card per modulo: Hospitality (attivo), Restaurant (toggle ON/OFF), Experiences
- Toggle ON Restaurant → prompt: "Crea primo ristorante?" o "Aggiungilo poi da Dine"
- Persist in `tenants.modules` JSONB
- Invalidazione cache sidebar + topbar

### Onboarding step 1 (nuovo, modifica esistente)
- **File**: `apps/web/src/app/(auth)/onboarding/step-1/` (nuovo) — precede step-2
- UI: 3 card grandi cliccabili
  - "Solo Hospitality" (hotel, B&B, casa vacanze, agriturismo, residence, affittacamere)
  - "Solo Ristorazione" (trattoria, ristorante, pizzeria, bar)
  - "Entrambi" (gruppo multi-vertical)
- Selezione popola `tenant.modules` + scelta kind in step-3

### Routing finale
- `/[tenantSlug]/stays/[entitySlug]/...` → hospitality (kind=accommodation)
- `/[tenantSlug]/dine/[entitySlug]/...` → restaurant (kind=restaurant)
- `/[tenantSlug]/activities/[entitySlug]/...` → activities (kind=activity)
- `/[tenantSlug]/` dashboard cross-vertical (KPI aggregati: revenue totale, occupancy hotel, covers ristorante)

### Permissions vertical-aware
Estendi `permissions.ts` con check modulo:
```ts
canAccessVertical(user, tenant, vertical): boolean {
  if (!tenant.modules[vertical]) return false;
  return hasPlatformRole(user, tenant);
}
```
Middleware route guard `/dine/*` → se `tenant.modules.restaurant===false` → 404 o redirect `/settings/modules`.

### File da toccare per switcher (aggiunta sezione 12 preview)
```
apps/web/src/app/(app)/app-topbar.tsx          # add vertical chip
apps/web/src/app/(app)/vertical-switcher.tsx   # nuovo componente
apps/web/src/app/(app)/[tenantSlug]/stays/[entitySlug]/entity-sidebar.tsx  # add top toggle
apps/web/src/app/(app)/[tenantSlug]/dine/[entitySlug]/restaurant-sidebar.tsx  # specular toggle
apps/web/src/app/(auth)/onboarding/step-1/*    # nuovo step vertical picker
apps/web/src/app/(auth)/onboarding/step-3/*    # adatta a kind=restaurant
apps/web/src/app/(app)/[tenantSlug]/settings/modules/*  # toggle restaurant + persist
packages/core/auth/src/permissions.ts          # canAccessVertical helper
packages/core/tenants/*                        # tenants.modules schema + helpers
```

### Migration schema update
00058 aggiungi anche:
```sql
ALTER TABLE public.entities
  DROP CONSTRAINT entities_kind_check,
  ADD CONSTRAINT entities_kind_check CHECK (kind IN ('accommodation','activity','restaurant'));

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS modules JSONB NOT NULL DEFAULT '{"hospitality":true,"restaurant":false,"experiences":false}';
```

---

## 2. Link con Hospitality (chiave enterprise)

### 2.1 Guest unificato
- `guests` tabella condivisa. Cliente hotel = stesso record del cliente ristorante.
- Reservation ristorante legata a `reservation_id` hospitality (stay attivo) → conto charge-to-room.

### 2.2 Charge to room / appartamento
- Tavolo prenotato da ospite in-house → bill automaticamente aggiunto a `reservations.balance` hospitality
- Nuova tabella `folio_charges` (room account): reservation_id, source (restaurant_check|minibar|spa|laundry), amount, vat
- Check-out hospitality totalizza folio
- Se apartment (casa_vacanze): stesso meccanismo su reservation appartamento

### 2.3 Assegnazione tavolo a camera/appartamento
- Staff hospitality può prenotare tavolo per ospite: UI stays/bookings → action "Prenota tavolo"
- Crea restaurant reservation con `linked_stay_reservation_id`, pre-popola guest_id
- Meal plan (HB/FB/AI) → credito automatico coperti al ristorante:
  - Half Board: 1 cena/notte pre-autorizzata
  - Full Board: pranzo+cena
  - All-Inclusive: illimitato con menu dedicato
- Consumo menu > meal plan → differenza su folio

### 2.4 Breakfast service
- Se accommodation ha breakfast_included, ristorante genera automaticamente "covers" mattina per check-in
- KPI: breakfast show rate vs reservations in-house

### 2.5 Entity link flessibile
- Ristorante può essere:
  - **Standalone** (trattoria indipendente): entity kind=restaurant
  - **Dentro hotel/residence**: entity kind=restaurant + `parent_entity_id` → accommodation
  - **Multi-venue**: gruppo (tenant) con N restaurant + N accommodation, tutte entities
- Agency può gestire ristoranti clients (stesso pattern hospitality)

### 2.6 Staff condivisione
- `staff_role = restaurant_staff` già presente (00013)
- Cameriere può accedere a sidebar ristorante, non a hospitality
- Maitre con permessi cross (vede ospiti hotel + prenotazioni sala)

### 2.7 Messaging unificato
- Inbox 2-way stessa (WhatsApp Business/email): thread per guest attraversa entity (hotel+restaurant)
- Template automation: conferma prenotazione tavolo, promemoria 2h prima, review request post-visit

### 2.8 Billing
- Ristorante = entity sotto stesso tenant → stesso subscription
- Commission su prenotazioni da booking engine: %/coperto (configurable)
- Stripe Connect condiviso, payouts singolo account tenant

---

## 3. Schema DB (migrations da aggiungere)

Numerazione continua: **00058** in su.

### 00058 — restaurants table (entity extension)
```sql
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY REFERENCES public.entities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  cuisine_type TEXT[], -- italian, japanese, fusion, ...
  price_range SMALLINT CHECK (price_range BETWEEN 1 AND 4), -- € €€ €€€ €€€€
  capacity_total INT NOT NULL DEFAULT 0, -- coperti totali
  avg_turn_minutes INT DEFAULT 90,
  parent_entity_id UUID REFERENCES public.entities(id), -- se dentro hotel
  opening_hours JSONB NOT NULL DEFAULT '{}', -- {mon:[{open:12,close:15},{open:19,close:23}],...}
  services JSONB NOT NULL DEFAULT '[]', -- [{name:"Pranzo",start:12,end:15,max_covers:60},...]
  reservation_mode TEXT CHECK (reservation_mode IN ('slot','rolling','hybrid')) DEFAULT 'slot',
  deposit_policy JSONB DEFAULT '{}', -- {enabled:true, amount_per_cover:20, above_party:6}
  no_show_policy JSONB DEFAULT '{}',
  tax_config JSONB DEFAULT '{}', -- coperto, service_charge, vat_by_category
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 00059 — floor_plans + rooms (sala) + tables
```sql
CREATE TABLE public.restaurant_rooms ( -- "sala" (evita collision con hospitality rooms)
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- "Sala principale", "Dehors", "Privé"
  zone_type TEXT, -- indoor, outdoor, private
  order_idx INT DEFAULT 0,
  layout JSONB -- SVG/canvas metadata: width, height, background_image
);

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  room_id UUID NOT NULL REFERENCES restaurant_rooms(id),
  code TEXT NOT NULL, -- "T1","T2","Bar-3"
  shape TEXT CHECK (shape IN ('round','square','rect','custom')),
  seats_min SMALLINT NOT NULL,
  seats_max SMALLINT NOT NULL,
  seats_default SMALLINT NOT NULL,
  joinable_with UUID[], -- array di table ids che si uniscono
  attributes TEXT[], -- ['window','quiet','pet_ok','high_chair_ok','vip']
  position JSONB NOT NULL, -- {x,y,w,h,rotation}
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(restaurant_id, code)
);
```

### 00060 — restaurant_reservations
```sql
CREATE TABLE public.restaurant_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  guest_id UUID REFERENCES guests(id), -- unificato hospitality
  linked_stay_reservation_id UUID REFERENCES reservations(id), -- charge-to-room
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  service_label TEXT, -- 'Lunch','Dinner'
  party_size SMALLINT NOT NULL,
  duration_minutes INT DEFAULT 90,
  table_ids UUID[] NOT NULL DEFAULT '{}', -- supporta join tables
  status TEXT CHECK (status IN ('pending','confirmed','seated','finished','cancelled','no_show','waitlist')) DEFAULT 'pending',
  source TEXT CHECK (source IN ('direct','widget','phone','walk_in','thefork','google','opentable','stay_linked')),
  special_requests TEXT,
  allergies TEXT[],
  occasion TEXT, -- birthday, anniversary, business, first_date
  deposit_amount NUMERIC(10,2) DEFAULT 0,
  deposit_stripe_intent_id TEXT,
  deposit_status TEXT, -- held, captured, released, failed
  meal_plan_credit_applied BOOLEAN DEFAULT FALSE, -- per HB/FB ospiti hotel
  covers_billed_to_folio NUMERIC(10,2) DEFAULT 0,
  notes_staff TEXT,
  assigned_waiter_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  seated_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX ON restaurant_reservations (restaurant_id, slot_date, status);
CREATE INDEX ON restaurant_reservations (linked_stay_reservation_id);
```

### 00061 — waitlist
```sql
CREATE TABLE public.restaurant_waitlist (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  guest_id UUID REFERENCES guests(id),
  guest_name TEXT,
  phone TEXT,
  party_size SMALLINT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  estimated_wait_min INT,
  notified_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('waiting','notified','seated','left','abandoned'))
);
```

### 00062 — menu (categorie, items, modifiers)
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL, order_idx INT, active BOOLEAN DEFAULT TRUE,
  available_services TEXT[] -- ['lunch','dinner','breakfast']
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  category_id UUID REFERENCES menu_categories(id),
  name TEXT NOT NULL, description TEXT, price NUMERIC(10,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 10.00,
  allergens TEXT[], -- gluten, lactose, nuts, egg, fish, shellfish, soy, celery, mustard, sesame, sulfites, lupin, mollusks
  dietary TEXT[], -- vegan, vegetarian, gluten_free, halal, kosher
  images TEXT[], available BOOLEAN DEFAULT TRUE,
  prep_station TEXT, -- cold, hot, grill, pastry, bar
  prep_time_min INT, course TEXT, -- antipasto, primo, secondo, dessert
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE menu_modifiers (
  id UUID PRIMARY KEY, item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT, -- "senza cipolla", "extra mozzarella"
  price_delta NUMERIC(10,2) DEFAULT 0,
  type TEXT CHECK (type IN ('remove','add','substitute','variant'))
);
```

### 00063 — orders (checks) + order_items
```sql
CREATE TABLE restaurant_orders (
  id UUID PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  reservation_id UUID REFERENCES restaurant_reservations(id),
  table_ids UUID[],
  status TEXT CHECK (status IN ('open','sent_to_kitchen','partial','ready','served','closed','voided')),
  opened_at TIMESTAMPTZ DEFAULT NOW(), closed_at TIMESTAMPTZ,
  waiter_id UUID REFERENCES auth.users(id),
  covers SMALLINT NOT NULL,
  subtotal NUMERIC(10,2), service_charge NUMERIC(10,2),
  coperto NUMERIC(10,2), vat_amount NUMERIC(10,2), total NUMERIC(10,2),
  paid_amount NUMERIC(10,2) DEFAULT 0,
  folio_charged_to_reservation_id UUID REFERENCES reservations(id), -- charge-to-room
  fiscal_receipt_number TEXT, fiscal_lottery_code TEXT
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  name_snapshot TEXT NOT NULL, price_snapshot NUMERIC(10,2) NOT NULL,
  quantity SMALLINT DEFAULT 1, modifiers JSONB,
  course TEXT, prep_station TEXT,
  kitchen_status TEXT CHECK (kitchen_status IN ('queued','preparing','ready','served','voided')),
  fired_at TIMESTAMPTZ, ready_at TIMESTAMPTZ, served_at TIMESTAMPTZ,
  notes TEXT, voided_reason TEXT
);
```

### 00064 — folio_charges (link hospitality)
```sql
CREATE TABLE folio_charges (
  id UUID PRIMARY KEY,
  stay_reservation_id UUID NOT NULL REFERENCES reservations(id),
  source_type TEXT CHECK (source_type IN ('restaurant_check','minibar','spa','laundry','other')),
  source_id UUID, -- order_id se restaurant
  description TEXT, amount NUMERIC(10,2), vat_amount NUMERIC(10,2),
  posted_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('posted','settled','voided')),
  created_by UUID REFERENCES auth.users(id)
);
CREATE INDEX ON folio_charges (stay_reservation_id, status);
```

### 00065 — inventory (ingredients + stock + recipes)
```sql
CREATE TABLE ingredients (id UUID PK, restaurant_id UUID, name, unit, cost_per_unit, allergens[], supplier_id, stock_current, stock_min, active);
CREATE TABLE suppliers (id, restaurant_id, name, contact, payment_terms);
CREATE TABLE recipes (id, menu_item_id, yield_servings);
CREATE TABLE recipe_ingredients (recipe_id, ingredient_id, quantity, unit);
CREATE TABLE stock_movements (id, ingredient_id, delta, reason, lot_number, expiry_date, ref_order_id, created_at);
```

### 00066 — KDS + stations
```sql
CREATE TABLE kitchen_stations (id, restaurant_id, name, type, printer_url);
-- order_items.prep_station già presente, KDS filtra per station
```

### 00067 — HACCP + fiscale IT
```sql
CREATE TABLE haccp_logs (id, restaurant_id, type, target, value, recorded_by, recorded_at, notes);
CREATE TABLE fiscal_receipts (id, order_id, rt_serial, fiscal_number, xml_sent_to_ade, lottery_code, ts);
```

### 00068 — shifts + staff restaurant
```sql
CREATE TABLE staff_shifts (id, user_id, restaurant_id, shift_start, shift_end, role, hourly_rate, clock_in, clock_out, tips_earned);
CREATE TABLE tip_pools (id, restaurant_id, shift_date, total, distribution JSONB);
```

### 00069 — RLS policies + helper functions
- Stesso pattern hospitality: entity_id → tenant OR agency_link attivo
- Helper `get_restaurant_ids_for_user()`

### 00070 — seed + update sidebar visibility
- Remove `placeholder:true` da voce restaurant sidebar
- Seed 2 ristoranti demo (uno standalone, uno dentro hotel existing)

---

## 4. API routes

### Admin (protette, `/api/[tenantSlug]/restaurants/[entitySlug]/`)
- `floor-plan` GET/PUT — piantina + tavoli
- `reservations` GET/POST/PATCH — prenotazioni con filtri (date, status, table)
- `reservations/[id]/seat` POST — seat guest
- `reservations/[id]/assign-table` PATCH
- `waitlist` GET/POST/PATCH
- `menu/items` CRUD, `menu/categories` CRUD
- `orders` GET/POST — lista, nuovo ordine
- `orders/[id]/fire` POST — invia a cucina
- `orders/[id]/split` POST — split bill
- `orders/[id]/close` POST — chiude + fiscal
- `orders/[id]/charge-to-folio` POST — addebita a reservation hospitality
- `kds` SSE — stream live ordini cucina per stazione
- `inventory/*`, `haccp/*`, `shifts/*`, `analytics/*`

### Pubbliche (riusa pattern booking-engine)
- `/api/public/restaurant/context?apiKey=...&entitySlug=...`
- `/api/public/restaurant/availability?date=&party_size=&service=`
- `/api/public/restaurant/reserve` POST
- `/api/public/restaurant/checkout` POST (deposit Stripe)
- `/book-table/[slug]` + `/embed-table/[slug]` (3 template riuso)

### Hospitality cross
- `/api/[tenant]/stays/[entity]/reservations/[id]/book-restaurant` POST — staff hotel prenota tavolo per ospite in-house, auto-link

---

## 5. UI pages

Sidebar nuovo gruppo `restaurant` entity:
- **Overview** — KPI coperti oggi, covers vs capacity, revenue, turn rate
- **Floor plan** — editor pianta drag-drop tavoli
- **Reservations** (sub-tabs: List | Timeline | Grid tavolo×ora)
- **Waitlist** — live queue + notify
- **Walk-ins** quick flow
- **Menu** (sub-tabs: Categories | Items | Modifiers | Allergens editor)
- **Orders** (sub-tabs: Open | Closed | Voided) + POS view
- **KDS** fullscreen per stazione (tablet cucina)
- **Inventory** (sub-tabs: Ingredients | Suppliers | Recipes | Stock movements | Low stock)
- **HACCP** (sub-tabs: Temperature | Sanitation | Batches)
- **Shifts** (sub-tabs: Schedule | Timeclock | Tips)
- **Guests** — riuso anagrafe hospitality, vista ristorazione (visite, spesa media, allergie)
- **Analytics** (sub-tabs: Covers | Revenue | Menu engineering | Food cost | Forecast)
- **Messaging** — riuso inbox 2-way
- **Booking engine** — template select + API keys (riuso booking-engine admin)
- **Integrations** (TheFork, OpenTable, Google Reserve, RT fiscale, printer cucina)
- **Settings** (services, orari, depositi, no-show policy, tax config)

Cross-hospitality:
- In `stays/[entity]/bookings/[id]` pagina reservation hotel → nuova tab "Ristorante" con:
  - Prenotazioni tavolo linked
  - Quick-book table per l'ospite
  - Consumo meal plan vs crediti
  - Folio charges da ristorante

---

## 6. Booking engine pubblico (riuso + estensione)

**3 template esistenti adattati**:
- **minimal** (OpenTable/Resy-like): grid giorni × slot, party size picker, filtro "con deposito", sticky summary
- **luxury** (fine dining): hero sala, storytelling chef, wine pairing upsell, photo piatti signature
- **mobile** (Beddy-like): step-by-step (date→party→slot→contatti→conferma), sticky CTA

**Flow comune**:
1. Date picker + party size
2. Availability grid (slot × sala) con indicatore posti rimanenti
3. Selezione slot → (opzionale) scelta zona (dehors/interno/privé)
4. Guest info + allergie/occasione/note
5. Se deposit_policy.enabled → Stripe Checkout preauth
6. Conferma + email/SMS + calendar .ics

**Widget embed**: `<iframe src="/embed-table/[slug]">` + SDK JS headless identico a booking-sdk hospitality (aggiungi `TouraTableClient` class).

---

## 7. Integrations nuove (oltre 6 esistenti)

Aggiungi registry.ts:
- **thefork** (ingest reservation + recensioni) — scope: entity
- **opentable** — scope: entity
- **google_reserve** — scope: entity (Google Reserve with me)
- **rt_fiscale_it** (Epson/Custom printer fiscale) — scope: entity (endpoint_url, serial)
- **deliveroo_justeat_uber** (delivery ingest) — scope: entity (futuro)
- **printer_kitchen** (ESC/POS network printer per stazione) — scope: entity

---

## 8. Ruoli + permessi

Aggiungi a `staff_role` enum (00013):
- Già presente: `restaurant_staff` (generico)
- Split: `chef`, `waiter`, `maitre`, `barman`, `sommelier`, `dishwasher`

Aggiorna `permissions.ts`:
```ts
RESTAURANT_PERMISSIONS = {
  waiter: ['reservations:read/update','orders:create/update','tables:seat','kds:read'],
  maitre: [...waiter,'reservations:delete','floor_plan:read','waitlist:manage','guests:read'],
  chef: ['orders:read','kds:*','menu:read','inventory:read','haccp:*'],
  barman: ['orders:create/update','kds:bar'],
  restaurant_manager: ['restaurant:*'],
};
```

---

## 9. Billing impatto

- Nuovo piano addon: **Restaurant +$49/mese per entity** (oppure piano Enterprise include illimitate entities)
- Commission su booking widget: 0% (come hospitality direct) — vs TheFork 2€/coperto → value prop
- Stripe Connect: deposit preauth + fiscal receipt routing

---

## 10. Roadmap implementazione (milestone)

**M1 — Foundation (2 settimane)**: migrations 00058-00061, restaurants entity, floor plan editor base, reservations base, RLS  
**M2 — Booking engine ristorante (1 settimana)**: API pubbliche, 3 template adapt, Stripe deposit, widget embed  
**M3 — Menu + Orders + POS (2 settimane)**: 00062-00063, UI menu editor, POS view, order flow, split bill  
**M4 — KDS + printer (1 settimana)**: 00066, SSE stream, station filter, ESC/POS print  
**M5 — Hospitality link (1 settimana)**: 00064 folio_charges, charge-to-room UI, meal plan credit logic, cross-tab stays  
**M6 — Inventory + HACCP (1 settimana)**: 00065, 00067, stock depletion su sale, HACCP log UI  
**M7 — Staff + shifts (1 settimana)**: 00068, timeclock, tip pool  
**M8 — Analytics + forecast (1 settimana)**: dashboard, menu engineering quadrant, AI forecast (storico + meteo)  
**M9 — Integrations IT (1 settimana)**: TheFork ingest, RT fiscale, Google Reserve  
**M10 — Fiscal IT + compliance (1 settimana)**: corrispettivi ADE, scontrino lotteria, allergeni UE  

Totale: **~12 settimane** a pieno ritmo.

---

## 11. Decisioni aperte (da confermare)

1. **RT fiscale**: libreria native Epson/Custom o middleware HTTP? (raccomando middleware per ora)
2. **KDS device**: web tablet fullscreen o nativo? (web ok, PWA installabile)
3. **Delivery**: scope M1 o fuori scope v1? (suggerisco fuori v1, add later)
4. **Multi-lingua menu**: i18n column per item o JSONB `name_i18n`? (JSONB più flessibile)
5. **Google Reserve**: priorità alta o bassa? (bassa — TheFork domina IT)
6. **Reservation mode default**: slot fisso o rolling? (slot per v1, rolling feature flag)
7. **Split bill**: per item o anche per %? (per item + % custom)

---

## 12. File touch-list (preview)

```
packages/core/restaurant/              # nuovo module
├── src/
│   ├── index.ts
│   ├── types.ts                       # TableLayout, ReservationSlot, Order, ...
│   ├── floor-plan/                    # canvas/SVG helpers
│   ├── availability.ts                # slot calculation
│   ├── pacing.ts                      # shift pacing optimizer
│   ├── folio.ts                       # charge-to-room bridge
│   └── menu-engineering.ts            # Kasavana-Smith analysis

packages/booking-sdk/src/
└── table-client.ts                    # TouraTableClient (pattern TouraBookingClient)

apps/web/src/app/(app)/[tenantSlug]/dine/[entitySlug]/
├── layout.tsx + restaurant-sidebar.tsx
├── overview/, floor-plan/, reservations/, waitlist/, menu/, orders/, kds/,
├── inventory/, haccp/, shifts/, guests/, analytics/, booking-engine/, settings/

apps/web/src/app/book-table/[slug]/    # public
apps/web/src/app/embed-table/[slug]/
apps/web/src/app/api/public/restaurant/{context,availability,reserve,checkout}/
apps/web/src/app/api/[tenantSlug]/restaurants/[entitySlug]/**

supabase/migrations/00058..00070_*.sql
```

---

**FINE piano.** Pronto per M1 appena confermi decisioni aperte.
