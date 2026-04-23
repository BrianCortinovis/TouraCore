# Beach Club Vertical: market scan + product blueprint

Updated: 2026-04-23

## Executive summary

The market for software dedicated to stabilimenti balneari is already active and fairly mature. This is not a greenfield category.

That is good news for TouraCore:

- it confirms that `beach_club` is a real standalone vertical, not just a small `hospitality` add-on
- it gives us a clear parity baseline
- it shows a large whitespace: very few products seem strong on multi-vertical orchestration across stays, activities, beach club, vouchers, and one unified guest portal

Recommendation:

- keep `hospitality` beach-service support for hotels/residence with optional lido access
- create a dedicated first-class module `beach_club` for operators whose core business is the stabilimento balneare
- position TouraCore as the suite that connects beach club + stays + experiences + food/service into one tenant and one guest journey

## Current market reality

As of 2026-04-23, there are already several beach-club/stabilimento products live:

- Easy Beach: map, bookings, payments, client archive, QR bar ordering, seasonal subletting
- BeachPass: bookings, entrances, rentals, seasonal pricing, multi-device operation, backups
- Okbeach.it: occupancy control, online booking, mobile app, staff attendance, WhatsApp-style smart booking, review funnel, dynamic pricing
- Spiagge.it / Data Italia: management + online marketplace reach, vouchers, discounts, fiscal printer compatibility, role-based access
- SGS Beach / Top Spiagge: visual map, seasonal subscriptions, instant check-in/out, bar & restaurant flow from the umbrella
- qSpiaggia: drag-and-drop map editor, zones, live state, packages, batch fill, multi-payment, conventions, reporting, multi-tenant, roles, audit trail, Stripe
- SmartBeach: detailed beach board with client, payment, arrival, voucher and next reservation visibility on each umbrella/cabin
- Skiply: guest app, digital receipt, QR ordering, fast entry, extra activities
- RealTime Reservation / Beachy: international resort-grade pool/beach booking, dynamic pricing, day pass, ancillary packages, geospatial mapping, PMS integration, room charge

## Competitor feature baseline

### Italian competitors

#### Easy Beach

Observed from the public site:

- interactive beach map
- daily, weekly, and seasonal bookings
- client archive with booking/payment history
- direct online bookings
- QR bar ordering from the umbrella
- seasonal umbrella subletting

Source:

- https://www.easybeach.pro/

#### BeachPass

Observed from the public site:

- bookings and entrances
- umbrella/equipment rentals
- price lists by period
- customer payment status
- operation from PC, smartphone, and tablet
- optional server for multi-device and automatic backups

Source:

- https://www.beachpass.it/

#### Okbeach.it

Observed from the public site:

- occupancy monitoring
- stock/movements/incassi/bookings
- self-booking of preferred spots
- upsell of experiences
- branded mobile app
- virtual clock-in for staff attendance
- WhatsApp-like smart booking
- WhatsApp-driven review funnel
- dynamic pricing, offers, coupons, upsell/cross-sell

Source:

- https://www.okbeach.it/

#### Spiagge.it / Data Italia

Observed from the public site:

- management + marketplace exposure
- umbrella/lettino/services organization
- vouchers, conventions, discounts, daily credits
- interactive map
- compatibility with fiscal printers
- access from PC, smartphone, and tablet
- per-employee customizable functionality

Source:

- https://www.dataitaliasrl.it/sistemi-e-soluzioni/soluzioni-e-software-stabilimenti-balneari/spiagge-it-gestionale-e-booking/

#### SGS Beach / Top Spiagge

Observed from the public site:

- H24 online booking
- visual map with live occupation states
- seasonal subscriptions
- check-in/check-out on the map
- integrated bar/restaurant orders from the umbrella

Source:

- https://www.sgs-software.com/sgsbeach/

#### qSpiaggia

Observed from the public site:

- interactive beach map
- drag-and-drop layout editor
- zones for beach, pool, solarium
- real-time state
- blockable spots
- quick sales from map
- accessories and package sales
- batch fill/riempimento
- multi-payment
- customer discounts and conventions
- dynamic tariffs by season, weekday/holiday, morning/afternoon, row/zone
- statistics and report exports
- active seasonal subscriptions
- multi-tenant support
- roles, audit trail, backups
- Stripe configuration for online booking

Source:

