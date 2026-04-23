# Runbook

## Prerequisiti

- Node.js compatibile con il workspace
- `pnpm` disponibile
- eventuali variabili ambiente locali per Next.js, Supabase, Stripe e Resend

## Installazione

```bash
pnpm install
```

## Sviluppo

```bash
pnpm dev
```

Per la web app direttamente:

```bash
pnpm --dir apps/web dev
```

## Check Rapidi

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm verify
```

## E2E

Locale con dev server automatico da Playwright:

```bash
pnpm test:e2e
```

Contro ambiente pubblico:

```bash
pnpm test:e2e:public
pnpm test:e2e:m080
```

## Database

- migrazioni in `supabase/migrations`
- seed in `supabase/seeds`
- prima di cambiare schema, valuta impatto su multi-tenancy, policy e route esistenti

## Quando Aggiornare La Documentazione

Aggiorna `docs/` quando cambi:

- struttura cartelle o package
- comandi di sviluppo o test
- convenzioni operative
- architettura condivisa
- flussi agent-first che vuoi mantenere nel tempo

## Dove Mettere Cose Nuove

- nuova conoscenza stabile: `docs/`
- report puntuale o audit: `docs/reports/`
- backlog o gap noti: `docs/backlog/`
- memoria agente condivisa: `CLAUDE.md` o `.claude/rules/`

