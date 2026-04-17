import 'server-only'

/**
 * Generatore XML FatturaPA 1.2.1 conforme schema SDI Agenzia Entrate.
 * Schema: https://www.fatturapa.gov.it/export/documenti/fatturapa/v1.2.1/Schema_VFPR12.xsd
 */

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export interface SDIInvoiceInput {
  // Trasmittente
  cedenteVatNumber: string // IT12345678901
  cedenteFiscalCode?: string
  cedenteName: string
  cedenteRegime: 'RF01' | 'RF02' | 'RF04' | 'RF05' | 'RF06' | 'RF07' | 'RF08' | 'RF09' | 'RF10' | 'RF11' | 'RF12' | 'RF13' | 'RF14' | 'RF15' | 'RF16' | 'RF17' | 'RF18' | 'RF19'
  cedenteAddress: string
  cedenteCity: string
  cedenteZip: string
  cedenteProvince: string

  // Cessionario
  customerVatNumber?: string
  customerFiscalCode?: string
  customerName: string
  customerAddress?: string
  customerCity?: string
  customerZip?: string
  customerCountry: string
  customerSdiCode?: string // 0000000 if PEC, 7-char alphanumeric if SDI
  customerPec?: string

  // Documento
  invoiceNumber: string
  invoiceDate: string // YYYY-MM-DD
  invoiceType: 'TD01' | 'TD24' | 'TD25' | 'TD26' // TD01=fattura, TD24=fattura differita

  // Lines
  lines: Array<{
    number: number
    description: string
    qty: number
    unitPrice: number
    vatPct: number
    vatExemptCode?: string // N1-N7 if exempt
  }>
}

export function buildSDIXml(input: SDIInvoiceInput, progressivoInvio: string): string {
  const totalImponibile = input.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0)
  const totalVat = input.lines.reduce((s, l) => s + l.qty * l.unitPrice * (l.vatPct / 100), 0)
  const total = totalImponibile + totalVat

  // Group lines by VAT rate per DatiRiepilogo
  const vatGroups = new Map<number, { imponibile: number; imposta: number }>()
  for (const l of input.lines) {
    const existing = vatGroups.get(l.vatPct) ?? { imponibile: 0, imposta: 0 }
    existing.imponibile += l.qty * l.unitPrice
    existing.imposta += l.qty * l.unitPrice * (l.vatPct / 100)
    vatGroups.set(l.vatPct, existing)
  }

  const sdiCode = input.customerSdiCode || (input.customerPec ? '0000000' : '0000000')
  const formatoTrasmissione = input.customerVatNumber ? 'FPR12' : 'FPA12'

  const escapedCedenteVat = xmlEscape(input.cedenteVatNumber.replace(/^IT/i, ''))
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<p:FatturaElettronica versione="${formatoTrasmissione}" xmlns:p="http://ivaservizi.agenziaentrate.gov.it/docs/xsd/fatture/v1.2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FatturaElettronicaHeader>
    <DatiTrasmissione>
      <IdTrasmittente>
        <IdPaese>IT</IdPaese>
        <IdCodice>${escapedCedenteVat}</IdCodice>
      </IdTrasmittente>
      <ProgressivoInvio>${xmlEscape(progressivoInvio)}</ProgressivoInvio>
      <FormatoTrasmissione>${formatoTrasmissione}</FormatoTrasmissione>
      <CodiceDestinatario>${xmlEscape(sdiCode)}</CodiceDestinatario>${input.customerPec ? `\n      <PECDestinatario>${xmlEscape(input.customerPec)}</PECDestinatario>` : ''}
    </DatiTrasmissione>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${escapedCedenteVat}</IdCodice>
        </IdFiscaleIVA>${input.cedenteFiscalCode ? `\n        <CodiceFiscale>${xmlEscape(input.cedenteFiscalCode)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${xmlEscape(input.cedenteName)}</Denominazione>
        </Anagrafica>
        <RegimeFiscale>${input.cedenteRegime}</RegimeFiscale>
      </DatiAnagrafici>
      <Sede>
        <Indirizzo>${xmlEscape(input.cedenteAddress)}</Indirizzo>
        <CAP>${xmlEscape(input.cedenteZip)}</CAP>
        <Comune>${xmlEscape(input.cedenteCity)}</Comune>
        <Provincia>${xmlEscape(input.cedenteProvince)}</Provincia>
        <Nazione>IT</Nazione>
      </Sede>
    </CedentePrestatore>
    <CessionarioCommittente>
      <DatiAnagrafici>${input.customerVatNumber ? `
        <IdFiscaleIVA>
          <IdPaese>${xmlEscape(input.customerCountry)}</IdPaese>
          <IdCodice>${xmlEscape(input.customerVatNumber.replace(/^[A-Z]{2}/i, ''))}</IdCodice>
        </IdFiscaleIVA>` : ''}${input.customerFiscalCode ? `\n        <CodiceFiscale>${xmlEscape(input.customerFiscalCode)}</CodiceFiscale>` : ''}
        <Anagrafica>
          <Denominazione>${xmlEscape(input.customerName)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>${input.customerAddress ? `
      <Sede>
        <Indirizzo>${xmlEscape(input.customerAddress)}</Indirizzo>
        <CAP>${xmlEscape(input.customerZip ?? '00000')}</CAP>
        <Comune>${xmlEscape(input.customerCity ?? '')}</Comune>
        <Nazione>${xmlEscape(input.customerCountry)}</Nazione>
      </Sede>` : ''}
    </CessionarioCommittente>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>${input.invoiceType}</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${input.invoiceDate}</Data>
        <Numero>${xmlEscape(input.invoiceNumber)}</Numero>
        <ImportoTotaleDocumento>${total.toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
    <DatiBeniServizi>
${input.lines.map((l) => `      <DettaglioLinee>
        <NumeroLinea>${l.number}</NumeroLinea>
        <Descrizione>${xmlEscape(l.description)}</Descrizione>
        <Quantita>${l.qty.toFixed(2)}</Quantita>
        <PrezzoUnitario>${l.unitPrice.toFixed(2)}</PrezzoUnitario>
        <PrezzoTotale>${(l.qty * l.unitPrice).toFixed(2)}</PrezzoTotale>
        <AliquotaIVA>${l.vatPct.toFixed(2)}</AliquotaIVA>${l.vatExemptCode ? `\n        <Natura>${l.vatExemptCode}</Natura>` : ''}
      </DettaglioLinee>`).join('\n')}
${Array.from(vatGroups.entries()).map(([rate, sums]) => `      <DatiRiepilogo>
        <AliquotaIVA>${rate.toFixed(2)}</AliquotaIVA>
        <ImponibileImporto>${sums.imponibile.toFixed(2)}</ImponibileImporto>
        <Imposta>${sums.imposta.toFixed(2)}</Imposta>
        <EsigibilitaIVA>I</EsigibilitaIVA>
      </DatiRiepilogo>`).join('\n')}
    </DatiBeniServizi>
  </FatturaElettronicaBody>
</p:FatturaElettronica>`

  return xml
}

/**
 * Genera nome file SDI conforme: IT[VAT]_[ProgressivoInvio].xml
 * Es: IT12345678901_00001.xml
 */
export function buildSDIFilename(cedenteVatNumber: string, progressivoInvio: string): string {
  const vat = cedenteVatNumber.replace(/^IT/i, '').replace(/[^0-9A-Z]/gi, '')
  const prog = progressivoInvio.replace(/[^0-9A-Z]/gi, '').padStart(5, '0')
  return `IT${vat}_${prog}.xml`
}
