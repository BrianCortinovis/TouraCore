# Features con backend pronto MA senza UI cablata

Data: 2026-04-22
Stato: rollback a P1 (`1ec152e`) — nessuna funzione cancellata da P2.

Knip segna queste funzioni come "unused" perché nessuna UI le chiama. **NON sono codice morto**: sono feature implementate a livello di dati/API ma il bottone/form/pagina che le invoca non esiste ancora.

---

## A. Dashboard CRM avanzato (M015-M020) — pagine MANCANTI

`apps/web/src/app/(dashboard)/competitive-actions.ts` espone 36 server actions. 26 sono cablate, **10 non hanno pagina**:

### A.1 Housekeeping templates (checklist pulizie)
- `listHousekeepingTemplatesAction(tenantId)` → tabella `housekeeping_checklist_templates`
- `saveHousekeepingTemplateAction(input)` → insert nuovo template
- **UI mancante**: `apps/web/src/app/(dashboard)/housekeeping/page.tsx` con CRUD checklist
- **Sidebar entry mancante**

### A.2 Supplies / inventory cleaning
- `listSuppliesAction(entityId)` → tabella `supplies`
- `recordSupplyMovementAction(input)` → tabella `supply_movements` + auto-update qty
- **UI mancante**: `apps/web/src/app/(dashboard)/supplies/page.tsx` con stock detergenti/asciugamani
- **Sidebar entry mancante**

### A.3 Competitor pricing intelligence
- `listCompetitorPricesAction(entityId, days)` → tabella `competitor_prices`
- `recordCompetitorPriceAction(input)` → upsert prezzo concorrente
- **UI mancante**: `apps/web/src/app/(dashboard)/competitive/page.tsx` con grafico price-watch
- **Sidebar entry mancante**

### A.4 Accounting connections (Fatture in Cloud, etc.)
- `listAccountingConnectionsAction(tenantId)` → tabella `accounting_connections`
- `createAccountingConnectionAction(input)` → connect provider esterno
- **UI mancante**: `apps/web/src/app/(dashboard)/accounting/page.tsx` con OAuth providers
- **Sidebar entry mancante**

### A.5 FX rates (cambio valuta)
- `getFxRateAction(base, quote, date)` → tabella `fx_rates`
- `upsertFxRateAction(input)` → admin manual entry
- **UI mancante**: `apps/web/src/app/(dashboard)/fx-rates/page.tsx` o widget in settings
- Possibile integrazione cron auto-fetch (ECB API)

---

## B. GDPR Cookie Banner — non montato in layout

`verticals/hospitality/src/components/compliance/cookie-banner.tsx` + `cookie-banner-wrapper.tsx` esistono.

API `/api/cookie-consent/route.ts` salva consensi in tabella `cookie_consent_records`.

Pagina `/account/privacy/page.tsx` mostra storico consensi.

**MANCA**: `<CookieBannerWrapper orgSlug={...} policyVersion="2025-01" />` nel root layout `apps/web/src/app/layout.tsx` o in `(public)/layout.tsx` per visitatori.

**Compliance EU**: necessario prima di lanciare ufficialmente in EU. Il bottone "accetta" esiste ma il banner non si vede.

---

## C. Check-in online: invito email automatico

`verticals/hospitality/src/actions/checkin.ts`:
- `createCheckinToken(reservationId)` — genera token UUID 7gg
- `sendCheckinInvitation(reservationId)` — invia email con link `/checkin/{token}`
- `expireOldTokens()` — cron expire vecchi token

**Cosa funziona già**: la pagina `/checkin/[token]` esiste, l'ospite può completare il check-in (`updateCheckinData`, `completeCheckin` cablate).

**MANCA**:
- Bottone **"Invia invito check-in via email"** nella prenotazione (es. `stays/[entitySlug]/bookings/[id]/page.tsx`)
- Cron job in `apps/web/src/app/api/cron/` che chiama `expireOldTokens()` daily

---

## D. Smart Lock: revoca PIN

`apps/web/src/lib/lock-providers.ts`:
- `issueNukiPin/issueTTLockPin` — internal helpers chiamati da `issueLockPin` (router) ✅ usato
- `revokeNukiPin(config, providerId)` — **DELETE pin Nuki** dopo check-out

**MANCA**: chiamata a `revokeNukiPin` in:
- `stays/[entitySlug]/check-out/actions.ts` quando ospite checkout
- `stays/[entitySlug]/bookings/actions.ts` su cancellazione prenotazione
- Bottone "Revoca PIN" manuale in `stays/[entitySlug]/locks/page.tsx`

