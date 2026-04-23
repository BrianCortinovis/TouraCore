# Testing

## Obiettivo

Avere una superficie di verifica chiara per agenti e umani, cosi ogni task puo chiudersi con controlli espliciti e ripetibili.

## Comandi Standard

Base monorepo:

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm verify
```

E2E locale:

```bash
pnpm test:e2e
```

E2E su deploy pubblico:

```bash
pnpm test:e2e:public
pnpm test:e2e:m080
```

## Mappa Dei Test

- `pnpm lint`
  Verifica stile e problemi statici.
- `pnpm typecheck`
  Verifica TypeScript nel monorepo.
- `pnpm test:unit`
  Oggi copre il package `@touracore/compliance` con Vitest.
- `pnpm test:e2e`
  Usa Playwright in `apps/web` e avvia `pnpm dev` se `E2E_NO_SERVER` non e impostata.
- `pnpm test:e2e:public`
  Esegue test pubblici contro `https://touracore.vercel.app` o `E2E_PUBLIC_URL`.
- `pnpm test:e2e:m080`
  Esegue la suite `m080` contro deploy o URL definito da `E2E_BASE_URL`.

## Regola Di Scelta

- cambi solo TypeScript/shared logic: `lint`, `typecheck`, test unit mirati
- cambi UI o flussi utente: aggiungi il Playwright piu vicino al comportamento toccato
- cambi schema o permessi: almeno `lint`, `typecheck` e spiegazione dei check non automatizzati

## Closeout Minimo

Ogni task dovrebbe riportare:

1. comandi lanciati
2. esito pass/fail
3. eventuali skip con motivazione
4. rischi residui o follow-up