- https://flavioperrone.it/qspiaggia/

#### SmartBeach

Observed from the public site:

- beach board with umbrella number
- customer name
- arrival/departure dates
- assigned offer
- number of lettini/sdraio/sedie
- voucher number
- whether the guest has arrived
- whether the booking has been paid
- next booking visibility on the same umbrella/cabin

Source:

- https://www.g3cube.net/smartbeach/

#### Skiply

Observed from the public site:

- customer-facing online reservation and payment
- digital receipt for faster entry
- QR ordering at tables
- extra activities such as pedalos, cabins, hot tubs, bikes, sports areas

Source:

- https://www.skiply.it/

### International resort-grade signals

#### RealTime Reservation

Observed from the public site:

- beach and pool booking for cabanas, umbrellas, loungers, daybeds
- day pass support
- interactive guest-facing maps
- dynamic pricing
- packages and ancillary revenue capture
- pre-arrival monetization
- guest customizations
- real-time operator control

Source:

- https://www.realtimereservation.com/pool-beach/

#### Beachy

Observed from the public site:

- single-day and multi-day booking
- reserve amenities like chairs, cabanas, jet skis, paddle boards
- multiple payment options including room charge
- geospatial custom mapping
- staff visibility into exact seating
- inventory/sales tracking
- PMS integration

Source:

- https://www.beachyapp.com/solutions/guest-booking/

## What the market now expects by default

To be credible in this category, `beach_club` needs all of this at minimum:

- interactive visual map
- daily, half-day, multi-day, and seasonal bookings
- umbrellas, lettini, sdraio, cabins, gazebos, cabanas, daybeds as first-class inventory
- occupancy and payment states directly on the map
- online self-booking and direct payments
- walk-in selling from the map
- vouchers, conventions, discounts, and promo logic
- QR ordering / service requests from the spot
- customer CRM and payment history
- role-based staff access
- reporting and seasonal analytics
- mobile-friendly staff operation

To feel premium rather than commodity, it also needs:

- drag-and-drop map editor
- dynamic pricing by zone/row/season/time-band/occupancy
- seasonal-pass release/sublet logic
- package selling and upsell/cross-sell
- branded guest app or progressive web experience
- waitlist / no-show / check-in automation
- multi-lido support under one tenant or one group

## TouraCore opportunity

Most competitors appear strong on single-vertical beach operations, but weak on unified tourism orchestration.

TouraCore can win if `beach_club` is not just another umbrella-booking tool, but the beach module inside a broader tourism operating system:

- one tenant can run beach club + hospitality + experiences + restaurant/bar
- one guest profile can book umbrella, room, kayak, dinner, and spa/service extras
- one voucher/gift card/loyalty wallet can move across the tenant
- one portal can upsell beach access to hotel guests and stays/experiences to beach customers
- one back office can manage billing, payments, compliance, CRM, and reporting

That is the real moat.

## Product recommendation

### Module identity

- module code: `beach_club`
- entity kind: `beach_club`
- route vertical: `beach`
- label: `Stabilimento balneare`
- positioning: operational PMS + guest booking + revenue layer for beach clubs, lidos, beach resorts, solarium/pool clubs

### Product rule

Do not overload `hospitality` with this domain.

`hospitality` should keep:

- beach service as an optional add-on for stays
- simple beach-access upsell for hotels/residence

`beach_club` should own:

- the actual beach inventory
- visual map and seat assignment
- seasonal contracts
- operational dispatch
- direct walk-in and direct-to-spot commerce

## Proposed data model

### Core extension table

`beach_clubs`

- `id` = FK to `entities.id`
- `tenant_id`
- `parent_entity_id` nullable for resort/hospitality linkage
- `beach_type` (`private_beach`, `lido`, `pool_club`, `solarium`, `mixed`)
- `opening_calendar`
- `opening_hours`
- `checkin_policy`
- `weather_policy`
- `cancellation_policy`
- `deposit_policy`
- `service_fee_policy`
- `minimum_spend_policy`
- `fnb_config`
- `parking_config`
- `settings`

### Map + layout

`beach_layouts`

- versioned layout metadata
- active draft/published versions
- background image / SVG / dimensions / orientation

`beach_zones`

- sectors like `front_row`, `second_row`, `vip`, `gazebo_area`, `family_area`, `pool`, `solarium`, `event_area`
- zone rules
- visibility rules
- pricing class

