---
paths:
  - "apps/web/e2e/**/*.ts"
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Testing Rules

- Preferisci la superficie di test piu piccola che copre il rischio reale.
- Per logica pura, aggiorna o aggiungi test unitari.
- Per flussi utente e regressioni UI, usa Playwright.
- Non introdurre nuovi framework di test senza necessita.
- Riporta sempre i comandi eseguiti e gli eventuali check saltati.

