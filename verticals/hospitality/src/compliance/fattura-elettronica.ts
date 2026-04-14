/**
 * FatturaPA 1.2.2 - Italian Electronic Invoice XML Generator
 *
 * Generates legally compliant FatturaPA XML documents following the
 * Agenzia delle Entrate specification version 1.2.2.
 *
 * Reference: https://www.fatturapa.gov.it/it/norme-e-regole/documentazione-fattura-elettronica/formato-fatturapa/
 */

// ---------------------------------------------------------------------------
// Types (local, not imported from database types)
// ---------------------------------------------------------------------------

export interface InvoiceData {
  invoice_number: string
  invoice_date: string // YYYY-MM-DD
  invoice_type: 'invoice' | 'credit_note' | 'receipt' | 'proforma'
  customer_name: string
  customer_vat: string | null
  customer_fiscal_code: string | null
  customer_address: string | null
  customer_city: string | null
  customer_province: string | null
  customer_zip: string | null
  customer_country: string
  customer_sdi_code: string | null
  customer_pec: string | null
  subtotal: number
  total_vat: number
  total: number
  payment_method: string | null
  payment_terms: string | null
  notes: string | null
}

export interface InvoiceItemData {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  vat_amount: number
  total: number
}

export interface OrganizationData {
  name: string
  legal_name: string | null
  vat_number: string | null
  fiscal_code: string | null
  address: string | null
  city: string | null
  province: string | null
  zip: string | null
  country: string
  phone: string | null
  email: string | null
  pec: string | null
  sdi_code: string
  rea_number: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FATTURAPA_NAMESPACE = 'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2'
const FATTURAPA_SCHEMA_LOCATION =
  'http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2 ' +
  'http://www.fatturapa.gov.it/export/fatturazione/sdi/fatturapa/v1.2.2/Schema_del_file_xml_FatturaPA_v1.2.2.xsd'
const XMLDSIG_NAMESPACE = 'http://www.w3.org/2000/09/xmldsig#'
const XSI_NAMESPACE = 'http://www.w3.org/2001/XMLSchema-instance'

/** FatturaPA TipoDocumento mapping */
const TIPO_DOCUMENTO_MAP: Record<string, string> = {
  invoice: 'TD01',      // Fattura
  credit_note: 'TD04',  // Nota di credito
  receipt: 'TD01',      // Treated as fattura for SDI purposes
  proforma: 'TD06',     // Parcella
}

/** FatturaPA ModalitaPagamento mapping */
const MODALITA_PAGAMENTO_MAP: Record<string, string> = {
  cash: 'MP01',            // Contanti
  bank_transfer: 'MP05',  // Bonifico
  credit_card: 'MP08',    // Carta di pagamento
  debit_card: 'MP08',     // Carta di pagamento
  pos: 'MP08',            // Carta di pagamento
  online: 'MP08',         // Carta di pagamento
  check: 'MP02',          // Assegno
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
 * Formats a number to exactly 2 decimal places as required by FatturaPA.
 */
function formatAmount(value: number): string {
  return value.toFixed(2)
}

/**
 * Wraps a value in an XML tag. Returns empty string if value is null/undefined/empty.
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
 * Truncates a string to the specified max length (FatturaPA has field limits).
 */
function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return value.substring(0, maxLength)
}

/**
 * Splits a long string into chunks of the specified size for Causale fields.
 * FatturaPA limits Causale to 200 characters per element, but allows multiple.
 */
function splitCausale(text: string, maxLength = 200): string[] {
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    chunks.push(remaining.substring(0, maxLength))
    remaining = remaining.substring(maxLength)
  }
  return chunks
}

/**
 * Extracts the country code from a VAT number (first 2 chars if alpha), defaults to 'IT'.
 */
function extractCountryFromVat(vat: string | null): string {
  if (!vat) return 'IT'
  const match = vat.match(/^([A-Z]{2})/)
  return match ? match[1]! : 'IT'
}

/**
 * Extracts the numeric/alphanumeric portion of a VAT number (strips country prefix).
 */
function extractVatCode(vat: string | null): string {
  if (!vat) return ''
  return vat.replace(/^[A-Z]{2}/, '')
}

// ---------------------------------------------------------------------------
// FatturaPA XML Generation
// ---------------------------------------------------------------------------

