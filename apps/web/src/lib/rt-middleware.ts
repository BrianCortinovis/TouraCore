import 'server-only'

/**
 * RT Fiscale middleware HTTP client per stampa scontrini IT.
 * Adapter generico: parla con middleware locale (Docker container) che astrae
 * vendor printer (Epson FP90/FP81, Custom RT, Ingenico, Micrelec).
 * Spec middleware: POST /rt/issue, /rt/void, /rt/status
 */

export interface RTReceiptInput {
  restaurantId: string
  orderId: string
  amountTotal: number
  vatBreakdown: Array<{ vatPct: number; imponibile: number; imposta: number }>
  paymentMethod: 'cash' | 'card' | 'mixed'
  lotteryCode?: string
  lines?: Array<{ description: string; qty: number; unitPrice: number; vatPct: number }>
}

export interface RTReceiptResponse {
  ok: boolean
  receiptNumber?: string
  rtSerial?: string
  printedAt?: string
  rawResponse?: string
  error?: string
}

export async function issueRTReceipt(
  middlewareUrl: string,
  input: RTReceiptInput,
): Promise<RTReceiptResponse> {
  if (!middlewareUrl) {
    return { ok: false, error: 'RT middleware URL not configured' }
  }

  try {
    const res = await fetch(`${middlewareUrl.replace(/\/+$/, '')}/rt/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      return { ok: false, error: `RT middleware HTTP ${res.status}: ${errText.slice(0, 200)}` }
    }

    const data = (await res.json()) as {
      ok?: boolean
      receiptNumber?: string
      rtSerial?: string
      printedAt?: string
      raw?: string
      error?: string
    }

    if (!data.ok) {
      return { ok: false, error: data.error ?? 'RT middleware returned non-ok response' }
    }

    return {
      ok: true,
      receiptNumber: data.receiptNumber,
      rtSerial: data.rtSerial,
      printedAt: data.printedAt,
      rawResponse: data.raw,
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown RT middleware error',
    }
  }
}

export async function voidRTReceipt(
  middlewareUrl: string,
  receiptNumber: string,
  rtSerial: string,
): Promise<RTReceiptResponse> {
  try {
    const res = await fetch(`${middlewareUrl.replace(/\/+$/, '')}/rt/void`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiptNumber, rtSerial }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return { ok: false, error: `RT void HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Void error' }
  }
}

/**
 * Build XML corrispettivi telematici ADE con schema corretto.
 * Schema: https://www.agenziaentrate.gov.it/portale/web/guest/schede/comunicazioni/corrispettivi-telematici/specifiche-tecniche-corrispettivi-telematici
 * Versione 1.0 (FlussoTelematico).
 */
export function buildADECorrispettiviXml(input: {
  restaurantVatNumber: string
  restaurantFiscalCode?: string
  submissionDate: string // YYYY-MM-DD
  receipts: Array<{
    receiptNumber: string
    receiptDate: string
    amountTotal: number
    vatTotal: number
    lotteryCode?: string
  }>
  rtSerial: string
}): string {
  const { xmlEscape } = require('./sdi-xml') as { xmlEscape: (s: string) => string }

  const totalAmount = input.receipts.reduce((s, r) => s + r.amountTotal, 0)
  const totalVat = input.receipts.reduce((s, r) => s + r.vatTotal, 0)

  return `<?xml version="1.0" encoding="UTF-8"?>
<DichiarazioneCorrispettivi xmlns="http://www.agenziaentrate.gov.it/corrispettivi/v1.0">
  <Intestazione>
    <PartitaIVA>${xmlEscape(input.restaurantVatNumber.replace(/^IT/i, ''))}</PartitaIVA>${input.restaurantFiscalCode ? `\n    <CodiceFiscale>${xmlEscape(input.restaurantFiscalCode)}</CodiceFiscale>` : ''}
    <DataInvio>${input.submissionDate}</DataInvio>
    <SerialeRT>${xmlEscape(input.rtSerial)}</SerialeRT>
  </Intestazione>
  <Riepilogo>
    <NumeroScontrini>${input.receipts.length}</NumeroScontrini>
    <ImportoTotale>${totalAmount.toFixed(2)}</ImportoTotale>
    <IVATotale>${totalVat.toFixed(2)}</IVATotale>
  </Riepilogo>
  <Scontrini>
${input.receipts.map((r) => `    <Scontrino>
      <Numero>${xmlEscape(r.receiptNumber)}</Numero>
      <Data>${r.receiptDate}</Data>
      <Importo>${r.amountTotal.toFixed(2)}</Importo>
      <IVA>${r.vatTotal.toFixed(2)}</IVA>${r.lotteryCode ? `\n      <CodiceLotteria>${xmlEscape(r.lotteryCode)}</CodiceLotteria>` : ''}
    </Scontrino>`).join('\n')}
  </Scontrini>
</DichiarazioneCorrispettivi>`
}

/**
 * Submit XML corrispettivi a ADE endpoint (sandbox/production).
 * Production endpoint: https://corrispettivi.agenziaentrate.gov.it/
 * Sandbox: usa middleware locale o stub per testing.
 */
export async function submitADECorrispettivi(
  endpointUrl: string,
  xmlPayload: string,
  signedXml?: Buffer,
): Promise<{ ok: boolean; protocolNumber?: string; error?: string }> {
  if (!endpointUrl) {
    return { ok: false, error: 'ADE endpoint not configured' }
  }

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'X-Restaurant-Cert': process.env.ADE_CERT_FINGERPRINT ?? '',
      },
      body: signedXml ? new Uint8Array(signedXml) : xmlPayload,
      signal: AbortSignal.timeout(30_000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      return { ok: false, error: `ADE HTTP ${res.status}: ${errText.slice(0, 300)}` }
    }

    const data = (await res.text()).trim()
    const protocolMatch = data.match(/<ProtocolNumber>([^<]+)<\/ProtocolNumber>/i)

    return {
      ok: true,
      protocolNumber: protocolMatch?.[1],
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'ADE submission error' }
  }
}
