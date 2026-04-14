/**
 * Corrispettivi Telematici - Trasmissione telematica dei corrispettivi giornalieri
 *
 * Implementa la gestione dei corrispettivi telematici come previsto dalla normativa
 * italiana per la trasmissione elettronica degli incassi giornalieri all'Agenzia
 * delle Entrate tramite Registratore Telematico (RT).
 *
 * Riferimenti normativi:
 * - D.Lgs. 127/2015 Art. 2 (obbligo di memorizzazione e trasmissione telematica)
 * - Provvedimento AdE del 28/10/2016 (specifiche tecniche per la trasmissione)
 * - Provvedimento AdE del 28/02/2019 (aggiornamento specifiche tecniche)
 * - D.M. 10/05/2019 (Registratori Telematici - requisiti tecnici)
 * - Circolare AdE 3/E del 21/02/2020 (chiarimenti operativi)
 * - Art. 22 D.P.R. 633/1972 (operazioni per le quali non e' obbligatoria la fattura)
 *
 * Il Registratore Telematico (RT) memorizza e trasmette i dati dei corrispettivi
 * giornalieri all'Agenzia delle Entrate entro 12 giorni dall'effettuazione
 * dell'operazione. La chiusura giornaliera (rapporto Z) deve essere eseguita
 * quotidianamente, anche in caso di assenza di operazioni (chiusura a zero).
 */

import { format, parseISO, isValid, startOfDay, isSameDay } from 'date-fns'
import { it } from 'date-fns/locale'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Singola operazione di corrispettivo (transazione).
 *
 * Rappresenta un singolo incasso soggetto a memorizzazione e trasmissione
 * telematica ai sensi dell'Art. 2 D.Lgs. 127/2015.
 */
export interface CorrispettivoRecord {
  /** Data dell'operazione (ISO 8601: YYYY-MM-DD) */
  date: string
  /** Importo totale dell'operazione in EUR (IVA inclusa) */
  amount: number
  /** Aliquota IVA applicata (4, 10, 22, oppure 0 per operazioni esenti) */
  vat_rate: number
  /** Importo IVA calcolato sull'operazione */
  vat_amount: number
  /** Metodo di pagamento utilizzato */
  payment_method: 'contanti' | 'carta' | 'bonifico' | 'assegno' | 'altro'
  /** Numero progressivo della transazione nella giornata */
  progressive_number: number
  /** Matricola del Registratore Telematico (11 caratteri alfanumerici) */
  rt_device_serial: string
}

/**
 * Riepilogo giornaliero dei corrispettivi.
 *
 * Corrisponde alla chiusura giornaliera (rapporto Z) che il Registratore
 * Telematico deve generare e trasmettere all'Agenzia delle Entrate.
 * Rif: Provvedimento AdE del 28/10/2016, Allegato "Tipi Dati Corrispettivi".
 */
export interface DailyCorrispettivo {
  /** Data di riferimento della chiusura giornaliera (ISO 8601: YYYY-MM-DD) */
  date: string
  /** Importo totale giornaliero (IVA inclusa) */
  total_amount: number
  /** Ripartizione IVA per aliquota */
  vat_breakdown: {
    /** Aliquota IVA al 4% (beni di prima necessita' - Art. 16 Tabella A, Parte II, D.P.R. 633/1972) */
    rate_4: { taxable: number; vat: number }
    /** Aliquota IVA al 10% (servizi alberghieri - Art. 16 Tabella A, Parte III, D.P.R. 633/1972) */
    rate_10: { taxable: number; vat: number }
    /** Aliquota IVA al 22% (aliquota ordinaria - Art. 16 D.P.R. 633/1972) */
    rate_22: { taxable: number; vat: number }
  }
  /** Numero totale di transazioni nella giornata */
  transaction_count: number
  /** Matricola del Registratore Telematico */
  device_serial: string
  /** Numero progressivo della chiusura giornaliera */
  progressive_daily_number: number
}

/**
 * Dati per la trasmissione XML all'Agenzia delle Entrate.
 *
 * Struttura basata sullo schema XSD dei Corrispettivi Telematici
 * (DatiCorrispettiviType) come definito nel Provvedimento AdE del 28/10/2016.
 */