/**
 * Generates a complete FatturaPA 1.2.2 XML document.
 *
 * @param invoice   - Invoice header data
 * @param organization - Seller/cedente organization data
 * @param items     - Line items (DatiBeniServizi)
 * @returns Complete XML string
 */
export function generateFatturaPA(
  invoice: InvoiceData,
  organization: OrganizationData,
  items: InvoiceItemData[]
): string {
  const header = buildFatturaElettronicaHeader(invoice, organization)
  const body = buildFatturaElettronicaBody(invoice, items)

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<p:FatturaElettronica versione="FPR12" xmlns:ds="${XMLDSIG_NAMESPACE}" xmlns:p="${FATTURAPA_NAMESPACE}" xmlns:xsi="${XSI_NAMESPACE}" xsi:schemaLocation="${FATTURAPA_SCHEMA_LOCATION}">`,
    header,
    body,
    '</p:FatturaElettronica>',
  ].join('\n')

  return xml
}

// ---------------------------------------------------------------------------
// Header Construction
// ---------------------------------------------------------------------------

function buildFatturaElettronicaHeader(
  invoice: InvoiceData,
  organization: OrganizationData
): string {
  const datiTrasmissione = buildDatiTrasmissione(invoice, organization)
  const cedentePrestatore = buildCedentePrestatore(organization)
  const cessionarioCommittente = buildCessionarioCommittente(invoice)

  return block('FatturaElettronicaHeader', [
    datiTrasmissione,
    cedentePrestatore,
    cessionarioCommittente,
  ].join('\n'))
}

/**
 * 1.1 DatiTrasmissione
 */
function buildDatiTrasmissione(
  invoice: InvoiceData,
  organization: OrganizationData
): string {
  const senderCountry = extractCountryFromVat(organization.vat_number)
  const senderCode = extractVatCode(organization.vat_number) || organization.fiscal_code || ''

  // CodiceDestinatario logic:
  // - If customer has an SDI code, use it (7 chars)
  // - If customer is B2C or has no SDI code, use "0000000"
  const codiceDestinatario = invoice.customer_sdi_code && invoice.customer_sdi_code.trim().length > 0
    ? invoice.customer_sdi_code.trim()
    : '0000000'

  const idTrasmittente = block('IdTrasmittente', [
    tag('IdPaese', senderCountry),
    tag('IdCodice', senderCode),
  ].join('\n'))

  // PECDestinatario: include only when CodiceDestinatario is "0000000" and customer has PEC
  const pecDestinatario = codiceDestinatario === '0000000' && invoice.customer_pec
    ? tag('PECDestinatario', invoice.customer_pec)
    : ''

  return block('DatiTrasmissione', [
    idTrasmittente,
    tag('ProgressivoInvio', invoice.invoice_number),
    tag('FormatoTrasmissione', 'FPR12'),
    tag('CodiceDestinatario', codiceDestinatario),
    pecDestinatario,
  ].filter(Boolean).join('\n'))
}

/**
 * 1.2 CedentePrestatore (Seller)
 */
function buildCedentePrestatore(organization: OrganizationData): string {
  const vatCountry = extractCountryFromVat(organization.vat_number)
  const vatCode = extractVatCode(organization.vat_number)

  // DatiAnagrafici
  const idFiscaleIVA = organization.vat_number
    ? block('IdFiscaleIVA', [
        tag('IdPaese', vatCountry),
        tag('IdCodice', vatCode),
      ].join('\n'))
    : ''

  const codiceFiscale = organization.fiscal_code
    ? tag('CodiceFiscale', organization.fiscal_code)
    : ''

  const denominazione = organization.legal_name || organization.name
  const anagrafica = block('Anagrafica', tag('Denominazione', truncate(denominazione, 80)))

  const datiAnagrafici = block('DatiAnagrafici', [
    idFiscaleIVA,
    codiceFiscale,
    anagrafica,
    tag('RegimeFiscale', 'RF01'),
  ].filter(Boolean).join('\n'))

  // Sede
  const sede = block('Sede', [
    tag('Indirizzo', truncate(organization.address || 'N/A', 60)),
    tag('CAP', organization.zip || '00000'),
    tag('Comune', truncate(organization.city || 'N/A', 60)),
    organization.province ? tag('Provincia', organization.province) : '',
    tag('Nazione', (organization.country || 'IT').toUpperCase().substring(0, 2)),
  ].filter(Boolean).join('\n'))

  // IscrizioneREA (optional but commonly included for companies)
  const iscrizioneREA = organization.rea_number
    ? block('IscrizioneREA', [
        tag('Ufficio', organization.province || 'RM'),
        tag('NumeroREA', organization.rea_number),
      ].join('\n'))
    : ''

  // Contatti (optional)
  const contatti = (organization.phone || organization.email)
    ? block('Contatti', [
        organization.phone ? tag('Telefono', organization.phone) : '',
        organization.email ? tag('Email', organization.email) : '',
      ].filter(Boolean).join('\n'))
    : ''

  return block('CedentePrestatore', [
    datiAnagrafici,
    sede,
    iscrizioneREA,
    contatti,
  ].filter(Boolean).join('\n'))
}

/**
 * 1.4 CessionarioCommittente (Buyer/Customer)
 */
function buildCessionarioCommittente(invoice: InvoiceData): string {
  const customerCountry = (invoice.customer_country || 'IT').toUpperCase().substring(0, 2)

  // DatiAnagrafici - B2B (VAT) vs B2C (fiscal code only)
  const idFiscaleIVA = invoice.customer_vat
    ? block('IdFiscaleIVA', [
        tag('IdPaese', extractCountryFromVat(invoice.customer_vat)),
        tag('IdCodice', extractVatCode(invoice.customer_vat)),
      ].join('\n'))
    : ''

  const codiceFiscale = invoice.customer_fiscal_code
    ? tag('CodiceFiscale', invoice.customer_fiscal_code)
    : ''

  // Determine if this is a person name (contains space) or company
  const anagrafica = block('Anagrafica',
    tag('Denominazione', truncate(invoice.customer_name, 80))
  )

  const datiAnagrafici = block('DatiAnagrafici', [
    idFiscaleIVA,
    codiceFiscale,
    anagrafica,
  ].filter(Boolean).join('\n'))

  // Sede
  const sede = block('Sede', [
    tag('Indirizzo', truncate(invoice.customer_address || 'N/A', 60)),
    tag('CAP', invoice.customer_zip || '00000'),
    tag('Comune', truncate(invoice.customer_city || 'N/A', 60)),
    invoice.customer_province ? tag('Provincia', invoice.customer_province) : '',
    tag('Nazione', customerCountry),
  ].filter(Boolean).join('\n'))

  return block('CessionarioCommittente', [
    datiAnagrafici,
    sede,
  ].join('\n'))
}

// ---------------------------------------------------------------------------
// Body Construction
// ---------------------------------------------------------------------------

function buildFatturaElettronicaBody(
  invoice: InvoiceData,
  items: InvoiceItemData[]
): string {
  const datiGenerali = buildDatiGenerali(invoice)
  const datiBeniServizi = buildDatiBeniServizi(items)
  const datiPagamento = buildDatiPagamento(invoice)

  return block('FatturaElettronicaBody', [
    datiGenerali,
    datiBeniServizi,
    datiPagamento,
  ].filter(Boolean).join('\n'))
}

/**
 * 2.1 DatiGenerali
 */
function buildDatiGenerali(invoice: InvoiceData): string {
  const tipoDocumento = TIPO_DOCUMENTO_MAP[invoice.invoice_type] || 'TD01'

  // Build Causale elements (notes, split into 200-char chunks)
  let causaleElements = ''
  if (invoice.notes) {
    const chunks = splitCausale(invoice.notes, 200)
    causaleElements = chunks.map(chunk => tag('Causale', chunk)).join('\n')
  }

  const datiGeneraliDocumento = block('DatiGeneraliDocumento', [
    tag('TipoDocumento', tipoDocumento),
    tag('Divisa', 'EUR'),
    tag('Data', invoice.invoice_date),
    tag('Numero', truncate(invoice.invoice_number, 20)),
    tag('ImportoTotaleDocumento', invoice.total),
    causaleElements,
  ].filter(Boolean).join('\n'))

  return block('DatiGenerali', datiGeneraliDocumento)
}

/**
 * 2.2 DatiBeniServizi
 */
function buildDatiBeniServizi(items: InvoiceItemData[]): string {
  // DettaglioLinee for each item
  const dettaglioLinee = items.map((item, index) => {
    return block('DettaglioLinee', [
      tag('NumeroLinea', String(index + 1)),
      tag('Descrizione', truncate(item.description, 1000)),
      tag('Quantita', formatAmount(item.quantity)),
      tag('PrezzoUnitario', formatAmount(item.unit_price)),
      tag('PrezzoTotale', formatAmount(item.total)),
      tag('AliquotaIVA', formatAmount(item.vat_rate)),
    ].join('\n'))
  })

  // DatiRiepilogo: aggregate by VAT rate
  const vatGroups = groupByVatRate(items)
  const datiRiepilogo = vatGroups.map(group => {
    const elements = [
      tag('AliquotaIVA', formatAmount(group.aliquotaIVA)),
      tag('ImponibileImporto', formatAmount(group.imponibileImporto)),
      tag('Imposta', formatAmount(group.imposta)),
      tag('EsigibilitaIVA', 'I'),
    ]

    // For zero-rate VAT, include Natura code
    if (group.aliquotaIVA === 0) {
      // N4 = Esenti (exempt) - most common for zero-rate hotel services
      // Insert Natura before EsigibilitaIVA
      elements.splice(3, 0, tag('Natura', 'N4'))
    }

    return block('DatiRiepilogo', elements.join('\n'))
  })

  return block('DatiBeniServizi', [
    ...dettaglioLinee,
    ...datiRiepilogo,
  ].join('\n'))
}

/**
 * Groups invoice items by VAT rate for DatiRiepilogo.
 */
function groupByVatRate(items: InvoiceItemData[]): Array<{
  aliquotaIVA: number
  imponibileImporto: number
  imposta: number
}> {
  const groups = new Map<number, { imponibileImporto: number; imposta: number }>()

  for (const item of items) {
    const rate = item.vat_rate
    const existing = groups.get(rate)
    if (existing) {
      existing.imponibileImporto += item.total
      existing.imposta += item.vat_amount
    } else {
      groups.set(rate, {
        imponibileImporto: item.total,
        imposta: item.vat_amount,
      })
    }
  }

  // Sort by VAT rate ascending
  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([rate, data]) => ({
      aliquotaIVA: rate,
      imponibileImporto: Math.round(data.imponibileImporto * 100) / 100,
      imposta: Math.round(data.imposta * 100) / 100,
    }))
}

/**
 * 2.4 DatiPagamento
 */
function buildDatiPagamento(invoice: InvoiceData): string {
  const modalitaPagamento = invoice.payment_method
    ? (MODALITA_PAGAMENTO_MAP[invoice.payment_method] || 'MP05')
    : 'MP05' // Default to bank transfer

  const dettaglioPagamento = block('DettaglioPagamento', [
    tag('ModalitaPagamento', modalitaPagamento),
    tag('ImportoPagamento', invoice.total),
  ].join('\n'))

  return block('DatiPagamento', [
    tag('CondizioniPagamento', 'TP02'), // TP02 = pagamento completo
    dettaglioPagamento,
  ].join('\n'))
}

// ---------------------------------------------------------------------------
// Invoice Number Generation
// ---------------------------------------------------------------------------

/**
 * Generates a formatted invoice number.
 *
 * @param prefix - Prefix (e.g., "FT" for Fattura, "NC" for Nota di Credito)
 * @param year   - Year (e.g., 2026)
 * @param number - Sequential number
 * @returns Formatted invoice number, e.g., "FT-2026-00001"
 */
export function generateInvoiceNumber(prefix: string, year: number, number: number): string {
  const paddedNumber = String(number).padStart(5, '0')
  return `${prefix}-${year}-${paddedNumber}`
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a FatturaPA XML string against required structural elements.
 *
 * This performs structural/field presence validation, not full XSD validation.
 * For production use, XSD validation should be done server-side against the
 * official schema.
 *
 * @param xml - The FatturaPA XML string to validate
 * @returns Object with `valid` boolean and `errors` array
 */
export function validateFatturaPA(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!xml || xml.trim().length === 0) {
    return { valid: false, errors: ['XML document is empty'] }
  }

  // Check XML declaration
  if (!xml.startsWith('<?xml')) {
    errors.push('Missing XML declaration')
  }

  // Check root element
  if (!xml.includes('<p:FatturaElettronica')) {
    errors.push('Missing root element <p:FatturaElettronica>')
  }

  // Check version attribute
  if (!xml.includes('versione="FPR12"')) {
    errors.push('Missing or incorrect versione attribute (expected FPR12)')
  }

  // Check required namespaces
  if (!xml.includes(FATTURAPA_NAMESPACE)) {
    errors.push('Missing FatturaPA namespace')
  }

  // --- Header checks ---
  const headerRequiredElements = [
    'FatturaElettronicaHeader',
    'DatiTrasmissione',
    'IdTrasmittente',
    'IdPaese',
    'IdCodice',
    'FormatoTrasmissione',
    'CodiceDestinatario',
    'CedentePrestatore',
    'CessionarioCommittente',
  ]

  for (const el of headerRequiredElements) {
    if (!xml.includes(`<${el}>`)) {
      errors.push(`Missing required header element: <${el}>`)
    }
  }

  // Check CedentePrestatore required sub-elements
  const cedenteRequired = [
    'DatiAnagrafici',
    'Anagrafica',
    'Denominazione',
    'RegimeFiscale',
    'Sede',
    'Indirizzo',
    'CAP',
    'Comune',
    'Nazione',
  ]
  for (const el of cedenteRequired) {
    // These elements may appear in both cedente and cessionario; just check presence
    if (!xml.includes(`<${el}>`)) {
      errors.push(`Missing required element: <${el}>`)
    }
  }

  // Check cedente must have either IdFiscaleIVA or CodiceFiscale
  if (!xml.includes('<IdFiscaleIVA>') && !xml.includes('<CodiceFiscale>')) {
    errors.push('CedentePrestatore must have either IdFiscaleIVA or CodiceFiscale')
  }

  // --- Body checks ---
  const bodyRequiredElements = [
    'FatturaElettronicaBody',
    'DatiGenerali',
    'DatiGeneraliDocumento',
    'TipoDocumento',
    'Divisa',
    'Data',
    'Numero',
    'DatiBeniServizi',
    'DettaglioLinee',
    'NumeroLinea',
    'Descrizione',
    'PrezzoUnitario',
    'PrezzoTotale',
    'AliquotaIVA',
    'DatiRiepilogo',
    'ImponibileImporto',
    'Imposta',
    'EsigibilitaIVA',
    'DatiPagamento',
    'CondizioniPagamento',
    'DettaglioPagamento',
    'ModalitaPagamento',
    'ImportoPagamento',
  ]

  for (const el of bodyRequiredElements) {
    if (!xml.includes(`<${el}>`)) {
      errors.push(`Missing required body element: <${el}>`)
    }
  }

  // Validate TipoDocumento value
  const tipoDocMatch = xml.match(/<TipoDocumento>(TD\d{2})<\/TipoDocumento>/)
  if (tipoDocMatch) {
    const validTypes = ['TD01', 'TD02', 'TD03', 'TD04', 'TD05', 'TD06', 'TD16', 'TD17', 'TD18', 'TD19', 'TD20', 'TD21', 'TD22', 'TD23', 'TD24', 'TD25', 'TD26', 'TD27', 'TD28']
    if (!validTypes.includes(tipoDocMatch[1]!)) {
      errors.push(`Invalid TipoDocumento value: ${tipoDocMatch[1]!}`)
    }
  }

  // Validate FormatoTrasmissione
  const formatoMatch = xml.match(/<FormatoTrasmissione>(FP[AR]\d{2})<\/FormatoTrasmissione>/)
  if (formatoMatch) {
    if (!['FPA12', 'FPR12'].includes(formatoMatch[1]!)) {
      errors.push(`Invalid FormatoTrasmissione: ${formatoMatch[1]!} (expected FPA12 or FPR12)`)
    }
  }

  // Validate Divisa
  if (xml.includes('<Divisa>') && !xml.includes('<Divisa>EUR</Divisa>')) {
    errors.push('Divisa must be EUR')
  }

  // Validate date format (YYYY-MM-DD)
  const dataMatch = xml.match(/<Data>([^<]+)<\/Data>/)
  if (dataMatch) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataMatch[1]!)) {
      errors.push(`Invalid date format: ${dataMatch[1]!} (expected YYYY-MM-DD)`)
    }
  }

  // Validate CondizioniPagamento
  const condizioniMatch = xml.match(/<CondizioniPagamento>(TP\d{2})<\/CondizioniPagamento>/)
  if (condizioniMatch) {
    if (!['TP01', 'TP02', 'TP03'].includes(condizioniMatch[1]!)) {
      errors.push(`Invalid CondizioniPagamento: ${condizioniMatch[1]!}`)
    }
  }

  // Validate ModalitaPagamento
  const modalitaMatch = xml.match(/<ModalitaPagamento>(MP\d{2})<\/ModalitaPagamento>/)
  if (modalitaMatch) {
    const validMP = ['MP01', 'MP02', 'MP03', 'MP04', 'MP05', 'MP06', 'MP07', 'MP08', 'MP09', 'MP10', 'MP11', 'MP12', 'MP13', 'MP14', 'MP15', 'MP16', 'MP17', 'MP18', 'MP19', 'MP20', 'MP21', 'MP22', 'MP23']
    if (!validMP.includes(modalitaMatch[1]!)) {
      errors.push(`Invalid ModalitaPagamento: ${modalitaMatch[1]!}`)
    }
  }

  // Validate RegimeFiscale
  const regimeMatch = xml.match(/<RegimeFiscale>(RF\d{2})<\/RegimeFiscale>/)
  if (regimeMatch) {
    const validRF = ['RF01', 'RF02', 'RF04', 'RF05', 'RF06', 'RF07', 'RF08', 'RF09', 'RF10', 'RF11', 'RF12', 'RF13', 'RF14', 'RF15', 'RF16', 'RF17', 'RF18', 'RF19']
    if (!validRF.includes(regimeMatch[1]!)) {
      errors.push(`Invalid RegimeFiscale: ${regimeMatch[1]!}`)
    }
  }

  // Validate EsigibilitaIVA
  const esigibilitaMatches = xml.matchAll(/<EsigibilitaIVA>([^<]+)<\/EsigibilitaIVA>/g)
  for (const match of esigibilitaMatches) {
    if (!['I', 'D', 'S'].includes(match[1]!)) {
      errors.push(`Invalid EsigibilitaIVA: ${match[1]!} (expected I, D, or S)`)
    }
  }

  // Validate Natura is present when AliquotaIVA is 0.00
  const aliquotaMatches = [...xml.matchAll(/<AliquotaIVA>0\.00<\/AliquotaIVA>/g)]
  if (aliquotaMatches.length > 0) {
    if (!xml.includes('<Natura>')) {
      errors.push('Natura element is required when AliquotaIVA is 0.00')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ---------------------------------------------------------------------------
// File Name Generation
// ---------------------------------------------------------------------------

/**
 * Generates the FatturaPA file name according to SDI naming convention.
 *
 * Format: {CountryCode}{VATNumber}_{Progressivo}.xml
 * Example: IT01234567890_XXXXX.xml
 *
 * The progressivo is a 5-character alphanumeric string (base-36) that
 * uniquely identifies the file within the sender's transmissions.
 *
 * @param countryCode  - ISO 3166-1 alpha-2 country code (e.g., "IT")
 * @param vatNumber    - VAT number without country prefix
 * @param progressivo  - Sequential number to convert to 5-char alphanumeric
 * @returns Formatted file name
 */
export function formatFatturaFileName(
  countryCode: string,
  vatNumber: string,
  progressivo: number | string
): string {
  const country = countryCode.toUpperCase().substring(0, 2)
  // Strip any country prefix from VAT number
  const cleanVat = vatNumber.replace(/^[A-Z]{2}/, '')

  let progressivoStr: string
  if (typeof progressivo === 'number') {
    // Convert to base-36 and pad to 5 characters
    progressivoStr = progressivo.toString(36).toUpperCase().padStart(5, '0')
  } else {
    progressivoStr = progressivo.toUpperCase().padStart(5, '0')
  }

  // Ensure exactly 5 characters
  progressivoStr = progressivoStr.substring(0, 5)

  return `${country}${cleanVat}_${progressivoStr}.xml`
}
