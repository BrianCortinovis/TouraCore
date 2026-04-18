# Experience Module Plan (M051-M065)

Modulo verticale per **attività esperienziali generiche**: motoslitte, parco avventura, escape room, tour guidati, noleggio bob/kayak/sup, degustazioni, laser tag, karting, escursioni.

Terza vertical dopo `hospitality` e `bike-rental`. Unificata col core.

---

## 1. Competitor Bench

| Competitor | Feature da assorbire |
|---|---|
| Bókun (TripAdvisor) | Inventory slot + cutoff + capacity, resource assignment, OTA sync 40+ |
| FareHarbor | Custom fields per booking, waiver digitale, manifest operativa |
| Rezdy | Marketplace B2B agent, commission tier, barcode check-in |
| Peek Pro | Dynamic pricing, upsell addon, waitlist |
| TrekkSoft | Multi-day tour, itinerary step, pickup zone |
| Checkfront | Rental + activity ibrido, gift voucher, bundle |
| Ventrata | Ticket QR, timeslot grid, gate scanner |
| Regiondo (EU) | Multi-lingua IT/EN/DE, VIES B2B, season pricing |
| Xola | Group discount tier, custom question per partecipante |
| TicketingHub | Channel manager 50+ OTA, resource conflict |

## 2. Core Principles

### 3 Booking Modes

| Mode | Use case | Example |
|---|---|---|
| `timeslot_capacity` | Slot orario + N posti disponibili | Motoslitta 5 posti, parco avventura 20 slot |
| `timeslot_private` | Slot riservato esclusivo | Escape room, private tour, karting sessione |
| `asset_rental` | Pool unit-based (stile bike) | Noleggio bob, kayak, SUP, e-scooter |

### Unificato Core (NO duplicazione)

Riusa:
- `@touracore/vouchers` — tenant-scoped discount
- `@touracore/partners` — commission auto 15% su reservation
- `@touracore/fiscal` — SDI/RT/occasionale emit
- `@touracore/pricing` — extend con `group_discount_tier` + `last_minute_discount`
- `@touracore/listings` — 52 amenities + experience-specific (lingua guida, difficoltà, età min, durata)
- `@touracore/channels` — pattern `CHANNEL_REGISTRY` replica bike
- `@touracore/legal` — split IT privato/business/occasionale
- `@touracore/integrations` — scope tripartito tenant/agency/entity
- Gift card `/gift-card/buy/[tenant]` — add `vertical='experience'`

---

## 3. Database Schema (Migrations 00104-00120)

```
00104 experience_entities
00105 experience_products           — SKU prodotto
00106 experience_variants           — adulto/bambino/famiglia/private/group
00107 experience_schedules          — weekly recurrence + exceptions + blackouts
00108 experience_timeslots          — slot generati con capacity
00109 experience_resources          — guide/mezzi/attrezzatura
00110 experience_resource_assignment — M:N product↔resource + required flag
00111 experience_addons             — upsell (foto, gopro, casco, assicurazione, pickup)
00112 experience_custom_fields      — form builder JSON schema
00113 experience_reservations       — booking (split da core con vertical='experience')
00114 experience_reservation_guests — passeggeri con custom_fields values + waiver
00115 experience_waivers            — template versionati + firma digitale hash
00116 experience_pickup_zones       — zone pickup/dropoff + surcharge
00117 experience_channel_mapping    — OTA (Viator, GYG, Expedia, Musement, Tiqets)
00118 experience_public_views       — RLS anon /s/[t]/[e] + /discover
00119 experience_manifest_views     — view operativa giorno
00120 seed_demo_experiences         — 3 demo (motoslitta / parco avventura / kayak)
```

### Tabelle chiave

**experience_products**
```
id uuid pk
tenant_id uuid
entity_id uuid
name text
slug text
description_md text
booking_mode enum(timeslot_capacity, timeslot_private, asset_rental)
duration_minutes int
capacity_default int           -- only if mode=timeslot_capacity
age_min int, age_max int
height_min_cm int
difficulty enum(easy, medium, hard, extreme)
languages text[]                -- ['it','en','de']
price_base_cents int
currency text default 'EUR'
status enum(draft, active, archived)
meta jsonb
created_at, updated_at
```

**experience_timeslots**
```
id uuid pk
product_id uuid
start_at timestamptz
end_at timestamptz
capacity_total int
capacity_booked int default 0
status enum(open, full, blocked, cancelled)
resource_assignment jsonb  -- snapshot resources at generation
unique(product_id, start_at)
```

**experience_reservation_guests**
```
id uuid pk
reservation_id uuid
variant_id uuid
first_name, last_name, email, phone
date_of_birth date
custom_fields_values jsonb
waiver_id uuid nullable
waiver_signed_at timestamptz
waiver_signature_hash text
```

---

## 4. Package `@touracore/experiences`

