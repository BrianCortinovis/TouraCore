# Hospitality service pricing matrix

Questa matrice descrive cosa esiste gia` nel core Hospitality, cosa e` gia` prezzabile, cosa e` esposto in UX e quali flussi mancano ancora per considerare il sistema completo e competitivo.

## Lettura rapida

- `Pronto` = modello + pricing + UX + flusso operativo presente.
- `Parziale` = il dato esiste, ma manca il flusso pubblico, il mapping canali o l'automazione completa.
- `Da finire` = il dato esiste solo in parte oppure non e` ancora esposto bene in UX o nei booking flow.

## Matrice servizi

| Area | Pricing model presente | UX admin presente | Flusso operativo presente | Booking engine pubblico | Channel/OTA compatibility | Stato | Cosa manca |
|---|---|---|---|---|---|---|---|
| Servizi hotel base | `free/paid`, `price`, `pricing_mode`, `security_deposit` | Si | Si | Parziale | Parziale | Parziale | Esposizione nel booking engine pubblico e mapping per canale |
| Add-on hotel vendibili | `free/paid`, `price`, `pricing_mode`, `included_quantity`, `max_quantity` | Si | Si | Si, ma da rafforzare | Parziale | Parziale | UX pubblica piu` chiara, bundle, promo, rule per canali |
| Spa | `price`, `per_guest`, `per_stay`, `per_item`, deposito | Si, con `spa_details` | Si | Parziale | Parziale | Parziale | Slot booking dedicato, capacita`, regole orarie, pricing premium per fascia |
| Piscina | `free/paid` e accessori collegati | Si, con `pool_details` | Si | Parziale | Parziale | Parziale | Booking pubblico accessori, capienza, stagionalita`, fascia oraria |
| Bike / noleggio | `price`, `per_item`, deposito | Si, con `bike_details` | Si | Parziale | Parziale | Parziale | UI pubblica di noleggio con durata, quantita`, slot, equipaggiamento |
| Parcheggio / EV | `price`, `per_stay`, `per_item` | Si, con `parking_details` | Si | Parziale | Parziale | Parziale | Distinzione piena tra posto auto, coperto, indoor, EV, targa |
| Transfer | `price`, `per_item`, `per_stay` | Si, con `transfer_details` | Si | Parziale | Parziale | Parziale | Percorso, orario, andata/ritorno, pax, pickup point, conferma rapida |
| Colazione | `price`, `per_guest` | Si, con `breakfast_details` | Si | Parziale | Parziale | Parziale | Bundle colazione + room, more visible upsell, rules per canale |
| Beach service | `price`, `per_day` | Si, con `beach_details` | Si | Parziale | Parziale | Parziale | Stagionalita`, capienza, slot/ombrelloni, visibilita` diretta |
| Coworking | `price`, `per_day` | Si, con `workspace_details` | Si | Parziale | Parziale | Parziale | Prenotazione slot giornaliera/oraria, capienza, disponibilita` live |
| Laundry / linen | `price`, `per_item`, `per_stay`, `per_night`, `per_guest` | Si | Si | Debole | Debole | Parziale | Decidere se sono solo interni o anche vendibili agli ospiti |
| Family kit / baby kit | `price`, `per_stay` | Si, con `family_details` | Si | Parziale | Parziale | Parziale | Bundle ospite/ospiti, regole per eta` bambini e disponibilita` |
| Pet kit / pet fee | `price`, `per_stay`, fee servizi pet | Si | Si | Parziale | Parziale | Parziale | Collegamento con pet policy, regole canali, extra dedicati |
| Room service / bar / restaurant | `price`, `per_item` o `free` | Si | Si | Debole | Parziale | Parziale | Integrazione piena col folio e con menu/ordini pubblici |

## Cosa e` gia` forte oggi

1. Il core ha gia` il modello prezzo, non solo il toggle attivo/disattivo.
2. Esistono gia` i dettagli verticali per spa, piscina, bike, parking, transfer, beach, coworking.
3. Gli upsell e gli slot sono gia` modellati nel backend.
4. Il checkout booking pubblico puo` gia` raccogliere piu` dati e creare `upsell_orders`.

## Cosa e` ancora da finire

### 1. Booking engine pubblico dei servizi

- Esposizione completa degli extra.
- Selezione servizi prima della conferma.
- Checkout con extra pre-booking e post-booking.

### 2. Slot booking vero

- UI pubblica per servizi a fascia oraria.
- UI staff per gestione slot e capienza.
- Regole di disponibilita` per giorno, fascia, stagionalita`, capienza e preavviso.

### 3. Mapping canali

- Tassonomia canonica per dire:
  - diretto si
  - canale si
  - solo interno
  - solo folio
  - solo upsell
- Fallback per canali che non supportano il campo.

### 4. Revenue per servizio

- Prezzo per stagione.
- Prezzo per occupancy.
- Prezzo per fascia oraria.
- Prezzo per giorno settimana/festivo.

### 5. Accounting e flusso economico

- Ogni ordine deve poter finire in `upsell_orders`.
- Se serve, deve finire anche in `folio_charges`.
- Se e` pagato, deve poter creare/aggiornare `payments`.
- Se e` fatturabile, deve entrare in invoice flow.

## Flussi da considerare completi solo quando ci sono tutti questi pezzi

| Flusso | Stato attuale | Da finire |
|---|---|---|
| Configurazione admin | Quasi completo | Rifinire copy, layout, e mapping canali |
| Booking engine pubblico | Parziale | Servizi + slot + upsell + rule engine |
| Gestione staff | Buona | Aggiungere viste piu` operative per spa/bike/transfer |
| Channel sync | Parziale | Mapping per servizi, non solo camere/tariffe |
| Pagamenti | Parziale | Collegare gli extra a payment/folio in modo sempre coerente |
| Revenue management | Base buona | Portare il pricing dinamico anche sui servizi top |

## Priorita` consigliata

1. Rendere il booking engine pubblico capace di vendere i servizi gia` presenti.
2. Chiudere il slot booking per spa, bike, transfer, beach e coworking.
3. Creare il mapping canale/OTA per servizio.
4. Aggiungere revenue rules sui servizi con alta domanda.
5. Rendere automatico il passaggio ordine -> folio -> invoice -> payment.