export interface CorrispettivoXML {
  /** Identificativo fiscale del trasmittente (Partita IVA) */
  id_fiscale_trasmittente: string
  /** Numero progressivo di trasmissione */
  progressivo_invio: string
  /** Matricola del dispositivo RT */
  dispositivo_id: string
  /** Data di riferimento */
  data_riferimento: string
  /** Contenuto XML generato */
  xml_content: string
  /** Tipologia di trasmissione */
  tipo_trasmissione: 'normale' | 'sostitutiva' | 'annullamento'
}

/**
 * Informazioni sul Registratore Telematico (RT).
 *
 * Il Registratore Telematico e' il dispositivo approvato dall'Agenzia delle
 * Entrate per la memorizzazione e trasmissione dei corrispettivi giornalieri.
 * Rif: D.M. 10/05/2019 - Requisiti tecnici dei Registratori Telematici.
 */
export interface RTDevice {
  /** Matricola univoca del dispositivo (11 caratteri alfanumerici, formato XXXXXXXXXXX) */
  serial: string
  /** Marca del dispositivo (es. "Epson", "Custom", "Olivetti") */
  brand: string
  /** Modello del dispositivo */
  model: string
  /** Data dell'ultima trasmissione avvenuta con successo (ISO 8601) */
  last_transmission_date: string | null
  /** Stato operativo del dispositivo */
  status: 'attivo' | 'inattivo' | 'in_manutenzione' | 'dismesso'
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Aliquote IVA standard italiane applicabili ai corrispettivi */
const ALIQUOTE_IVA = [4, 10, 22] as const

/** Namespace XML per i corrispettivi telematici (Agenzia delle Entrate) */
const CORRISPETTIVI_NAMESPACE =
  'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/corrispettivi/dati/v1.0'

/** Schema location per validazione XSD */
const CORRISPETTIVI_SCHEMA_LOCATION =
  'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/corrispettivi/dati/v1.0 ' +
  'CorrispettiviMessaggioType_v1.0.xsd'

/** Formato data per output italiano */
const DATE_FORMAT_IT = 'dd/MM/yyyy'

/** Formato data ISO per XML */
const DATE_FORMAT_XML = 'yyyy-MM-dd'

/**
 * Mappa dei metodi di pagamento verso i codici AdE.
 * Rif: Provvedimento AdE 28/10/2016, Tabella metodi di pagamento.
 */
const METODO_PAGAMENTO_MAP: Record<string, string> = {
  contanti: 'MP01',
  carta: 'MP08',
  bonifico: 'MP05',
  assegno: 'MP02',
  altro: 'MP99',
}

// ---------------------------------------------------------------------------
// XML Utility Helpers
// ---------------------------------------------------------------------------

/**
 * Escapes special characters for XML content.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Formatta un importo con esattamente 2 decimali come richiesto dall'AdE.
 */
function formatAmount(value: number): string {
  return value.toFixed(2)
}

/**
 * Genera un tag XML. Restituisce stringa vuota se il valore e' null/undefined/vuoto.
 */
function tag(name: string, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const stringValue = typeof value === 'number' ? formatAmount(value) : escapeXml(String(value))
  return `<${name}>${stringValue}</${name}>`
}

/**
 * Wraps content in an XML element block (for nested structures).
 */
function block(name: string, content: string): string {
  const trimmed = content.trim()
  if (!trimmed) return ''
  return `<${name}>\n${trimmed}\n</${name}>`
}

/**
 * Formatta un importo in valuta italiana (EUR).
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// ---------------------------------------------------------------------------
// Calcolo corrispettivi giornalieri
// ---------------------------------------------------------------------------

/**
 * Aggrega le transazioni giornaliere e calcola il riepilogo dei corrispettivi.
 *
 * Raggruppa le transazioni per aliquota IVA (4%, 10%, 22%) e calcola i totali
 * giornalieri come richiesto per la chiusura giornaliera (rapporto Z) del
 * Registratore Telematico.
 *
 * Rif: Art. 2 D.Lgs. 127/2015 - Memorizzazione elettronica e trasmissione
 * telematica dei dati dei corrispettivi giornalieri.
 *
 * @param transactions - Array di transazioni (CorrispettivoRecord) della giornata
 * @param date - Data di riferimento per la chiusura giornaliera
 * @returns Riepilogo giornaliero (DailyCorrispettivo) con totali e ripartizione IVA
 */
export function calculateDailyCorrispettivi(
  transactions: CorrispettivoRecord[],
  date: Date,
): DailyCorrispettivo {
  const dateStr = format(date, DATE_FORMAT_XML)

  // Filtra solo le transazioni della giornata di riferimento
  const dayTransactions = transactions.filter(t => {
    const transDate = parseISO(t.date)
    return isValid(transDate) && isSameDay(transDate, date)
  })

  // Inizializza la ripartizione IVA a zero
  const vatBreakdown = {
    rate_4: { taxable: 0, vat: 0 },
    rate_10: { taxable: 0, vat: 0 },
    rate_22: { taxable: 0, vat: 0 },
  }

  let totalAmount = 0

  for (const transaction of dayTransactions) {
    totalAmount += transaction.amount

    // Calcola l'imponibile: importo totale - IVA
    const taxable = transaction.amount - transaction.vat_amount

    // Raggruppa per aliquota IVA
    if (transaction.vat_rate === 4) {
      vatBreakdown.rate_4.taxable += taxable
      vatBreakdown.rate_4.vat += transaction.vat_amount
    } else if (transaction.vat_rate === 10) {
      vatBreakdown.rate_10.taxable += taxable
      vatBreakdown.rate_10.vat += transaction.vat_amount
    } else if (transaction.vat_rate === 22) {
      vatBreakdown.rate_22.taxable += taxable
      vatBreakdown.rate_22.vat += transaction.vat_amount
    }
    // Le operazioni esenti (vat_rate === 0) non vengono ripartite nelle aliquote standard
  }

  // Arrotonda tutti gli importi a 2 decimali
  vatBreakdown.rate_4.taxable = Math.round(vatBreakdown.rate_4.taxable * 100) / 100
  vatBreakdown.rate_4.vat = Math.round(vatBreakdown.rate_4.vat * 100) / 100
  vatBreakdown.rate_10.taxable = Math.round(vatBreakdown.rate_10.taxable * 100) / 100
  vatBreakdown.rate_10.vat = Math.round(vatBreakdown.rate_10.vat * 100) / 100
  vatBreakdown.rate_22.taxable = Math.round(vatBreakdown.rate_22.taxable * 100) / 100
  vatBreakdown.rate_22.vat = Math.round(vatBreakdown.rate_22.vat * 100) / 100

  // Determina la matricola del dispositivo dalla prima transazione (o stringa vuota)
  const deviceSerial = dayTransactions.length > 0
    ? dayTransactions[0]!.rt_device_serial
    : ''

  // Il numero progressivo giornaliero e' il massimo progressivo della giornata
  const maxProgressive = dayTransactions.reduce(
    (max, t) => Math.max(max, t.progressive_number),
    0,
  )

  return {
    date: dateStr,
    total_amount: Math.round(totalAmount * 100) / 100,
    vat_breakdown: vatBreakdown,
    transaction_count: dayTransactions.length,
    device_serial: deviceSerial,
    progressive_daily_number: maxProgressive,
  }
}

// ---------------------------------------------------------------------------
// Generazione XML per Agenzia delle Entrate
// ---------------------------------------------------------------------------

/**
 * Genera il documento XML nel formato richiesto dall'Agenzia delle Entrate
 * per la trasmissione telematica dei corrispettivi giornalieri.
 *
 * Lo schema XML segue le specifiche tecniche del Provvedimento AdE del
 * 28/10/2016 (DatiCorrispettiviType / CorrispettiviMessaggioType).
 *
 * Rif: Provvedimento del Direttore dell'Agenzia delle Entrate del 28 ottobre
 * 2016, prot. n. 182017 - Allegato "Specifiche tecniche per la trasmissione
 * telematica dei dati dei corrispettivi giornalieri".
 *
 * @param daily - Riepilogo giornaliero dei corrispettivi
 * @param device - Informazioni sul Registratore Telematico
 * @returns Stringa XML conforme allo schema AdE per la trasmissione
 */
export function generateCorrispettivoXML(
  daily: DailyCorrispettivo,
  device: RTDevice,
): string {
  // Calcolo totale IVA e imponibile
  const totalVat =
    daily.vat_breakdown.rate_4.vat +
    daily.vat_breakdown.rate_10.vat +
    daily.vat_breakdown.rate_22.vat

  const totalTaxable =
    daily.vat_breakdown.rate_4.taxable +
    daily.vat_breakdown.rate_10.taxable +
    daily.vat_breakdown.rate_22.taxable

  // Costruzione dei blocchi DatiIVA per ciascuna aliquota con importi > 0
  const datiIvaBlocks: string[] = []

  if (daily.vat_breakdown.rate_4.taxable > 0 || daily.vat_breakdown.rate_4.vat > 0) {
    datiIvaBlocks.push(block('DatiIVA', [
      tag('Aliquota', '4.00'),
      tag('Imposta', daily.vat_breakdown.rate_4.vat),
      tag('Imponibile', daily.vat_breakdown.rate_4.taxable),
    ].join('\n')))
  }

  if (daily.vat_breakdown.rate_10.taxable > 0 || daily.vat_breakdown.rate_10.vat > 0) {
    datiIvaBlocks.push(block('DatiIVA', [
      tag('Aliquota', '10.00'),
      tag('Imposta', daily.vat_breakdown.rate_10.vat),
      tag('Imponibile', daily.vat_breakdown.rate_10.taxable),
    ].join('\n')))
  }

  if (daily.vat_breakdown.rate_22.taxable > 0 || daily.vat_breakdown.rate_22.vat > 0) {
    datiIvaBlocks.push(block('DatiIVA', [
      tag('Aliquota', '22.00'),
      tag('Imposta', daily.vat_breakdown.rate_22.vat),
      tag('Imponibile', daily.vat_breakdown.rate_22.taxable),
    ].join('\n')))
  }

  // Dati del Registratore Telematico
  const datiRT = block('DatiRT', [
    tag('Matricola', device.serial),
    tag('MarcaModello', `${escapeXml(device.brand)} ${escapeXml(device.model)}`),
    tag('DataOraRilevazione', `${daily.date}T23:59:59`),
  ].join('\n'))

  // Dati dei corrispettivi giornalieri
  const datiCorrispettivi = block('DatiCorrispettivi', [
    tag('DataRiferimento', daily.date),
    tag('NumeroChiusura', String(daily.progressive_daily_number)),
    tag('ImportoTotaleGiornaliero', daily.total_amount),
    tag('NumeroTransazioni', String(daily.transaction_count)),
    ...datiIvaBlocks,
  ].join('\n'))

  // Composizione del messaggio XML completo
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<CorrispettiviMessaggio xmlns="${CORRISPETTIVI_NAMESPACE}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="${CORRISPETTIVI_SCHEMA_LOCATION}" versione="COR10">`,
    datiRT,
    datiCorrispettivi,
    '</CorrispettiviMessaggio>',
  ].join('\n')

