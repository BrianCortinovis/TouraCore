---
paths:
  - "packages/core/**/*.ts"
  - "packages/db/**/*.ts"
  - "verticals/**/*.ts"
  - "apps/web/src/app/**/*.ts"
---

# Backend Rules

- Valida input esterni e server actions.
- Mantieni la business logic riusabile nei package condivisi quando possibile.
- Non bypassare tenant scope, entity scope o controlli permessi gia presenti.
- Preserva i contratti di risposta e i pattern di errore gia usati dal progetto.
- Se una logica serve a piu verticali, valuta se deve vivere nel core invece che in una sola area.

