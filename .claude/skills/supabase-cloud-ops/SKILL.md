---
name: supabase-cloud-ops
description: Esegui operazioni reali sul Supabase cloud TouraCore via Management API (push migration, query SQL, verifica schema). Usalo quando serve applicare una migration, lanciare query di verifica o ispezione DB, eseguire seed/reset, o controllare stato cloud. NON serve `supabase login` né `SUPABASE_ACCESS_TOKEN` esposto.
---

# Supabase Cloud Ops

Operazioni dirette su Supabase cloud TouraCore senza esporre credenziali. Sfrutta il fatto che `apps/web/.env.local` contiene `SUPABASE_ACCESS_TOKEN` e bash può leggerlo per costruire chiamate Management API senza che il token attraversi mai il context.

## Pattern di accesso

Il token sta in `/Users/briancortinovis/Documents/TouraCore/apps/web/.env.local` come `SUPABASE_ACCESS_TOKEN=sbp_...`. Non leggerlo mai con `Read`/`cat`/`grep` diretto sul file (permission deny). Lascialo attraversare uno script bash che lo estrae al volo.

**Project ref**: `dysnrgnqzliodqrsohoz` (TouraCore dev/prod unico).
**Endpoint Management API**: `https://api.supabase.com/v1/projects/{ref}/database/query`.
**Auth header**: `Authorization: Bearer $TOKEN`.
**Body**: `{"query": "<SQL string>"}` JSON.

## Template operazioni

### A) Applicare una migration

Crea uno script temporaneo `/tmp/apply_NNNNN.sh`, eseguibile, che legge token + payload + cura:

```bash
#!/usr/bin/env bash
set -euo pipefail
PROJECT_REF="dysnrgnqzliodqrsohoz"
ENV_FILE="/Users/briancortinovis/Documents/TouraCore/apps/web/.env.local"
MIGRATION="/Users/briancortinovis/Documents/TouraCore/supabase/migrations/NNNNN_name.sql"
ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "$ENV_FILE" | cut -d= -f2-)
PAYLOAD=$(jq -Rs '{query: .}' "$MIGRATION")
RESP=$(curl -s -X POST "https://api.supabase.com/v1/projects/$PROJECT_REF/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD")
echo "$RESP"
echo "$RESP" | grep -q '"message":"Failed\|error' && { echo FAIL; exit 1; } || echo OK
```

Poi `chmod +x` e esegui. Migration additive: payload `[]` significa successo (nessuna riga ritornata).

### B) Query di verifica/ispezione

Inline (no file SQL):

```bash
#!/usr/bin/env bash
set -euo pipefail
ACCESS_TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' "/Users/briancortinovis/Documents/TouraCore/apps/web/.env.local" | cut -d= -f2-)
QUERY="SELECT count(*) FROM tenants WHERE is_active=true;"
PAYLOAD=$(jq -n --arg q "$QUERY" '{query: $q}')
curl -s -X POST "https://api.supabase.com/v1/projects/dysnrgnqzliodqrsohoz/database/query" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$PAYLOAD"
```

Risposta è JSON array: `[{"count": 42}]` o `[]` se la query non ritorna righe.

### C) Multi-statement (DDL+DML)

Management API accetta query multi-statement separate da `;`. Per migration grosse usa file `.sql` come template A.

## Guardrail OBBLIGATORI

- **MAI eseguire script altrui senza leggerlo prima**. Esempio: `scripts/demo-seed/run.sh` ha un wipe distruttivo come step 1. Lo "verifico esistenza" tramite `head -3` con pipefail può bastare a triggare lo step 1 prima del kill SIGPIPE. Se devi solo verificare un pattern, leggi il file con `Read`, non eseguirlo.
- **Conferma con utente prima di** DELETE/TRUNCATE/DROP, reset seed, modifiche su prod. Anche se "siamo in dev" sul project_ref `dysnrgnqzliodqrsohoz` — chiedi.
- **Mai loggare il token** in output. `set -x` nel bash espone tutto. Cattura `RESP` in variabile, mostra solo result body.
- **Idempotenza**: preferisci `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`. Migration TouraCore segue già questa regola.
- **Verifica post-apply**: dopo migration esegui template B con `SELECT column_name FROM information_schema.columns WHERE table_name='X'` o `information_schema.views` per confermare schema cambiato.

## Quando usare

- Utente chiede "applica la migration XXX su cloud"
- Utente chiede "verifica se la tabella/colonna X esiste"
- Devi controllare stato dati pre-fix (es. quante reservations, quanti tenant attivi)
- Devi seedare dati di test (preferendo script idempotenti già esistenti)
- Devi eseguire RPC custom o query di debug

## Quando NON usare

- Modifica dati produzione senza esplicita autorizzazione utente
- Reset/wipe dati senza conferma
- Quando basta `pnpm typecheck` o lettura locale dei file migration

## Cleanup

Gli script in `/tmp/apply_*.sh` e `/tmp/verify_*.sh` sono usa-e-getta. Lasciali pure, /tmp viene pulito dal sistema. Non committare mai script che leggono il token dentro il repo (mai `scripts/` o `apps/`).
