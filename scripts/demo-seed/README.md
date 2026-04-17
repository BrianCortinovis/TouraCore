# Demo seed — briansnow86

Popola tenant `briansnow86@gmail.com` con 7 strutture (una per `property_type`), camere, rate plan, upsell, servizi extra, ospiti simulati e reservations Q2–Q4 2026 (~70% occupancy mista: adulti/bambini/pet, canali vari, stati vari, tasse/commissioni/pagamenti/fatture).

Tutto marcato con tag `demo_seed_v1` in `entities.description` e `reservations.internal_notes` per reset sicuro.

## File

- `01_reset.sql` — wipe solo dati demo del tenant (idempotente)
- `02_seed_structures.sql` — 7 entities + accommodations + rooms + rate_plans + rate_prices + seasons + upsell_offers + tourist_tax_rates
- `03_seed_reservations.sql` — guests + reservations + payments + invoices + upsell_orders + tourist_tax_records
- `run.sh` — esegue tutto in ordine
- `reset.sh` — reset veloce

## Uso

```bash
# Popola (wipe + seed)
./run.sh

# Torna a DB vuoto (solo tenant demo)
./reset.sh
```

## Tenant

- `tenant_id`: `89147f14-711e-4195-8e82-dd54f24e9457`
- `user_id`: `1aa4c680-aab3-46cc-8b5f-37e334470d2b`
- slug: `villa-irabo`
