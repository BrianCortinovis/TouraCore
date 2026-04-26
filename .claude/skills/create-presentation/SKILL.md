---
name: create-presentation
description: Crea una presentazione HTML dinamica + guida testuale stampabile per spiegare un argomento del progetto TouraCore (es. billing, onboarding, modulo verticale). Usa lo stile visivo Claude-native (palette cream + accent ruggine), animazioni SVG (monete che fluiscono, ping pulsanti, draw-line), indice modale richiamabile, voice-over OpenAI TTS pre-generato. Output: cartella docs/<topic>/presentation/index.html + docs/<topic>/guida-<audience>.html + script generate-audio.mjs. Usalo quando l'utente chiede "crea presentazione", "fai slide animate", "guida per agenzie/partner/clienti".
---

# Create Presentation

Procedura per generare presentazioni TouraCore allineate (stesso stile, audio, controlli, indice).

## Quando usare

- "Crea una presentazione per X"
- "Fai slide animate che spiegano Y"
- "Voglio una guida per le agenzie su Z"
- "Aggiungi presentazione a docs/<modulo>"

## Output atteso

```
docs/<topic>/
├── presentation/
│   ├── index.html              # Slide auto-play con animazioni + audio
│   ├── generate-audio.mjs      # Script Node TTS OpenAI standalone
│   └── audio/                  # 11 MP3 voce nova italiana (gen on-demand)
│       ├── 00-cover.mp3
│       ├── 01-*.mp3
│       └── ...
└── guida-<audience>.html       # Guida testuale stampabile (PDF-ready)
```

## Step

### 1. Capire scope

Prima di codice:
- Topic (es. "billing", "onboarding", "modulo experience")
- Audience (es. "agenzie partner", "clienti tenant", "developer")
- Numero slide consigliato: 9-12 (durata 5-8 min audio)
- Esiste già presentazione su questo topic? Se sì, aggiorna invece di duplicare.

### 2. Struttura slide standard

Da seguire fedelmente per coerenza:

| # | Tipo | Contenuto |
|---|------|-----------|
| 0 | Cover | Brand + titolo grande + sub + "premi Play" |
| 1 | Problema | Comparazione bad/good con SVG diagramma |
| 2 | Big number | Numero/cifra dirompente + frase chiave |
| 3 | Flusso animato | Diagramma SVG con monete/elementi che fluiscono |
| 4 | Attori (3 grid) | 3 stat-card con icon + label + val + hint |
| 5 | Tariffe/Opzioni | Lista verticale con icon + descrizione |
| 6 | Timeline | SVG orizzontale con step numerati |
| 7 | Edge case | 4 livelli numerati (rischi/recupero/varianti) |
| 8 | Why us | Grid 6 con motivi tecnici |
| 9 | Onboarding | Step 1-2-3-4 numerati con check finale |
| 10 | Finale (dark) | CTA contatti + ringraziamenti |

Adatta in base al topic ma mantieni: cover + 1 big-number + 1 flusso + 1 timeline + 1 finale. Resto flessibile.

### 3. Asset di riferimento

File template in `.claude/skills/create-presentation/templates/`:
- `presentation-example.html` — esempio reale completo (billing v4): copia + modifica contenuto
- `guida-example.html` — esempio guida partner billing
- `generate-audio-example.mjs` — script TTS OpenAI funzionante

**Sono esempi working del progetto TouraCore (cartella `docs/billing/`).** Usali come riferimento di stile/struttura, copia + adatta contenuto al nuovo topic.

**Workflow concreto:**

```bash
# 1. Crea cartella destinazione
mkdir -p docs/<topic>/presentation/audio

# 2. Copia esempio come base
cp .claude/skills/create-presentation/templates/presentation-example.html docs/<topic>/presentation/index.html
cp .claude/skills/create-presentation/templates/guida-example.html docs/<topic>/guida-<audience>.html
cp .claude/skills/create-presentation/templates/generate-audio-example.mjs docs/<topic>/presentation/generate-audio.mjs

# 3. Sostituisci contenuto specifico:
#    - Title (header.hero h1)
#    - Subtitle (header.hero p.lede)
#    - Le 11 slide (mantieni stessa struttura HTML, cambia testi/diagrammi)
#    - SLIDES_META array JS (title + file + duration)
#    - NARRATIONS array nel generate-audio.mjs (file + text per ogni slide)

# 4. Genera audio (chiave già in apps/web/.env.local)
cd docs/<topic>/presentation
OPENAI_API_KEY=$(grep ^OPENAI_API_KEY ../../../apps/web/.env.local | cut -d= -f2) node generate-audio.mjs

# 5. Apri per check
open docs/<topic>/presentation/index.html
```

### 4. Cosa cambiare nel file copiato

Aprire `index.html` copiato e modificare in ordine:

| Sezione HTML | Cosa modificare |
|--------------|----------------|
| `<title>` | Titolo browser tab |
| `header.hero .brand` | Lascia "TOURACORE" |
| `header.hero h1` | Titolo grande slide cover |
| `header.hero .sub` | Sottotitolo |
| 11 `<div class="slide">` | Contenuto specifico (testi + SVG diagrammi) |
| `const SLIDES_META = [...]` | Array con title/file/duration per indice modale |

In `generate-audio.mjs`:
| Variabile | Cosa |
|-----------|------|
| `NARRATIONS = [...]` | Per ogni slide: `{ file: '00-slug.mp3', text: 'voice over...' }` |

