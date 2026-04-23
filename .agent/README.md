# Antigravity Workspace

Questa cartella contiene la configurazione nativa di workspace per Google Antigravity.

## Struttura

- `rules/`: regole persistenti del workspace
- `workflows/`: prompt salvati richiamabili con `/`

## Come Usarla

- apri TouraCore come workspace in Antigravity
- controlla che le regole workspace siano caricate da `.agent/rules/`
- avvia un task in `Planning` per cambi strutturali o cross-package
- usa i workflow in `.agent/workflows/` per task ripetibili

## Principio

Le regole di Antigravity devono rimanere coerenti con:

- `CLAUDE.md`
- `docs/architecture.md`
- `docs/conventions.md`
- `docs/testing.md`
- `docs/agent-workflow.md`

Se cambia il workflow reale del progetto, aggiorna questi file prima delle regole Antigravity.

