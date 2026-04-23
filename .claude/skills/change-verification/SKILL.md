---
name: change-verification
description: Verifica una modifica in TouraCore prima di chiudere il task. Usalo per feature, bugfix, refactor locali e review finali.
---

# Change Verification

Segui questa procedura:

1. individua package, route, verticale e dati impattati
2. scegli i check minimi leggendo [docs/testing.md](../../../docs/testing.md)
3. esegui i comandi rilevanti
4. annota pass, fail e skip con motivazione
5. se la modifica cambia struttura, workflow o architettura, aggiorna anche `docs/` o `CLAUDE.md`
6. chiudi il task con:
   - aree toccate
   - comandi eseguiti
   - esito dei check
   - rischi residui