### 5. Style guide rigoroso

**Palette (NON cambiare):**
```css
--bg: #faf9f5;          /* cream background */
--card: #ffffff;
--ink: #1a1a1a;
--ink-soft: #4a4a4a;
--ink-mute: #8a8a8a;
--line: #e8e4d8;
--accent: #c96442;      /* ruggine TouraCore */
--accent-soft: #f4ddd1;
--success: #4a7c59;
--success-soft: #e1ecdf;
--warn: #b8860b;
--info: #4a6fa5;
```

**Font:** -apple-system stack (no web font esterni, performance).

**Animazioni standard disponibili nel template:**
- `.draw-line` — line/path che si disegna progressivamente
- `.flow-down-1/2/3/4` — palline che scendono lungo path verticale (sfasate)
- `.split-left` / `.split-right` — element che parte centro e si splitta in 2 direzioni
- `.ping` — circle pulsante che si espande
- `.float-coin` — float verticale infinito
- `.anim-coin1` / `.anim-coin2` — monete che cadono diagonale
- `.reveal-1` ... `.reveal-5` — fade-in sequenziale di elementi nella slide

**SVG diagrammi:**
- viewBox standard `0 0 800-1000 240-480`
- Marker arrows definiti `<marker>` per frecce colorate
- Stroke width 2-3, font-size 11-14
- Rect rounded `rx="10-12"`, padding interno generoso

### 6. Voice-over (testo italiano)

Regole per `NARRATIONS` array:
- Durata target per slide: 20-50 secondi (~50-150 parole)
- Tono colloquiale ma professionale (audience: business, non-dev)
- Inizia con frase forte, evita "Bene, ora vediamo..."
- Numeri in lettere ("trenta per cento" non "30%") per pronuncia migliore
- Apostrofi sostituiti con spazio (es. "l ottanta" non "l'ottanta") — TTS pronuncia meglio
- Mai più di 3 frasi per concetto

Voce default: `nova` (femminile italiana naturale, professional).
Modello: `tts-1-hd` (HD quality).
Costo: ~€0.03 per slide → ~€0.30 per presentazione 11 slide.

### 7. Indice modale

**Sempre presente.** Bottone ☰ in basso, tasto `I` per aprirlo, `Esc` per chiudere. Lista clickable di tutte le slide con title + duration. Click → goTo(idx) + close modal.

### 8. Controlli keyboard standard

| Tasto | Azione |
|-------|--------|
| `→` / `Spazio` | Slide successiva |
| `←` | Slide precedente |
| `P` | Play / Pausa |
| `I` | Toggle indice |
| `M` | Mute audio |
| `F` | Fullscreen |
| `Esc` | Chiudi modal |
| `Home` / `End` | Prima / ultima |

### 9. Guida testuale parallela

Per ogni presentazione, creare anche `guida-<audience>.html`:
- 8 sezioni standard (introduzione, flusso, opzioni, onboarding, esempio, edge case, FAQ, contatti)
- Bottone "🖨 Stampa / Salva PDF" fixed bottom-right
- CSS print-friendly (`@media print`)
- FAQ accordion (`<details>`)
- Stesso diagramma SVG semplificato della slide 3

### 10. Aggiornamento indice docs/

Dopo creazione, aggiungi al `docs/<topic>/README.md`:

```markdown
### Per <audience>
- [`presentation/index.html`](./presentation/index.html) — presentazione dinamica auto-play
- [`guida-<audience>.html`](./guida-<audience>.html) — guida testuale stampabile
```

### 11. Verifica finale

- [ ] Tutti i placeholder sostituiti (cerca `{{` nel file)
- [ ] Audio generato (11 file in `audio/`)
- [ ] Indice modale funziona
- [ ] Animazioni partono al cambio slide
- [ ] Guida HTML printable testata (`window.print()`)
- [ ] README docs aggiornato
- [ ] Commit + push su main

## Anti-pattern (NON fare)

- ❌ Usare framework JS (React/Vue) — solo HTML+CSS+JS vanilla
- ❌ CDN esterni (no fontawesome, no chart.js, no Tailwind CDN)
- ❌ Web font Google Fonts — usa font system stack
- ❌ Più di 12 slide — diventa noioso, dividi in 2 presentazioni
- ❌ Voice-over più lungo di 50 secondi per slide — taglia
- ❌ Narrazione con "ehm", "diciamo", "tipo" — TTS suona male
- ❌ SVG con immagini raster (no `<image>`) — solo path/shape
- ❌ Animazioni CPU-intensive (no parallax pesante, no canvas particle)

## Esempi di topic adatti

- ✅ Billing (pagamenti, commissioni) — già fatto v4
- ✅ Onboarding nuova agenzia
- ✅ Modulo restaurant (POS, menu, KDS)
- ✅ Modulo bike-rental (flotta, tariffe, channel)
- ✅ Sicurezza dati (GDPR, fiscalità)
- ✅ Portale Discover (SEO, distribuzione)
- ❌ Reference API technica (usare doc statica, non slide)
- ❌ Roadmap interna (usare PROGETTO-STORIA.md)

## Output del task chiuso

Quando termini la presentazione, riporta:
1. Path dei 3 file creati
2. Numero slide
3. Durata audio totale stimata
4. Comando per ri-generare audio se contenuto cambia
5. Link rapido per aprire (`open docs/<topic>/presentation/index.html`)
