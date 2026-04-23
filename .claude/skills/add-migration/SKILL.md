---
name: add-migration
description: Aggiungi una migration Supabase in TouraCore rispettando naming, scope e compatibilità dati. Usalo quando il task richiede modifiche schema, RLS, view, RPC o seed.
---

# Add Migration

Procedura:

1. leggi l'ultima migration in `supabase/migrations/` per dedurre il prossimo numero (formato `NNNNN_nome_snake.sql`)
2. scrivi la migration additiva quando possibile: aggiungi colonne nullable o con default, non drop senza backfill
3. mantieni RLS coerente: ogni tabella tenant-scoped deve avere policy su `tenant_id`
4. se aggiungi RPC o view, valuta `SECURITY DEFINER` solo con motivo esplicito
5. documenta nel file SQL stesso: commento in testa con scopo e impatto (1-3 righe)
6. indica quali package, route o verticali dipendono dal cambiamento
7. dopo la migration, aggiorna i tipi TypeScript se `packages/db` genera types

Guardrail:

- non rinominare colonne senza piano di rollout a due step
- non modificare migration già applicate in cloud — creane una nuova
- backfill pesanti vanno separati dalla migration DDL quando possibile
- seed di demo/test restano in migration dedicate, non mescolate con schema

Output atteso alla chiusura:

- numero e nome migration
- tabelle/RLS/RPC toccate
- impatti a valle (package, route, verticals)
- comando di verifica (`pnpm typecheck` + eventuale `pnpm test:unit`)
