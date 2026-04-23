# TouraCore Memory

## Scopo

TouraCore e un monorepo multi-verticale per il turismo. La repo contiene una web app Next.js, moduli core condivisi, verticali dedicati e supporto Supabase.

Stato: **M001-M106 completate** (mix GSD/ChatGPT/Claude, disordine tracking pre-M107). Da M107 in poi tracking ordinato — vedi `docs/PROGETTO-STORIA.md` per storia completa e convenzioni.

## Mappa Rapida

- `apps/web`: UI, route handlers, server actions, Playwright e flussi utente
- `packages/core/*`: logica condivisa per auth, booking, billing, compliance, media, notifications, security, UI
- `packages/db`: supporto database
- `verticals/*`: logica e asset specifici di verticale
- `supabase/migrations`: evoluzione schema
- `docs/`: documentazione viva

## Come Lavorare

- Parti sempre dal package, verticale o route group impattato.
- Per modifiche cross-package o architetturali, fai prima un piano breve.
- Preferisci modifiche piccole, locali e reversibili.
- Riusa pattern e naming gia presenti prima di introdurre nuove astrazioni.
- Se cambi struttura repo, workflow o convenzioni, aggiorna la documentazione in `docs/`.

### Quando usare GSD vs Claude normale

- **Claude normale (commit diretto su main)**: bugfix, piccole feature, rename, refactor locale, docs, fix UI.
- **GSD milestone** (`gsd_plan_milestone` + slice + `gsd_complete_milestone`): feature grossa multi-pacchetto, nuovo modulo, nuovo verticale, migrazione importante.
- Regola pratica: se non riesci a descriverlo in un commit title, è una milestone GSD.
- Numerazione milestone: prossima libera dopo M106.

### Convenzione commit (Conventional Commits)

Formato: `tipo(scope): descrizione breve in italiano`.

Tipi: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.
Scope comuni: `stays`, `dine`, `rides`, `activities`, `agency`, `platform`, `auth`, `billing`, `compliance`, `db`, `ui`, `middleware`, `ci`.

Per slice GSD: `feat(scope): M107 S01 descrizione`.

## Guardrail Architetturali

- Mantieni espliciti tenant scope ed entity scope.
- Valida input esterni e server actions con Zod o pattern gia presenti.
- La business logic riusabile deve stare in package o moduli condivisi, non duplicata in pagine o componenti.
- Le modifiche database passano da `supabase/migrations`.
- Non introdurre nuovi framework di test o state management senza forte motivo.

## Verifica Minima

- Base: `pnpm lint` e `pnpm typecheck`
- Logica pura o compliance: `pnpm test:unit` (solo `@touracore/compliance`)
- UI e flussi web: `pnpm test:e2e` o `pnpm test:e2e:public` — dettagli in `docs/testing.md`
- Full check: `pnpm verify` = lint + typecheck + test:unit
- Se un check non viene eseguito, spiega sempre cosa manca e perche

## Regole Scoped

Claude applica automaticamente in base al path modificato:

- `.claude/rules/backend.md` — packages core, db, verticals, route handlers
- `.claude/rules/frontend.md` — apps/web .ts/.tsx
- `.claude/rules/migrations.md` — supabase/migrations, packages/db
- `.claude/rules/tests.md` — e2e, .test.ts, .spec.ts

## Output Atteso

Quando chiudi un task:

1. riassumi scope e aree toccate
2. indica i comandi eseguiti
3. segnala test passati o saltati
4. evidenzia rischi residui o follow-up

## Per Sessioni Con Agenti

- Claude Code: usa `CLAUDE.md` per memoria stabile, `.claude/rules/` per regole mirate e `.claude/skills/` per procedure ripetibili.
- Antigravity: usa task piccoli, review degli artifact e aggiorna `docs/` quando emerge conoscenza stabile che non deve restare solo nella knowledge base del tool.

