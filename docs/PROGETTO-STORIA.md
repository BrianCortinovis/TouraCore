# TouraCore · Storia del Progetto e Convenzioni

> Documento pensato per essere letto sia da **sviluppatori** sia da **non sviluppatori**.
> Lato tecnico: numeri, percorsi, pattern. Lato business: cosa fa e a chi serve.

---

## 1. Cos'è TouraCore

**In breve**: una piattaforma software unica per aziende del turismo che offrono più servizi (hotel + ristorante + bici a noleggio + esperienze + agenzia turistica). Invece di comprare 5 software diversi, ne usano uno solo, con tutti i moduli che comunicano tra loro.

**Tecnicamente**: monorepo TypeScript/Next.js multi-tenant multi-verticale su Supabase. Ogni "tenant" (azienda cliente) ha una o più "entity" (strutture: hotel specifici, ristoranti, flotte bici, liste esperienze). Supporta anche "agency" (agenzie che gestiscono più tenant).

### Verticali (moduli per settore)

| Verticale | Pacchetto | Per chi |
|---|---|---|
| **Hospitality** | `verticals/hospitality` | Hotel, B&B, appartamenti, agriturismi, case vacanza |
| **Ristorazione** | `verticals/restaurant` (parte in `packages/core`) | Ristoranti, trattorie, bar con cucina |
| **Bike Rental** | `verticals/bike-rental` | Noleggi bici classiche e elettriche |
| **Experiences** | `verticals/experiences` | Tour, attività outdoor, esperienze prenotabili |
| **Beach Club** | `verticals/beach-club` | Stabilimenti balneari (in preparazione) |

### Livelli di utenti

- **Super Admin** (`briansnow86@gmail.com`) vede tutto, gestisce la piattaforma
- **Agency** gestisce più tenant clienti con commissioni/margini
- **Tenant Owner** gestisce la propria azienda e le sue strutture
- **Staff** opera quotidianamente (check-in, ordini, prenotazioni)

---

## 2. Stato al 27 aprile 2026

### Numeri chiave

- **106 milestone completate** (M001-M106)
- **140+ commit** sul ramo `main`
- **152 migration** database Supabase applicate (progetto cloud `dysnrgnqzliodqrsohoz`)
- **27 pacchetti core** riusabili (`packages/core/`)
- **4 verticali attivi** + 1 in preparazione
- **E2E Playwright**: 31/31 PASS · typecheck 17/17 · test:unit 14/14
- **Code review full codebase 2026-04-27**: 6/6 P0 + 6/7 P1 chiusi e LIVE su prod (commit `b160d0c`)

### Hardening sicurezza/qualità attivo (post code-review 2026-04-27)

Vedi report completo: `docs/reports/code-review-2026-04-27.html`.

| Area | Stato |
|---|---|
| Rate limiter Upstash REST + fallback memory | ✅ LIVE |
| CSRF mutating routes `/api/user/*` | ✅ LIVE |
| Reset-password gate via cookie sentinella | ✅ LIVE verificato |
| Public booking gate (key/origin) | ✅ LIVE verificato (401 senza key) |
| Anti-overbooking RPC × 3 verticali (migration 00152) | ✅ LIVE su cloud |
| Webhook stripe atomic dedup (UNIQUE) | ✅ LIVE |
| Bundle anti price-tampering (cap €5k/€50k) | ✅ LIVE |
| Cron secret timing-safe (22 cron) | ✅ LIVE |
| Sidebar mobile responsive | ✅ LIVE |
| error.tsx + loading.tsx mancanti | ✅ LIVE |
| Metadata noindex /book /embed /widget /checkin | ✅ LIVE |
| Bike VAT da @touracore/fiscal | ✅ LIVE |
| Cron loyalty-recalc + billing-snapshots N+1 | ⏸ deferred (non blocker) |
| 0 test 25/26 package core | ⏳ debito noto |
| 93 `as unknown as` Supabase joins | ⏳ debito noto |
| CSP `'unsafe-inline'` script | ⏳ debito noto |
| Dark mode | ⏳ non implementato |

### Ambiente

- Produzione (dev deploy): `https://touracore.vercel.app`
- Repo GitHub: `BrianCortinovis/TouraCore`
- Database: Supabase progetto `dysnrgnqzliodqrsohoz` (dev condiviso)
- Dashboard locale: `http://127.0.0.1:7777` (cartella `~/Documents/TouraCore-Dashboard/`, esterna al repo)

---

## 3. Cosa è stato fatto (raggruppato per tema)