(TTLock equivalente non implementato — solo Nuki ha la revoca)

---

## E. Fiscale RT: void scontrino

`apps/web/src/lib/rt-middleware.ts`:
- `issueRTReceipt` ✅ usato in `dine/[entitySlug]/fiscal/actions.ts`
- `voidRTReceipt(middlewareUrl, receiptNumber, rtSerial)` — annullamento scontrino su middleware RT

**MANCA**: bottone **"Annulla scontrino"** in `dine/[entitySlug]/fiscal/fiscal-view.tsx` (riga 438 ha "Annulla" ma è solo modal close, non chiama `voidRTReceipt`).

Use case: scontrino emesso per errore → annulla legalmente entro stesso giorno.

---

## F. Allergeni QR menu (UE 1169/2011)

`apps/web/src/lib/allergens-qr.ts`:
- `getAllergenLabel/Symbol` ✅ usati in `/allergens/[slug]/page.tsx`
- `buildAllergensQRUrl(slug)` — genera URL pubblico QR
- `buildAllergensInfoSvg(name, slug, allergens, lang)` — SVG da stampare su menu cartaceo/scontrino

**MANCA**:
- In `dine/[entitySlug]/menu/page.tsx`: bottone **"Stampa QR allergeni"** che genera SVG/PDF
- Possibile integrazione automatica nel template scontrino RT

---

## G. Compliance hospitality: funzioni helper unused

`verticals/hospitality/src/compliance/`:
- `alloggiati-web.ts`: `getCountryIstatCode`, `getDocumentTypeCode`, `calculateNights`, `validateAlloggiatiData`, `generateAlloggiatiFile`, `validateAlloggiatiRegistrations`, `assertRecordLength` — helper validazione export Polizia di Stato. **Usati internamente dentro `actions/compliance.ts`** (false positive parziale di knip)
- `cancellation-policy.ts`: `DEFAULT_POLICIES`, `calculatePenalty`, `isWithdrawalApplicable` — calcolo penali cancellazione. **MANCA UI**: pagina `stays/[entitySlug]/policies/page.tsx` per setup template
- `istat-c59.ts`: `generateIstatC59Report`, `validateIstatData` — report ISTAT C59 mensile. **Wiring parziale** — `compliance/istat/actions.ts` usa `calculateIstatData` ma non genera Report C59 PDF/CSV
- `istat-codes.ts`: `getIstatCodeByIso2`, `COUNTRY_NAMES_IT` — utility lookup. Usate internamente

**Cosa manca davvero**:
- UI per **Cancellation policy templates** (cancellation rules per tariffa)
- Export **ISTAT C59** mensile (cron + scheduled report)

---

## H. Compliance hospitality: actions M-AML e Tourist Tax

`verticals/hospitality/src/actions/compliance.ts`:
- `generateIstatReport(...)` — versione esposta del report
- `generateTouristTaxForReservation(reservationId)` — calcolo tassa soggiorno auto
- `createAmlRecord(data)` — registrazione movimento AML antimoney laundering > 5k€
- `generateAlloggiatiForDate(orgId, date, mode)` — auto-generate alloggiati per giorno

**MANCA**:
- Cron `/api/cron/tourist-tax/route.ts` che genera tassa per checkout giornaliero
- Cron `/api/cron/alloggiati-auto/route.ts` (mode='checkin_only' o 'always') per invio Polizia
- UI **AML registry**: `stays/[entitySlug]/compliance/aml/page.tsx` con form pagamenti contanti > soglia
- Trigger automatico AML quando contanti > 5k€ in `bookings/actions.ts`

---

## I. Notifications adapters / templates

`verticals/hospitality/src/stubs/email/templates.ts`:
- `getTemplateById(id)` — fetch template
- `getTemplatesByTrigger(trigger)` — fetch by event
- `renderFullTemplate(template, vars)` — render con variables

`verticals/hospitality/src/stubs/integrations/email.ts`:
- `renderTemplate` — sostituisce placeholder

**MANCA**: questo è il sistema **legacy stubs** — il nuovo sistema notifications è in `packages/core/notifications/` (M081-M086 messaging suite COMPLETE da memoria progetto). Probabilmente stubs sono **da cancellare quando confermi che il nuovo sistema li ha sostituiti**.

`verticals/hospitality/src/stubs/integrations/credentials.ts`:
- `saveCredentials/deleteCredentials/validateCredentials/updateValidationStatus`
- **Sostituiti da** `packages/core/integrations/` (nuovo sistema sicuro AES-256-GCM, vedi memoria)