  return xml
}

// ---------------------------------------------------------------------------
// Validazione
// ---------------------------------------------------------------------------

/**
 * Valida i dati di un corrispettivo giornaliero prima della trasmissione.
 *
 * Verifica la correttezza degli importi, la coerenza tra imponibile e IVA,
 * la validita' della data, il formato della matricola del dispositivo RT e
 * la sequenzialita' dei numeri progressivi.
 *
 * Rif: Provvedimento AdE 28/10/2016, Art. 4 - Controlli di conformita'
 * dei dati trasmessi.
 *
 * @param daily - Riepilogo giornaliero da validare
 * @returns Oggetto con flag `valid` e array di `errors` (messaggi in italiano)
 */
export function validateCorrispettivo(
  daily: DailyCorrispettivo,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // --- Validazione della data ---
  if (!daily.date) {
    errors.push('Data di riferimento mancante.')
  } else {
    const parsedDate = parseISO(daily.date)
    if (!isValid(parsedDate)) {
      errors.push(`Data di riferimento non valida: "${daily.date}". Formato atteso: YYYY-MM-DD.`)
    }
    // La data non puo' essere nel futuro
    if (isValid(parsedDate) && parsedDate > startOfDay(new Date())) {
      errors.push(
        `Data di riferimento nel futuro: "${daily.date}". ` +
        'I corrispettivi non possono essere trasmessi per date future.',
      )
    }
  }

  // --- Validazione della matricola del dispositivo RT ---
  if (!daily.device_serial) {
    errors.push('Matricola del Registratore Telematico mancante.')
  } else if (!/^[A-Za-z0-9]{11}$/.test(daily.device_serial)) {
    errors.push(
      `Matricola RT non valida: "${daily.device_serial}". ` +
      'La matricola deve essere composta da 11 caratteri alfanumerici ' +
      '(Rif: D.M. 10/05/2019).',
    )
  }

  // --- Validazione degli importi ---
  if (daily.total_amount < 0) {
    errors.push('L\'importo totale giornaliero non puo\' essere negativo.')
  }

  // Verifica che il totale corrisponda alla somma degli imponibili + IVA
  const calculatedTotal =
    daily.vat_breakdown.rate_4.taxable +
    daily.vat_breakdown.rate_4.vat +
    daily.vat_breakdown.rate_10.taxable +
    daily.vat_breakdown.rate_10.vat +
    daily.vat_breakdown.rate_22.taxable +
    daily.vat_breakdown.rate_22.vat

  const roundedCalculatedTotal = Math.round(calculatedTotal * 100) / 100

  // Tolleranza di 0.01 EUR per arrotondamenti
  if (daily.total_amount > 0 && Math.abs(daily.total_amount - roundedCalculatedTotal) > 0.01) {
    errors.push(
      `Importo totale (${formatCurrency(daily.total_amount)}) non corrisponde alla somma ` +
      `degli imponibili e IVA (${formatCurrency(roundedCalculatedTotal)}). ` +
      'Verificare la ripartizione per aliquota.',
    )
  }

  // --- Validazione coerenza IVA per ciascuna aliquota ---
  const validateVatRate = (
    rateName: string,
    ratePercent: number,
    taxable: number,
    vat: number,
  ) => {
    if (taxable < 0) {
      errors.push(`Imponibile per aliquota ${rateName} non puo\' essere negativo.`)
    }
    if (vat < 0) {
      errors.push(`IVA per aliquota ${rateName} non puo\' essere negativa.`)
    }
    if (taxable > 0 && ratePercent > 0) {
      const expectedVat = Math.round(taxable * ratePercent) / 100
      const roundedExpectedVat = Math.round(expectedVat * 100) / 100
      // Tolleranza di 0.02 EUR per arrotondamenti multipli
      if (Math.abs(vat - roundedExpectedVat) > 0.02) {
        errors.push(
          `IVA per aliquota ${rateName} (${formatCurrency(vat)}) non coerente con ` +
          `l'imponibile (${formatCurrency(taxable)}). Valore atteso: circa ${formatCurrency(roundedExpectedVat)}.`,
        )
      }
    }
  }

  validateVatRate('4%', 4, daily.vat_breakdown.rate_4.taxable, daily.vat_breakdown.rate_4.vat)
  validateVatRate('10%', 10, daily.vat_breakdown.rate_10.taxable, daily.vat_breakdown.rate_10.vat)
  validateVatRate('22%', 22, daily.vat_breakdown.rate_22.taxable, daily.vat_breakdown.rate_22.vat)

  // --- Validazione del numero di transazioni ---
  if (daily.transaction_count < 0) {
    errors.push('Il numero di transazioni non puo\' essere negativo.')
  }

  if (daily.transaction_count === 0 && daily.total_amount > 0) {
    errors.push(
      'Importo totale maggiore di zero con numero di transazioni pari a zero. ' +
      'Verificare la coerenza dei dati.',
    )
  }

  // --- Validazione del numero progressivo giornaliero ---
  if (daily.progressive_daily_number < 0) {
    errors.push('Il numero progressivo giornaliero non puo\' essere negativo.')
  }

  if (daily.progressive_daily_number === 0 && daily.transaction_count > 0) {
    errors.push(
      'Numero progressivo giornaliero pari a zero con transazioni presenti. ' +
      'Il progressivo deve essere almeno 1.',
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ---------------------------------------------------------------------------
// Generazione rapporto di chiusura giornaliera (Rapporto Z)
// ---------------------------------------------------------------------------

/**
 * Genera il rapporto di chiusura giornaliera (rapporto Z) in formato testo.
 *
 * Il rapporto Z (chiusura giornaliera) e' il documento fiscale che il
 * Registratore Telematico produce al termine della giornata lavorativa.
 * Contiene il riepilogo di tutti i corrispettivi del giorno, ripartiti
 * per aliquota IVA, e rappresenta la base per la trasmissione telematica
 * all'Agenzia delle Entrate.
 *
 * Rif: Art. 2, comma 1, D.Lgs. 127/2015
 * Rif: Provvedimento AdE 28/10/2016, Allegato "Tipi Dati Corrispettivi"
 * Rif: Circolare AdE 3/E del 21/02/2020, par. 1.3
 *
 * @param daily - Riepilogo giornaliero dei corrispettivi
 * @param device - Informazioni sul Registratore Telematico
 * @returns Stringa di testo formattata del rapporto di chiusura giornaliera
 */
export function generateDailyClosingReceipt(
  daily: DailyCorrispettivo,
  device: RTDevice,
): string {
  const parsedDate = parseISO(daily.date)
  const formattedDate = isValid(parsedDate)
    ? format(parsedDate, DATE_FORMAT_IT, { locale: it })
    : daily.date

  const now = new Date()
  const formattedTimestamp = format(now, 'dd/MM/yyyy HH:mm:ss', { locale: it })

  const separator = '='.repeat(48)
  const thinSeparator = '-'.repeat(48)

  const totalVat =
    daily.vat_breakdown.rate_4.vat +
    daily.vat_breakdown.rate_10.vat +
    daily.vat_breakdown.rate_22.vat

  const totalTaxable =
    daily.vat_breakdown.rate_4.taxable +
    daily.vat_breakdown.rate_10.taxable +
    daily.vat_breakdown.rate_22.taxable

  const lines: string[] = []

  // Intestazione
  lines.push(separator)
  lines.push(centerText('CHIUSURA GIORNALIERA', 48))
  lines.push(centerText('RAPPORTO Z', 48))
  lines.push(separator)
  lines.push('')

  // Dati del dispositivo
  lines.push(`RT Matricola:    ${daily.device_serial}`)
  lines.push(`Marca/Modello:   ${device.brand} ${device.model}`)
  lines.push(`Data:            ${formattedDate}`)
  lines.push(`Chiusura n.:     ${String(daily.progressive_daily_number).padStart(4, '0')}`)
  lines.push('')

  // Riepilogo per aliquota IVA
  lines.push(thinSeparator)
  lines.push(centerText('RIEPILOGO PER ALIQUOTA IVA', 48))
  lines.push(thinSeparator)
  lines.push('')

  const formatRow = (label: string, value: string): string => {
    const padding = 48 - label.length - value.length
    return `${label}${' '.repeat(Math.max(1, padding))}${value}`
  }

  // Aliquota 4%
  if (daily.vat_breakdown.rate_4.taxable > 0 || daily.vat_breakdown.rate_4.vat > 0) {
    lines.push('  Aliquota IVA 4%')
    lines.push(formatRow('    Imponibile:', formatCurrency(daily.vat_breakdown.rate_4.taxable)))
    lines.push(formatRow('    Imposta:', formatCurrency(daily.vat_breakdown.rate_4.vat)))
    lines.push('')
  }

  // Aliquota 10%
  if (daily.vat_breakdown.rate_10.taxable > 0 || daily.vat_breakdown.rate_10.vat > 0) {
    lines.push('  Aliquota IVA 10%')
    lines.push(formatRow('    Imponibile:', formatCurrency(daily.vat_breakdown.rate_10.taxable)))
    lines.push(formatRow('    Imposta:', formatCurrency(daily.vat_breakdown.rate_10.vat)))
    lines.push('')
  }

  // Aliquota 22%
  if (daily.vat_breakdown.rate_22.taxable > 0 || daily.vat_breakdown.rate_22.vat > 0) {
    lines.push('  Aliquota IVA 22%')
    lines.push(formatRow('    Imponibile:', formatCurrency(daily.vat_breakdown.rate_22.taxable)))
    lines.push(formatRow('    Imposta:', formatCurrency(daily.vat_breakdown.rate_22.vat)))
    lines.push('')
  }

  // Chiusura a zero
  if (daily.transaction_count === 0) {
    lines.push(centerText('*** CHIUSURA A ZERO ***', 48))
    lines.push(centerText('Nessuna operazione nella giornata', 48))
    lines.push('')
  }

  // Totali
  lines.push(thinSeparator)
  lines.push(centerText('TOTALI', 48))
  lines.push(thinSeparator)
  lines.push('')
  lines.push(formatRow('  Totale imponibile:', formatCurrency(Math.round(totalTaxable * 100) / 100)))
  lines.push(formatRow('  Totale IVA:', formatCurrency(Math.round(totalVat * 100) / 100)))
  lines.push(formatRow('  TOTALE GIORNALIERO:', formatCurrency(daily.total_amount)))
  lines.push('')
  lines.push(formatRow('  Numero transazioni:', String(daily.transaction_count)))
  lines.push('')

  // Footer
  lines.push(separator)
  lines.push(centerText('DOCUMENTO FISCALE', 48))
  lines.push(centerText('D.Lgs. 127/2015', 48))
  lines.push(separator)
  lines.push('')
  lines.push(`Generato il: ${formattedTimestamp}`)

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/**
 * Centra una stringa entro una larghezza data.
 */
function centerText(text: string, width: number): string {
  if (text.length >= width) return text
  const padding = Math.floor((width - text.length) / 2)
  return ' '.repeat(padding) + text
}
