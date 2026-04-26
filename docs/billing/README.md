# Billing — Documentazione

## File

### Per il super admin (Brian)
- [`billing-system.html`](./billing-system.html) — versione corrente v4. Come funziona oggi: Stripe Connect Direct Charge end-to-end. Calcolatore live + diagramma flusso soldi + timeline.
- [`billing-system-history.html`](./billing-system-history.html) — storico v1 → v4 con tutti i changelog.
- [`billing-modifications-report.md`](./billing-modifications-report.md) — report tecnico per dev: stato, TODO residui v5.

### Per le agenzie partner
- [`presentation/index.html`](./presentation/index.html) — **presentazione dinamica auto-play** con voice-over OpenAI TTS. 11 slide animate, indice modale richiamabile (tasto `I`), animazioni soldi che fluiscono. ~6 minuti.
- [`guida-partner.html`](./guida-partner.html) — **guida testuale stampabile** per non-developer. 8 sezioni + FAQ + bottone "Stampa / Salva PDF".

## Generare audio voice-over

La presentazione usa file MP3 pre-generati via OpenAI TTS (modello `tts-1-hd`, voce `nova` italiana). Per generarli:

```bash
cd docs/billing/presentation
OPENAI_API_KEY=sk-... node generate-audio.mjs
```

Costo stimato: ~€0.30 per generazione completa (11 file). Voce italiana professionale femminile, qualità HD.

## Aprire

```bash
# Doc principale
open docs/billing/billing-system.html

# Presentazione per agenzie
open docs/billing/presentation/index.html

# Guida partner stampabile
open docs/billing/guida-partner.html
```

Tutti i file funzionano offline. HTML + CSS + JS vanilla, zero build.

## Controlli presentazione

| Tasto | Azione |
|-------|--------|
| `→` / `Spazio` | Slide successiva |
| `←` | Slide precedente |
| `P` | Play / Pausa audio |
| `I` | Apri / Chiudi indice |
| `M` | Mute audio |
| `F` | Fullscreen |
| `Esc` | Chiudi indice |
| `Home` / `End` | Prima / ultima slide |

## Audience

| File | Per chi |
|------|---------|
| `billing-system.html` | Brian (super admin), comprensione tecnica |
| `billing-system-history.html` | Brian, storico decisioni |
| `billing-modifications-report.md` | Dev follow-up |
| `presentation/index.html` | **Agenzie partner**, presentazione commerciale |
| `guida-partner.html` | **Agenzie partner**, riferimento testuale + stampabile |