---

## J. Channel manager stubs

`verticals/hospitality/src/stubs/integrations/channel-manager.ts`:
- `syncReservations` / `pushRateUpdate` — stubs vecchi

**Sostituiti da**: `packages/core/channels/` (channel manager nuovo) + `verticals/bike-rental/src/channels/` + adapter Octorate. Stubs probabilmente cancellabili.

---

## K. Marketplace / billing / tenants helpers

Funzioni in `packages/core/`:
- `_resetTemplateCache` (compliance/render.ts) — solo per test, di solito si lascia
- `getRelevantUpsellCategories/Triggers` (hospitality-config) — helper recommendation engine, **MANCA UI** in upsell-orders dashboard
- `objectExists` (media/r2-client) — helper R2 storage check, usato raramente

---

## L. Helper di guard / utility

`apps/web/src/lib/`:
- `documents-guard.ts`: `DocumentAccessError`, `assertValidDocumentTypeForVertical` — usate solo internamente da `assertUserOwnsDocument/Entity`. **OK lasciare export per uso futuro**
- `module-guard.ts`: `VERTICAL_TO_MODULE`, `MODULE_TO_VERTICAL`, `ModuleCode` — mappature usabili da future pagine
- `superadmin/_lib.ts`: `PLAN_ORDER`, `PLAN_ORDER_LABELS`, `toMonthKey`, `getMonthLabel`, `countBy`, `topCounts` — utility costruzione dashboard superadmin
- API `_shared.ts` (booking/gift-card/restaurant): `corsHeaders`, `validatePublicKey`, `extractKey` — usabili in nuove route API future

---

## M. Tipi TypeScript "unused" (56)

Interfaces/types esportati da file ma mai importati esternamente (di solito sono signature ritorno funzioni interne). Bassa priorità — non sono "feature mancanti".

Esempi: `RoomGroup`, `StatusStyle` (planning types), `LockProviderConfig`, `RTReceiptInput`, `AlloggiatiRegistration`, `CancellationPenaltyResult`, `IstatData`, `BookingEngineProps`, ecc.

**Decisione**: lasciare esportati. Costo zero, futuro proof.

---

## Action Plan suggerito (prioritizzato)

### P0 — Compliance & legal (PRIMA del lancio EU)
1. **Cookie banner**: monta `<CookieBannerWrapper>` in `(public)/layout.tsx`
2. **Cron tourist-tax**: cron giornaliero che chiama `generateTouristTaxForReservation`
3. **Cron alloggiati**: cron che chiama `generateAlloggiatiForDate`

### P1 — Feature operative pronte ma silenziose
4. **Bottone "Invia invito check-in"** in bookings/[id]/page.tsx → `sendCheckinInvitation`
5. **Cron expire checkin tokens** giornaliero → `expireOldTokens`
6. **Bottone "Annulla scontrino"** in fiscal/fiscal-view.tsx → `voidRTReceipt`
7. **Auto-revoca PIN Nuki** su check-out → `revokeNukiPin` in check-out/actions
8. **Bottone "Stampa QR allergeni"** in dine/menu/page.tsx → `buildAllergensInfoSvg`

### P2 — Dashboard M015-M020 incompleti
9. Page **`/housekeeping`** + sidebar entry → housekeeping templates
10. Page **`/supplies`** + sidebar entry → inventory pulizie
11. Page **`/competitive`** + sidebar entry → price intelligence
12. Page **`/accounting`** + sidebar entry → connessioni esterne
13. Page **`/fx-rates`** o widget settings → cambio valute

### P3 — Nice to have
14. Page **`/stays/[entitySlug]/compliance/aml/`** → AML registry form
15. Page **`/stays/[entitySlug]/policies/`** → cancellation policy templates
16. Export ISTAT C59 mensile (cron + report download)

### P4 — Cleanup definitivo (dopo verifica)
17. Confermare che `stubs/email/templates.ts` + `stubs/integrations/credentials.ts` + `stubs/integrations/channel-manager.ts` siano superati dal nuovo sistema notifications/integrations/channels → quindi cancellabili in P3 reale
18. Confermare che `getTemplateById/getTemplatesByTrigger/renderFullTemplate` siano duplicati di `packages/core/notifications/`

---

## Riepilogo

- **15 feature da wirare** (P0-P3) prima di considerare il sistema feature-complete
- **3 file stubs** potenzialmente cancellabili dopo verifica (P4)
- **Zero rischio** rimuovere ora le funzioni: tutte hanno backend pronto e tabelle DB esistenti
