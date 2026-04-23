# Architecture

## Visione

TouraCore e una piattaforma SaaS multi-verticale per il turismo italiano. Il modello di base e:

- una sola app web principale
- un core condiviso a package
- verticali separati ma riusabili
- multi-tenancy e scope per tenant/entity

## Struttura Del Monorepo

- `apps/web`
  Frontend Next.js App Router, route groups, server actions e suite Playwright.
- `packages/core/*`
  Moduli condivisi per auth, billing, booking, security, compliance, listings, media, portals, notifications, UI e altro dominio comune.
- `packages/db`
  Supporto database.
- `packages/config`, `packages/types`, `packages/booking-sdk`
  Config condivise, tipi e SDK.
- `verticals/hospitality`, `verticals/bike-rental`, `verticals/experiences`, `verticals/beach-club`
  Logica e materiale specifico di verticale.
- `supabase/`
  Migrazioni, config locale e seed.

## Confini Principali

### Web App

`apps/web` orchestri UI, route handlers e integrazione dei package. Evitare di lasciarci logica di dominio duplicata se puo vivere in un package condiviso.

### Core Packages

`packages/core/*` e il punto giusto per:

- logica di business riusabile
- contratti condivisi
- integrazioni trasversali
- UI condivisa

### Verticals

`verticals/*` contiene estensioni e comportamenti che non devono inquinare il core. Se un pattern serve a piu verticali, va promosso con cautela nel core.

### Database

Le variazioni di schema passano da `supabase/migrations`. Ogni cambiamento che tocca dati o permessi va valutato anche in chiave multi-tenant e backward compatibility.

## Flusso Di Lavoro Consigliato

1. identifica area impattata
2. controlla pattern simili gia presenti
3. modifica il punto piu locale possibile
4. esegui i check minimi
5. aggiorna la doc se cambia qualcosa di stabile

## Documenti Collegati

- [docs/conventions.md](/Users/briancortinovis/Documents/TouraCore/docs/conventions.md)
- [docs/testing.md](/Users/briancortinovis/Documents/TouraCore/docs/testing.md)
- [docs/runbook.md](/Users/briancortinovis/Documents/TouraCore/docs/runbook.md)
- [docs/reference/spec.md](/Users/briancortinovis/Documents/TouraCore/docs/reference/spec.md)

