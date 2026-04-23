---
paths:
  - "supabase/migrations/**/*.sql"
  - "packages/db/**/*.ts"
---

# Migration Rules

- Preferisci migrazioni additive e compatibili con dati esistenti.
- Documenta backfill, default e passi manuali quando necessari.
- Considera sempre impatto su multi-tenancy, permessi e rollout.
- Dopo modifiche schema, esplicita quali package, route o verticali dipendono dal cambiamento.

