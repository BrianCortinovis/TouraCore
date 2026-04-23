---
paths:
  - "apps/web/**/*.ts"
  - "apps/web/**/*.tsx"
---

# Frontend Rules

- Preferisci Server Components dove possibile.
- Usa Client Components solo quando servono stato browser, eventi o effect.
- Mantieni espliciti tenant scope ed entity scope in route, action e link.
- Riusa pattern esistenti di route groups, sidebar e componenti prima di crearne di nuovi.
- Quando cambi flussi utente o pagine visibili, valuta l'aggiornamento dei test Playwright.

