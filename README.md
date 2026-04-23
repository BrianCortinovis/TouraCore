# TouraCore

Monorepo `pnpm` + `turbo` per TouraCore, piattaforma SaaS multi-verticale per il turismo con core condiviso, verticali dedicati e app web principale in `apps/web`.

## Quick Start

```bash
pnpm install
pnpm dev
```

Comandi base:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:unit`
- `pnpm test:e2e`
- `pnpm test:e2e:public`
- `pnpm verify`

## Struttura

- `apps/web`: app Next.js principale e test Playwright
- `packages/core/*`: moduli condivisi di dominio e infrastruttura
- `packages/db`: schema e supporto database
- `verticals/*`: logica e asset specifici di verticale
- `supabase/`: migrazioni e seed
- `docs/`: documentazione viva per team e agenti
- `CLAUDE.md`: memoria di progetto caricata da Claude Code
- `.claude/`: configurazione condivisa per Claude Code
- `.claude/README.md`: mappa della struttura Claude Code
- `.claude/rules/`: regole scoped per area
- `.claude/skills/`: playbook richiamabili anche con `/`
- `.claude/agents/`: subagenti di progetto per review e check
- `.agent/`: regole e workflow workspace per Antigravity
- `.mcp.json`: MCP di progetto

## Documenti Da Aprire Per Primi

- [CLAUDE.md](/Users/briancortinovis/Documents/TouraCore/CLAUDE.md)
- [.claude/README.md](/Users/briancortinovis/Documents/TouraCore/.claude/README.md)
- [docs/architecture.md](/Users/briancortinovis/Documents/TouraCore/docs/architecture.md)
- [docs/conventions.md](/Users/briancortinovis/Documents/TouraCore/docs/conventions.md)
- [docs/testing.md](/Users/briancortinovis/Documents/TouraCore/docs/testing.md)
- [docs/agent-workflow.md](/Users/briancortinovis/Documents/TouraCore/docs/agent-workflow.md)

## Documentazione

- [docs/runbook.md](/Users/briancortinovis/Documents/TouraCore/docs/runbook.md): setup, ambienti e routine operative
- [docs/reference/spec.md](/Users/briancortinovis/Documents/TouraCore/docs/reference/spec.md): specifica estesa di prodotto e architettura
- [docs/backlog/features-pending-wiring.md](/Users/briancortinovis/Documents/TouraCore/docs/backlog/features-pending-wiring.md): funzionalita backend gia pronte ma non ancora cablate in UI
- [docs/reports/e2e-test-results-2026-04-22.md](/Users/briancortinovis/Documents/TouraCore/docs/reports/e2e-test-results-2026-04-22.md): report storico e2e
- [docs/reports/knip-review-2026-04-21.md](/Users/briancortinovis/Documents/TouraCore/docs/reports/knip-review-2026-04-21.md): review storica di pulizia dipendenze
- [docs/reports/repo-history-journey.html](/Users/briancortinovis/Documents/TouraCore/docs/reports/repo-history-journey.html): explorer HTML professionale della storia git

## Regola Operativa

Quando una modifica cambia struttura, workflow, test o architettura:

1. aggiorna il codice
2. aggiorna la doc in `docs/`
3. aggiorna `CLAUDE.md` solo se cambia memoria stabile di progetto
