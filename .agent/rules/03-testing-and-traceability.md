# Testing And Traceability

- Ogni task deve chiudersi con check espliciti o con una spiegazione chiara del perche non sono stati eseguiti.
- Usa `docs/testing.md` per scegliere i comandi giusti.
- Comandi standard del repo:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test:unit`
  - `pnpm test:e2e`
  - `pnpm test:e2e:public`
  - `pnpm verify`
- Quando completi un task, lascia un closeout con:
  - file toccati
  - comandi eseguiti
  - test passati, falliti o saltati
  - rischi residui
- Se il task cambia workflow, architettura o convenzioni, aggiorna anche la documentazione del repo.

