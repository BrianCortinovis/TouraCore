# Agent Workflow

## Obiettivo

Usare bene sia Claude Code sia Antigravity senza lasciare conoscenza importante solo dentro una sessione o dentro artifact temporanei.

## Claude Code

Usa Claude Code per:

- capire la codebase rapidamente
- fare modifiche precise e review-oriented
- aggiornare memoria di progetto tramite `CLAUDE.md`
- applicare regole scoped tramite `.claude/rules/`
- codificare workflow ripetibili tramite `.claude/skills/`
- delegare verifiche e review ripetitive a `.claude/agents/`

Routine consigliata:

1. apri `CLAUDE.md`
2. consulta i doc in `docs/`
3. fai un piano corto per task non banali
4. modifica il minimo necessario
5. esegui i check rilevanti
6. aggiorna doc e memoria stabile se serve

Skill pratiche per Claude Code:

- `/start-task`: orientamento iniziale e piano breve
- `/bug-triage`: triage ordinato di bug e regressioni
- `/change-verification`: check finali e chiusura task

## Antigravity

Usa Antigravity per:

- task lunghi o paralleli
- bug fixing con browser + terminal + editor
- workflow in cui vuoi artifact verificabili
- review asincrona di screenshot, piani, diff e test report

Routine consigliata:

1. dai task piccoli e separati
2. fai revisionare gli artifact prima del merge
3. usa Manager View per lavori lunghi e multi-step
4. usa Editor View per rifiniture locali
5. sposta nel repo la conoscenza stabile emersa dal task

## Regola D'Oro

La knowledge base del tool aiuta, ma la memoria davvero durevole deve stare nel repository:

- `CLAUDE.md` per regole globali di progetto
- `.claude/rules/` per regole scoped
- `.claude/skills/` per procedure riusabili
- `.claude/agents/` per subagenti specializzati di progetto
- `.agent/rules/` per regole native di workspace in Antigravity
- `.agent/workflows/` per prompt salvati richiamabili con `/` in Antigravity
- `docs/` per architettura, runbook, testing e backlog

## Workspace Antigravity

Questo repo include anche una configurazione nativa per Antigravity:

- `.agent/rules/`
  Regole persistenti del workspace. Devono restare brevi, operative e allineate alla documentazione vera del repo.
- `.agent/workflows/`
  Prompt salvati da usare con `/` quando inizi un task, chiudi un task o fai debug.

Routine consigliata in Antigravity:

1. apri il workspace di TouraCore
2. avvia una conversazione in `Planning`
3. richiama un workflow con `/start-task` o `/investigate-bug`
4. fai review degli artifact prima del merge
5. se emerge conoscenza stabile, aggiornala nel repo e non solo nella knowledge base del tool

## Tracciamento Dei Task

Per ogni task importante lascia traccia in almeno uno di questi modi:

- commit chiari e piccoli
- artifact review in Antigravity
- aggiornamento documentazione se cambia qualcosa di stabile
- report di test nel closeout

## Checklist Finale

- scope chiaro
- file toccati coerenti con il task
- check eseguiti
- artifact o prove disponibili
- documentazione aggiornata se necessario