`beach_units`

- sellable unit inventory
- unit type: `umbrella_set`, `gazebo`, `cabana`, `daybed`, `sunbed`, `cabin`, `locker`, `table`, `parking_spot`
- map coordinates and geometry
- zone
- row / column / human label
- capacity
- included accessories
- online visibility
- maintenance / blocked / offline status
- tags like `near_sea`, `family`, `accessible`, `shade`, `pet_friendly`, `vip`

`beach_unit_accessories`

- default included or optional equipment
- e.g. umbrella + 2 beds, extra chair, towel kit, safe box

### Reservation and passes

`beach_reservations`

- reservation header
- booking type: `daily`, `half_day`, `multi_day`, `seasonal`, `subscription`, `event_pass`
- source: `walk_in`, `direct_web`, `staff`, `partner`, `hotel_bundle`, `marketplace`
- customer / guest profile
- status: `draft`, `hold`, `confirmed`, `checked_in`, `checked_out`, `no_show`, `canceled`
- date range / time band
- payment status
- deposit info
- weather fallback info

`beach_reservation_lines`

- one row per unit or add-on
- selected unit
- accessory quantities
- unit price
- rule snapshot
- minimum spend snapshot for gazebo/cabana/daybed style products

`beach_pass_products`

- product catalog for day pass, morning pass, afternoon pass, sunset pass, seasonal pass, membership, resident pass, event package

`beach_memberships`

- recurring or seasonal entitlements
- usage rules
- family/group memberships
- reserved unit rights vs floating rights

`beach_season_assignments`

- fixed seasonal allocation to a unit or zone
- holder identity
- allowed transfer rules
- release windows

`beach_sublet_windows`

- controlled release/resale of unused seasonal days
- operator-controlled pricing split and commissions

### Commerce and service

`beach_orders`

- F&B and service orders
- linked to unit, table, or roaming delivery point
- status pipeline
- prep and delivery timestamps

`beach_service_requests`

- towel change, umbrella opening, extra bed, cleaning, maintenance, lost & found, assistance

`beach_price_rules`

- by season/date range
- weekday/holiday
- morning/afternoon/full-day
- zone/row/unit type
- occupancy thresholds
- membership / partner convention
- hotel guest vs external guest

`beach_blackouts`

- maintenance
- private events
- weather blocks
- concession limits

### Check-in and operations

`beach_checkins`

- operator, timestamp, pax, wristband/token if used

`beach_staff_tasks`

- delivery, setup, runner tasks, issue resolution

## Inventory model

The module should treat these as first-class rentable units, not generic extras:

- umbrella set
- umbrella only
- sunbed / lettino
- sdraio
- chair
- gazebo
- cabana
- daybed
- cabin / changing cabin
- locker
- pool bed
- table service area
- parking spot

Each unit should support:

- capacity
- included items
- optional add-ons
- service radius / delivery area
- availability windows
- online visibility
- maintenance blocks
- customer-facing photo/media

## Map editor requirements

The map is the heart of the product.

Required:

- drag-and-drop layout editor
- row/column generation tools
- zone drawing tools
- support for umbrella clusters and premium structures
- manual placement for gazebos/cabanas/daybeds
- background image or vector support
- real-time occupancy states
- filters by date, zone, unit type, paid/unpaid, arrival/no-show
- mobile-friendly map view for staff
- print/export mode for operations

On-map tile/card should show:

- unit code
- unit type
- guest/customer name
- date/time band
- paid / deposit / balance due
- arrived / checked-in
- accessories included
- notes / allergies / VIP flags
- next reservation on the same unit

## Pricing engine requirements

To reach parity or better than the market, pricing must support:

- season-based pricing
- weekday vs weekend/holiday
- morning / afternoon / full-day
- multi-day discounts
- zone and row premium
- unit-type premium
- occupancy-based yield pricing
- resident / local / hotel guest / loyalty / partner pricing
- voucher, coupon, and convention pricing
- minimum spend logic for gazebos, cabanas, daybeds
- add-on bundles
- bad-weather refund/voucher logic

Recommended advanced rules:

- weather-triggered protection rules
- shoulder-season auto-discount
- last-minute fill rules
- release unsold premium inventory into lower tiers near opening time

## Reservation flows