```
experiences/src/
├── types/
│   ├── product.ts
│   ├── timeslot.ts
│   ├── resource.ts
│   ├── custom-field.ts
│   └── waiver.ts
├── engine/
│   ├── availability.ts       -- genera slot da schedule
│   ├── capacity.ts           -- atomic decrement SKIP LOCKED
│   ├── resource-conflict.ts  -- overlap guide/mezzi
│   ├── pricing.ts            -- wrap @touracore/pricing
│   └── custom-fields.ts      -- validate + render form
├── queries/
│   ├── products.ts
│   ├── timeslots.ts
│   ├── reservations.ts
│   ├── manifest.ts
│   └── resources.ts
├── actions/
│   ├── createReservation.ts
│   ├── cancelReservation.ts
│   ├── assignResource.ts
│   ├── checkIn.ts            -- QR scan
│   └── regenerateSlots.ts
├── channels/
│   ├── registry.ts           -- 12 OTA
│   ├── viator-adapter.ts
│   ├── gyg-adapter.ts
│   ├── musement-adapter.ts
│   └── dispatcher.ts
└── constants.ts
```

### Channel Registry (12 OTA experience-native)

| Tier | Provider |
|---|---|
| S | Viator, GetYourGuide, Expedia Local |
| A | Musement, Tiqets, Klook |
| B | Civitatis, Headout, TUI Musement |
| C | Regiondo marketplace, Bókun B2B |
| D | Manual/custom XML |

---

## 5. Admin UI `/activities/`

Sidebar 11 voci:

1. **Dashboard** — revenue/bookings oggi/utilization slot/resource load
2. **Catalog** — prodotti + varianti + addon editor
3. **Schedule** — weekly grid + exceptions + blackouts
4. **Slot inventory** — calendar view capacity
5. **Resources** — guide + mezzi + assignment
6. **Reservations** — table + filters + export
7. **Manifest** — print giorno (slot+guest+pickup+guide)
8. **Check-in** — QR scanner + gate
9. **Waivers** — template editor + firmati
10. **Channels** — OTA catalog by tier
11. **Settings** — pickup zones, custom fields builder, policy

## 6. Public Routes

- `/book/experience/[slug]` — multi-step widget (product → date → slot → variant → addon → pickup → custom fields → waiver → pay)
- `/s/[t]/[e]` — `ExperienceTemplate` (hero+gallery+schedule matrix+highlights+reviews)
- `/discover?vertical=experience`
- `/embed/experience/[id]` — iframe
- `/manifest/[date]` — print operativo

### JSON-LD

```
@type: TouristAttraction + Event + Offer
name, description, image, url
provider: LocalBusiness
offers: [{price, priceCurrency, availability, validFrom, url}]
geo: GeoCoordinates
openingHoursSpecification
suitableForAge
```

---

## 7. Roadmap Milestones

| ID | Title | Proof |
|---|---|---|
| **M051** | Foundation | Migrations 00104-00108 + package scaffold + demo seed |
| **M052** | Product catalog UI | Varianti + addon + custom fields builder |
| **M053** | Availability engine | Schedule → timeslot + capacity lock atomic |
| **M054** | Resource engine | Guide/mezzi + conflict detection + assignment |
| **M055** | Booking widget | `/book/experience/[slug]` public multi-step |
| **M056** | Waiver + custom fields | Digital sign + hash + guest portal |
| **M057** | Manifest + check-in | Print giorno + QR scanner |
| **M058** | Public listing | ExperienceTemplate + JSON-LD + `/s/[t]/[e]` |
| **M059** | Channel manager | Registry + Viator/GYG adapter stub |
| **M060** | Pricing dynamic | Season+surge+group+last-minute |
| **M061** | Addon + pickup zones | Upsell engine + fee zone |
| **M062** | Voucher+gift+partner wire | Commission 15% auto + gift card vertical |
| **M063** | Asset rental mode | Pool bob/kayak stile bike |
| **M064** | Multi-day tour | Itinerary + pickup/dropoff + crew roster |
| **M065** | E2E Vercel live | Demo Livigno motoslitte + sitemap |

## 8. Demo Seed

3 experience demo:
- **Motoslitta Livigno** — timeslot_capacity, 5 posti/slot, 16:00/18:00/20:00, €89 adulto / €45 bimbo, guida + mezzo
- **Parco Avventura Lago** — timeslot_capacity, 30 slot 9-18, €25 adulto, età min 6, altezza 110cm, waiver
- **Noleggio Kayak Gardone** — asset_rental, pool 15 kayak + 8 SUP, delivery fee zone

## 9. Success Metrics

- 93/93 E2E PASS (stile M033-M037)
- RLS tenant isolation verified
- Sitemap experience URLs indexed
- Viator/GYG stub authentication OK
- Gift card `vertical='experience'` purchase E2E
- Partner commission 15% auto calc
- Waiver hash append-only audit
