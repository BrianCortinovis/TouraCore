# KNIP REVIEW — TouraCore

Data: 2026-04-21
Tool: knip@6.6.0
Config: knip.json (Next.js plugin)
Stato: **SOLO REVIEW — zero modifiche al codice**

---

## Verdetto

Codice **non è messo male**. Numeri grezzi di knip sono gonfiati da:
1. Deep-import `@touracore/hospitality/src/...` che bypassa `index.ts` → knip non vede
2. Server actions Next.js (nominate come stringa nei form/fetch)
3. CSS `@import` di workspace packages (knip non scansiona)
4. `transpilePackages` in `next.config.ts`

Ma **esiste codice morto reale** da pulire. Stima:
- ~20–25 file orfani veri (verticals actions/compliance duplicate)
- ~5 dependencies veramente inutili in package.json
- ~30–40 export funzioni/costanti mai chiamate

---

## A. Dipendenze da rimuovere (verificate)

| Package | Dove | Note |
|---------|------|------|
| `@dnd-kit/core` | apps/web | Zero import nel src |
| `@dnd-kit/sortable` | apps/web | Zero import nel src |
| `@dnd-kit/utilities` | apps/web | Zero import nel src |
| `@stripe/react-stripe-js` | apps/web | Solo in package.json+lock |
| `@stripe/stripe-js` | apps/web | Solo in package.json+lock |
| `qrcode` | root package.json | Sostituito da `react-qr-code`, che è usato in self-checkin |

## B. Dipendenze FALSI POSITIVI (non toccare)