### Public direct booking

- customer picks date and time band
- sees map availability
- selects umbrella/gazebo/cabana/daybed
- adds accessories and services
- pays full or deposit
- receives QR confirmation

### Walk-in quick sale

- operator opens map
- taps free unit
- selects quick tariff
- adds cash/card split payment
- checks guest in instantly

### Seasonal holder

- assign fixed unit for season
- define allowed family members/guests
- define release windows
- allow operator-managed resale/sublet for unused dates

### Bundle flow

- hotel guest gets preferred beach inventory or discounted pricing
- experience booking can upsell umbrella/daybed
- beach booking can upsell bike, parking, aperitivo, dinner, sunset event

## Operational modules / UI surface

Recommended admin navigation:

- `Panoramica`
- `Mappa Spiaggia`
- `Prenotazioni`
- `Abbonamenti & Stagionali`
- `Clienti`
- `Ordini & Servizi`
- `Prezzi, Coupon & Convenzioni`
- `Check-in`
- `Report`
- `Marketplace & Canali`
- `Impostazioni`

Recommended public surface:

- beach booking page with interactive map
- filters by zone, distance from sea, accessibility, family/VIP
- hotel guest recognition
- bundle builder
- upsell flow after booking
- QR guest area for service requests and reorders

## Reports and KPIs

Minimum reporting set:

- occupancy by zone/row/day
- ADR-equivalent by unit type
- revenue per umbrella / gazebo / cabana / daybed
- seasonal pass utilization
- ancillary revenue by area
- no-show rate
- deposit conversion
- average spend per guest
- weather impact analysis
- staff productivity

## Integrations

Priority integrations:

- Stripe for deposits and full payments
- QR ordering with internal F&B flow
- fiscal receipts / printers where applicable
- WhatsApp notifications
- email confirmations
- weather provider
- optional marketplace connectors

TouraCore-native integration opportunities:

- shared vouchers/gift cards
- shared loyalty
- shared CRM profile
- shared reporting across verticals
- shared tenant billing
- shared partner/agency layer

## Differentiators TouraCore should add on day one

These are the features that can move us from parity to superiority:

- unified guest profile across `hospitality`, `experiences`, and `beach_club`
- cross-vertical packages in one checkout
- tenant-wide wallet / credits / vouchers
- hotel guest privileges on beach inventory
- beach booking upsell of experiences and dining
- cross-entity operational dashboard for resort-like tenants
- white-label agency support for groups managing many operators

## MVP recommendation

### Phase 1: market parity

- module activation + onboarding
- beach extension table
- interactive map
- core unit inventory
- daily/half-day/multi-day bookings
- seasonal assignment
- direct booking + Stripe deposit
- walk-in selling
- payment states
- customer archive
- basic reports

### Phase 2: operational depth

- QR service requests and QR ordering
- dynamic pricing
- coupons/conventions
- sublet/release logic for seasonal holders
- staff task dispatch
- multi-lido management
- branded guest PWA

### Phase 3: suite advantage

- bundle stays + experiences + beach
- marketplace connectors
- unified loyalty/wallet
- weather automation
- advanced yield pricing
- premium minimum-spend products for gazebos/cabanas/daybeds

## Implementation touchpoints in the current codebase

Based on the current TouraCore structure, implementation will likely touch:

- `supabase/migrations`:
  - extend `entities.kind`
  - add `module_catalog` entry
  - add `beach_club` extension tables
- `packages/core/billing/src/types.ts`
- `packages/core/auth/src/permissions.ts`
- `apps/web/src/lib/module-guard.ts`
- `apps/web/src/lib/documents-guard.ts`
- `apps/web/src/app/(auth)/onboarding/step-3/kind-actions.ts`
- `apps/web/src/app/(app)/[tenantSlug]/new/page.tsx`
- `apps/web/src/app/(app)/[tenantSlug]/page.tsx`
- new package:
  - `verticals/beach-club`
- new route family:
  - `apps/web/src/app/(app)/[tenantSlug]/beach/...`

## Final recommendation

Build `beach_club` as a first-class professional vertical.

If we only copy competitors, we reach parity.
If we connect beach club to the rest of TouraCore, we create a stronger category:

- one suite for hotels
- one suite for experiences
- one suite for beach clubs
- one shared guest journey

That is the product worth building.