Il lavoro è stato svolto in modalità mista (GSD + ChatGPT + Claude) quindi il tracking formale GSD copre solo parte delle milestone. Tutte le 106 sono comunque realizzate e funzionanti.

### 3.1 Fondamenta (M001-M030)

**Cosa**: sistema multi-tenant, autenticazione, ruoli, onboarding, modulo base ristorazione.

**Tecnico**:
- Schema Supabase multi-tenant con RLS (Row Level Security)
- Auth via Supabase con cookie custom `__touracore_csrf`
- Middleware scope tenant/entity via header `x-touracore-{tenant,entity}-slug`
- Onboarding 5-step con super-admin override
- Vertical switcher + route guard
- Modulo ristorazione completo (10 milestone M021-M030): sale, tavoli, menu, POS, turni staff, fatturazione

**Non-tech**: la base del sistema. Ogni cliente vede solo i suoi dati. Puoi registrarti, creare la tua azienda, scegliere il settore e iniziare.

### 3.2 Listing pubblico + template (M031-M037)

**Cosa**: pagine pubbliche stile Airbnb per ogni struttura + template per settore.

**Tecnico**:
- Route `/s/{tenant}/{entity}` server-side con cache ISR
- JSON-LD schema.org per SEO (LodgingBusiness, Restaurant, BicycleStore)
- Template Hospitality + Restaurant + Bike con amenity/cuisine normalizzate
- Homepage utente `/u/{username}` personalizzabile
- Aggregator `/discover` cross-tenant
- Sitemap automatica + embed iframe per siti terzi

**Non-tech**: ogni hotel/ristorante/noleggio ha la sua pagina pubblica bella e veloce, indicizzabile su Google.

### 3.3 Modulo Bike Rental (M038-M050)

**Cosa**: noleggio bici classiche e elettriche, con flotte, tariffe dinamiche, canali di vendita.

**Tecnico**:
- Pacchetto `@touracore/bike-rental` (types + 5 query files)
- 8 migration (00093-00100)
- Channel manager foundation: 17 provider registry, adapter Bokun
- Pricing avanzato: duration tier, surge, one-way fee, delivery fee
- Widget pubblico `/book/bike/{slug}` + listing pubblico con BicycleStore JSON-LD

**Non-tech**: gestisci una flotta bici, prezzi che cambiano per durata/orario, vendita anche via portali esterni (tipo Booking.com per bici).

### 3.4 Modulo Experiences (M051-M065)

**Cosa**: tour, attività outdoor, esperienze prenotabili con 3 modalità diverse.

**Tecnico**:
- Pacchetto `@touracore/experiences`
- 17 migration (00104-00120)
- 3 booking mode: `timeslot_capacity`, `private`, `asset_rental`
- RPC atomico `experience_timeslot_try_book` (no oversell verificato concorrente)
- 12 OTA registry per distribuzione
- 4 demo: motoslitta, parco avventura, kayak, tour Dolomiti 3gg
- Voucher + partner system con commissione auto 15%

**Non-tech**: vendi esperienze (gita in kayak, tour in quota) con posti a slot orario o prenotazione privata; i partner rivendono guadagnando percentuale.

### 3.5 Voucher + Gift Card + Partner (nelle M051-M065)

**Tecnico**:
- Pacchetti `@touracore/vouchers` + `@touracore/partners`
- Migration 00101-00103
- Partner API v1 con auto-commission
- Sicurezza: bcrypt + RLS + rate limit + idempotency + JWT + HMAC

**Non-tech**: vendi buoni regalo, gestisci rete di agenzie partner con API.

### 3.6 Booking engine unificato + Compliance fiscale (M032 seguenti)

**Tecnico**:
- Migration 00086-00089
- Pacchetto `@touracore/fiscal` con strategy pattern (6 emitter)
- Route unica `/book/tenant/{slug}` carrello multi-vertical
- Split fiscale Italia: privato vs business vs occasionale
- Emissione documenti: CIN, RT (Registratore Telematico), SDI (Sistema Di Interscambio fatture elettroniche)
- Regime forfettario + prestazione occasionale

**Non-tech**: un cliente può comprare in un solo carrello stanza + cena + tour, e il sistema emette tutti i documenti fiscali italiani corretti.

### 3.7 Security Hardening produzione (incluso M066+)

**Tecnico**:
- Migration 00077-00078
- 52/52 issue audit risolti
- Tenant isolation verificato
- Webhook HMAC obbligatoria
- Encryption AES-256-GCM per credenziali integrazioni
- RLS su tutte le view
- Cron secret fail-closed
- CORS strict + open redirect fix

**Non-tech**: impossibile per un cliente vedere dati di un altro, tutti i segreti cifrati, controlli di sicurezza attivi.