| Package | Dove | Perché usato ma knip non vede |
|---------|------|------|
| `@touracore/config` | apps/web | CSS `@import` in globals.css |
| `@touracore/security` | apps/web | `transpilePackages` in next.config.ts |
| `tailwindcss` devDep apps/web | apps/web | CSS `@import` in tailwind/globals.css |
| `server-only` | apps/web lib/* | Marker Next.js, convenzionale |
| `stripe` | apps/web | Unlisted: va AGGIUNTO a package.json (usato in API routes) |

## C. Dipendenze workspace verticals (overlist)

Verticals `bike-rental`, `experiences`, `hospitality` dichiarano molte workspace deps mai usate:
- `@touracore/types`, `@touracore/auth`, `@touracore/ui`, `@touracore/pricing`, `@touracore/vouchers`, `@touracore/partners`, `@supabase/supabase-js`, `date-fns`, `lucide-react`, `zod`

**Reale uso** in verticals: solo `@touracore/db`.

Azione suggerita: potare i package.json dei verticals/*. Rimane sempre la funzione della app che usa il vertical a importare direttamente.

---

## D. File ORFANI VERI (40 candidati knip — spot-check fatto)

### D.1 — Veramente orfani (0 import, da cancellare)

**apps/web:**
- `src/app/(account)/account-shell.tsx`
- `src/app/(dashboard)/dashboard-shell.tsx`
- `src/app/(dashboard)/property-selector.tsx`
- `src/app/(dashboard)/components/notification-bell.tsx`
- `src/app/(auth)/onboarding/onboarding-form.tsx`
- `src/app/(app)/[tenantSlug]/stays/[entitySlug]/bookings/generate-checkout-token.ts`
- `src/lib/cron-auth.ts`
- `src/lib/guest-portal.ts`
- `src/lib/restaurant-forecast.ts`

**verticals/hospitality — actions non esportate da index.ts e non deep-importate:**
- `actions/finance.ts`, `housekeeping.ts`, `invoices.ts`, `messaging.ts`, `payment-gateways.ts`
- `actions/platform-account.ts`, `platform-settings.ts`, `quotes.ts`, `restaurant.ts`
- `actions/self-checkin.ts`, `settings.ts`, `staff.ts`, `index.ts`
- `actions/reservations.ts` ← app usa `apps/web/.../bookings/actions.ts` invece
- `actions/deposits.ts`

**verticals/hospitality — compliance non deep-importate (tenute solo `cancellation-policy.ts` e `istat-c59.ts`):**
- `compliance/admin-access-log.ts`, `aml.ts`, `cin.ts`, `cookie-consent.ts`
- `compliance/corrispettivi-telematici.ts`, `data-breach.ts`, `dpa.ts`
- `compliance/fattura-elettronica.ts`, `gdpr.ts`, `processing-register.ts`
- `compliance/tourist-tax.ts`, `index.ts`

**verticals/hospitality — stubs (MAI deep-importati):**
- `stubs/integrations/index.ts`, `payment-gateway.ts`, `whatsapp.ts`
- (ma altri stubs/* come `email/templates.ts`, `automation/trigger-engine.ts`, `integrations/channel-manager.ts`, `integrations/credentials.ts`, `integrations/email.ts`, `platform-billing/service.ts` hanno export unused → file usato parzialmente)

**verticals/hospitality — altro:**
- `components/providers/auth-provider.tsx`
- `lib/rates/index.ts`

### D.2 — Attenzione: possibili duplicati

Alcuni file orfani in `verticals/hospitality` sono **duplicati** di logica che app implementa direttamente in `apps/web/src/app/.../actions.ts`. Prima di cancellare, verificare che la versione app sia completa (specialmente `reservations.ts`, `deposits.ts`).

---

## E. Export UNUSED (78 funzioni + 59 tipi)

### E.1 — Server Actions definite ma MAI chiamate (dead code reale)

File `apps/web/src/app/(dashboard)/competitive-actions.ts` — **10 funzioni fantasma**:
- `listHousekeepingTemplatesAction`, `saveHousekeepingTemplateAction`
- `listSuppliesAction`, `recordSupplyMovementAction`
- `listCompetitorPricesAction`, `recordCompetitorPriceAction`
- `listAccountingConnectionsAction`, `createAccountingConnectionAction`
- `getFxRateAction`, `upsertFxRateAction`

→ Scritte ma nessun `<form action={...}>` o `fetch` le richiama. Verificare se sono roadmap future o stub. Se no: **rimuovere**.

### E.2 — Helper funzioni morte

- `apps/web/src/lib/lock-providers.ts`: `issueNukiPin`, `revokeNukiPin`, `issueTTLockPin` (solo wrapper `issueLockPin` è usato)
- `apps/web/src/lib/rt-middleware.ts`: `voidRTReceipt`
- `apps/web/src/lib/sdi-xml.ts`: `xmlEscape` (interno non esportato serve)
- `apps/web/src/lib/allergens-qr.ts`: `buildAllergensQRUrl`, `buildAllergensInfoSvg`
- `apps/web/src/lib/documents-guard.ts`: `DocumentAccessError`, `assertValidDocumentTypeForVertical`
- `apps/web/src/lib/module-guard.ts`: `VERTICAL_TO_MODULE`, `MODULE_TO_VERTICAL`
- `apps/web/src/app/(app)/superadmin/_lib.ts`: `PLAN_ORDER`, `PLAN_ORDER_LABELS`, `toMonthKey`, `getMonthLabel`, `countBy`, `topCounts`
- `apps/web/src/app/api/public/booking/_shared.ts`: `validatePublicKey`, `corsHeaders`, `extractKey`
- `apps/web/src/app/api/public/gift-card/_shared.ts`: `corsHeaders`
- `apps/web/src/app/api/public/restaurant/_shared.ts`: `corsHeaders`

### E.3 — Compliance functions mai chiamate (interno hospitality)

In `verticals/hospitality/src/compliance/alloggiati-web.ts`:
- `ALLOGGIATI_TYPE`, `getCountryIstatCode`, `getDocumentTypeCode`
- `calculateNights`, `validateAlloggiatiData`, `generateAlloggiatiFile`
- `validateAlloggiatiRegistrations`, `ALLOGGIATI_RECORD_LENGTH`, `assertRecordLength`

In `cancellation-policy.ts`:
- `DEFAULT_POLICIES`, `calculatePenalty`, `isWithdrawalApplicable`

In `istat-c59.ts`:
- `generateIstatC59Report`, `validateIstatData`

In `istat-codes.ts`:
- `getIstatCodeByIso2`, `COUNTRY_NAMES_IT`

→ Tutti **scritti ma mai chiamati**. Impl pronte in attesa di UI/cron? Verificare decisione.

### E.4 — Tipi unused (59)

Interfacce/types esportate ma mai importate. Bassa priorità, ma da pulire a fine giro.

---

## F. Altri issue

### F.1 — Duplicate export
`packages/core/auth/src/bootstrap.ts`: `getCurrentAuthUser|getCurrentUser` stessa funzione due nomi. Scegliere uno.

### F.2 — Dep da AGGIUNGERE
`stripe` non dichiarato in `apps/web/package.json` ma usato in:
- `apps/web/src/app/api/v1/bundles/route.ts:6`
- `apps/web/src/app/api/webhooks/stripe/route.ts:10`

Funziona oggi perché hoist pnpm, ma va dichiarato esplicito.

### F.3 — Unresolved import
`packages/config/tsconfig/nextjs.json` → campo `next` non risolto. Da verificare JSON tsconfig Next.js preset.

---

## Prioritizzazione pulizia (proposta)

**P0 (sicuro, blast-radius basso):**
1. Rimuovere 6 deps confermate unused (`@dnd-kit/*`, `@stripe/*`, `qrcode`)
2. Aggiungere `stripe` a `apps/web/package.json`
3. Cancellare 9 file `apps/web` orfani (sezione D.1 apps/web)

**P1 (richiede ragionamento):**
4. Cancellare file `verticals/hospitality/actions/*` orfani — verificare prima non ci siano TODO/roadmap associati
5. Cancellare `verticals/hospitality/compliance/*` orfani
6. Potare workspace deps dichiarate e non usate nei `verticals/*/package.json`

**P2 (cleanup fino):**
7. Rimuovere funzioni unused da `competitive-actions.ts`, `lock-providers.ts`, `rt-middleware.ts`, `superadmin/_lib.ts`, `*/_shared.ts`
8. Rimuovere interfacce/types unused (59)
9. Fix duplicate export `getCurrentAuthUser|getCurrentUser`

**Totale linee stimate rimovibili**: ~3k–5k.

---

## Comando per replay

```bash
pnpm exec knip --no-progress
```

Config: `/Users/briancortinovis/Documents/TouraCore/knip.json`
Report raw: `/tmp/knip-text.txt`
