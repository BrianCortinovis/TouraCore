---
name: bug-triage
description: Triage strutturato di bug in TouraCore. Usalo per errori UI, regressioni di route, test falliti o problemi backend.
---

# Bug Triage

Segui questa procedura:

1. descrivi il sintomo in una frase
2. individua il perimetro: route, package, verticale, migrazione o integrazione
3. formula 2 o 3 ipotesi realistiche
4. verifica prima con lettura codice e test mirati, poi con check piu ampi solo se servono
5. proponi il fix piu piccolo che riduce il rischio
6. chiudi con causa probabile, fix, check eseguiti e rischio residuo

Quando possibile:

- cerca un comportamento simile gia funzionante nella repo
- evita refactor larghi se il problema e locale
- aggiorna i test solo nella superficie davvero coinvolta