### 3.8 Agency + Platform Admin (M066-M080)

**Cosa**: pannelli multi-livello per agenzie e per il super-admin della piattaforma.

**Tecnico**:
- Migration 00121 agency_audit_logs append-only
- Route `/platform` per super admin
- Route `/a/{agencySlug}` per agency owner
- SharedSidebar con parametri scope
- Seed 3 agency demo
- E2E 5/5 PASS

**Non-tech**: un'agenzia che rivende TouraCore ai suoi clienti ha il suo pannello; chi gestisce TouraCore vede tutto.

### 3.9 Messaging Suite Enterprise (M081-M086)

**Cosa**: comunicazione multicanale (email, SMS, WhatsApp, push, Slack, in-app).

**Tecnico**:
- 6 tabelle + 23 template seed
- 7 adapter: Resend, Mailgun, Twilio SMS+WA, Meta WA, Slack, WebPush
- Console admin platform + agency
- GDPR `/unsubscribe` + `/preferences/notifications`
- Credenziali cifrate AES-256-GCM
- Cron dispatch ogni 2 minuti

**Non-tech**: mandi email/SMS/WhatsApp ai clienti in modo automatico e rispettando GDPR.

### 3.10 Agency multi-vertical + billing (M087-M093)

**Tecnico**:
- Migration 00127-00131
- Register intent picker (scegli se sei azienda o agency)
- Agency wizard 2-step
- Client invite (internal + link + landing `/r/`)
- Modules hub con Stripe proration live
- Billing per-unit snapshots via cron
- Grace period banner + cron
- Agency CRM: broadcast + note + task
- E2E 20/20 PASS

**Non-tech**: agenzie possono invitare clienti e gestirli come CRM; pagamento proporzionale ai moduli attivati.

### 3.11 Check-in online + Tassa di soggiorno + Booking engine preview (M094-M098)

**Tecnico**:
- Migration 00132-00134
- Check-in/out online + doc upload + tassa soggiorno + predisposizione Alloggiati
- Tax payment policy selector (onsite/online/guest_choice)
- Booking engine admin preview step-by-step per restaurant + experience + bike
- Media pipeline pro con variants + blurhash

**Non-tech**: ospite fa check-in online, paga tassa soggiorno online, operatore vede come sarà la prenotazione lato cliente.

### 3.12 Legal / SEO / Accessibility / Core Web Vitals (M099-M106)

**Tecnico**:
- Migration 00135-00137
- Cookie consent records
- DSAR (GDPR) retention policy
- Core Web Vitals tracking
- Suite legal/SEO/a11y completa

**Non-tech**: sistema conforme a cookie legge + GDPR richieste accesso dati + veloce e accessibile.

### 3.13 Wiring finale P0/P1/P2 (post M106)

**Tecnico** (commit b91985e, 6b95cc1, 60d51c8, a81f319, 3ae30ce):
- 13 feature wirate: cookie GDPR, 3 cron (HK/supplies/competitive), invito check-in, void RT, revoca PIN staff, QR allergeni, 5 dashboard (housekeeping, supplies, competitive, accounting, FX)
- Fix middleware whitelist cron Vercel
- Restaurant booking E2E reale + tavolo assegnato automatico
- E2E 31/31 PASS

**Non-tech**: tutte le feature hanno sia backend sia UI collegati, niente più "fatto a metà".

---

## 4. Struttura del codice

```
TouraCore/
├── apps/web/                    # App Next.js principale (UI, route handler, server action)
├── packages/core/               # 27 pacchetti riusabili
│   ├── auth, booking, billing, compliance
│   ├── media, notifications, security, ui
│   ├── fiscal, pricing, listings, vouchers, partners
│   └── ... (27 totali)
├── packages/db/                 # Livello database
├── verticals/                   # Moduli per settore
│   ├── hospitality/
│   ├── bike-rental/
│   ├── experiences/
│   └── beach-club/
├── supabase/migrations/         # 137 migration SQL numerate
├── docs/                        # Documentazione (questo file è qui)
├── .claude/                     # Config Claude Code (rules, skills)
└── .gsd/                        # Workflow GSD (solo quando usato)
```

---

## 5. Convenzioni d'ora in poi

Il disordine fino a M106 è dovuto a uso misto di strumenti (GSD + ChatGPT + Claude). Da **M107 in avanti** si segue questa convenzione.

### 5.1 Quando usare cosa

