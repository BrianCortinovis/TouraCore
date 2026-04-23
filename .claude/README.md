# .claude

Questa cartella contiene solo materiale operativo per Claude Code in VS Code e CLI.

## Struttura

- `settings.json`: impostazioni condivise del progetto e permessi utili ricorrenti
- `settings.local.json`: preferenze locali personali, non versionate
- `rules/`: regole mirate per area della codebase
  - `backend.md`, `frontend.md`, `migrations.md`, `tests.md`
- `skills/`: procedure riusabili richiamabili anche con `/`
  - `start-task`, `bug-triage`, `change-verification`, `add-migration`
- `agents/`: subagenti di progetto per task ripetitivi
  - `touracore-check-runner` (haiku), `touracore-reviewer` (sonnet)

## Regola pratica

Dentro `.claude` devono stare solo file che aiutano davvero Claude a lavorare meglio nel repository.

Non usare `.claude` per:

- mockup HTML
- documentazione umana di prodotto
- report storici
- note temporanee di task

Per questi contenuti usa `docs/`.

## Convenzione consigliata

- fatti stabili del progetto: `CLAUDE.md`
- regole scoped: `.claude/rules/`
- playbook operativi: `.claude/skills/`
- worker specializzati: `.claude/agents/`
- documentazione per umani e team: `docs/`

## Nota Su Commands

Claude Code supporta ancora `.claude/commands/`, ma oggi il formato consigliato e `skills/` perche funziona sia come comando `/nome-skill` sia come procedura richiamabile automaticamente quando serve.
