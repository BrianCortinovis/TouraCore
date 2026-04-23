# Conventions

## Naming

- cartelle: `kebab-case`
- componenti React: `PascalCase.tsx`
- utility e moduli: `kebab-case.ts`
- tipi e interfacce: `PascalCase`
- costanti: `UPPER_SNAKE_CASE`
- tabelle database: `snake_case`

## Organizzazione Del Codice

- metti la logica riusabile nei package, non sparsa nelle route
- evita duplicazioni tra verticali e core
- non introdurre astrazioni nuove se un pattern locale basta
- riusa route groups, sidebar, action patterns e naming gia presenti

## Frontend

- preferisci Server Components dove possibile
- usa Client Components solo quando servono stato browser, eventi o effect
- mantieni espliciti tenant ed entity scope in route, form e link
- quando tocchi flussi utente, valuta Playwright o aggiorna i test esistenti

## Backend E Server Actions

- valida input esterni
- non spostare business logic importante direttamente nei componenti UI
- preserva i formati risposta gia usati
- fai attenzione a permessi, tenant scope e compatibilita dei contratti

## Database E Migrazioni

- ogni cambiamento schema passa da migrazione
- preferisci migrazioni additive
- documenta backfill o passaggi manuali quando servono
- non assumere dati perfettamente coerenti nei tenant esistenti

## Documentazione

- `CLAUDE.md` contiene solo memoria stabile e regole globali
- `docs/` contiene conoscenza viva e operativa
- `docs/reports/` contiene report storici
- `docs/backlog/` contiene gap ancora aperti o wiring non completato

## Granularita Dei Task

- un task, un obiettivo chiaro
- niente mix di refactor larghi con feature locali se non necessario
- quando una modifica e grande, spezzala in passaggi verificabili