| Tipo lavoro | Strumento | Esempi |
|---|---|---|
| Bugfix, piccole feature, rename, refactor locale, docs, fix UI | **Claude normale → commit diretto** | "fix tourist-tax join guest", "docs aggiorna README stays" |
| Feature grossa multi-pacchetto, nuovo modulo, nuovo verticale | **GSD milestone** (plan + slice + summary) | "M107 Spa module", "M108 Channel manager Booking.com" |
| Migrazione database | Sempre in `supabase/migrations/NNNNN_nome.sql` | numerata progressiva |

Regola pratica: **se non riesci a descriverlo in un commit title, è una milestone GSD**.

### 5.2 Convenzione commit (Conventional Commits)

Formato: `tipo(scope): descrizione breve in italiano`.

Tipi:
- `feat`: nuova funzionalità utente
- `fix`: correzione bug
- `docs`: solo documentazione
- `chore`: manutenzione, build, dipendenze
- `refactor`: riorganizzazione senza cambio comportamento
- `test`: aggiunta/modifica test
- `style`: solo formattazione, no logica

Scope comuni: `stays`, `dine`, `rides`, `activities`, `agency`, `platform`, `auth`, `billing`, `compliance`, `db`, `ui`, `middleware`, `ci`.

Esempi:
```
feat(stays): tassa soggiorno configurabile per città
fix(auth): redirect signout pulisce cookie csrf
docs(progetto): aggiorna storia per M107
chore(deps): upgrade next a 15.1.2
```

### 5.3 Quando apri una milestone GSD (flusso consigliato)

1. `mcp__gsd-workflow__gsd_plan_milestone` — crea `.gsd/milestones/M107/M107-ROADMAP.md`
2. Pianifica le slice (pezzi verticali testabili)
3. Esegui slice per slice, committa con `feat(scope): M107 S01 descrizione`
4. `mcp__gsd-workflow__gsd_complete_milestone` — genera SUMMARY.md
5. La dashboard passa automaticamente a "done" verde

### 5.4 Database

- Ogni modifica schema = 1 file `supabase/migrations/NNNNN_nome_snake_case.sql`
- Numerazione: prossimo numero libero (attuale max `00137_core_web_vitals.sql` → prossimo `00138`)
- Sempre idempotenti quando possibile (`IF NOT EXISTS`, `CREATE OR REPLACE`)
- RLS obbligatoria su tabelle nuove
- Testa sempre con `pnpm supabase db reset` locale prima del push cloud

### 5.5 Test minimi prima di chiudere un task

- `pnpm lint` + `pnpm typecheck` sempre
- Logica pura / compliance: `pnpm test:unit`
- UI / flussi: `pnpm test:e2e` o `pnpm test:e2e:public`
- Full: `pnpm verify` = lint + typecheck + test:unit

### 5.6 Dashboard locale

Per vedere lo stato aggiornato in tempo reale del progetto:

```bash
cd ~/Documents/TouraCore-Dashboard
npm start
# apri http://127.0.0.1:7777
```

Si aggiorna automaticamente ad ogni commit (watcher su `.git/`).

---

## 6. Glossario per non-dev

| Termine | Cosa significa |
|---|---|
| **Repo / Repository** | Cartella con tutto il codice, tracciata da Git |
| **Commit** | Modifica salvata con messaggio esplicativo |
| **Branch** | Linea di sviluppo parallela (qui usiamo solo `main`) |
| **Monorepo** | Una sola repo contiene più pacchetti e più app |
| **Tenant** | Azienda cliente nella piattaforma |
| **Entity** | Struttura specifica del cliente (hotel X, ristorante Y) |
| **Vertical** | Modulo specifico per un settore (hotel, ristorante, bici...) |
| **Migration** | File SQL numerato che modifica la struttura del database |
| **RLS (Row Level Security)** | Regola database che filtra automaticamente chi vede cosa |
| **RPC** | Funzione che gira dentro il database (più veloce e sicura di una query) |
| **Cron** | Attività pianificata che parte da sola ogni N minuti/ore |
| **E2E (End-to-End)** | Test che simula un utente reale che clicca l'app |
| **CI / Actions** | Controlli automatici che girano ad ogni modifica |
| **PR (Pull Request)** | Proposta di modifica al codice (qui lavoriamo direttamente su `main`) |
| **RLS policy** | La regola specifica di filtro (es. "vedi solo la tua tenant") |
| **Seed** | Dati di esempio inseriti nel database per test |

---

## 7. Contatti e risorse

- Dashboard progetto: `http://127.0.0.1:7777`
- GitHub: `https://github.com/BrianCortinovis/TouraCore`
- App dev: `https://touracore.vercel.app`
- Credenziali test dev: tutti gli account Supabase hanno password `Test8979` (skill `reset-dev-passwords` per rigenerare)
