import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from '../types'

/**
 * Emitter: Fattura elettronica SDI (B2B o B2C con richiesta fattura).
 *
 * - Trigger: guest.isBusiness=true OPPURE guest.fiscalCode present + vertical non restaurant
 * - XML FatturaPA 1.2.2
 * - Regime forfettario: IVA 0, marca bollo €2 se >€77.47
 * - Esportazione SDI via adapter esterno (pass-through)
 */
export class SDIInvoiceEmitter implements FiscalEmitter {
  readonly name = 'sdi_invoice'

  canHandle(ctx: BundleItemContext): boolean {
    if (ctx.legalEntity.type !== 'business') return false
    if (ctx.legalEntity.fiscalRegime === 'forfettario') return false  // gestito dal forfettario emitter
    // B2B sempre SDI
    if (ctx.guest.isBusiness) return true
    // Hospitality sempre fattura (eccetto private gestito da locazione_turistica)
    if (ctx.itemType === 'hospitality') return true
    // Experience / bike / wellness con richiesta fattura
    if (['experience','bike_rental','wellness','moto_rental','ski_school'].includes(ctx.itemType)) {
      return Boolean(ctx.guest.fiscalCode || ctx.guest.vatNumber)
    }
    return false
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    const year = new Date().getFullYear()
    const number = `${year}-${ctx.itemId.slice(0, 8).toUpperCase()}`
    const issuedAt = new Date().toISOString()

    const docType = ctx.itemType === 'hospitality' && !ctx.guest.isBusiness
      ? 'hospitality_invoice'
      : 'b2b_invoice'

    return {
      documentType: docType,
      emitterType: 'sdi_invoice',
      number,
      series: 'FT',
      issuedAt,
      totalCents: ctx.totalCents,
      vatCents: ctx.vatCents,
      xmlPayload: buildFatturaPAXml(ctx, number),
      requiresRtPush: false,
      requiresSdiPush: true,
      requiresRegionalPush: ctx.itemType === 'hospitality',  // alloggiati web + CIN
      stampDutyCents: 0,
      metadata: {
        issuer: {
          vat_number: ctx.legalEntity.vatNumber,
          company: ctx.legalEntity.companyName,
          regime: ctx.legalEntity.fiscalRegime,
        },
        recipient: {
          vat_number: ctx.guest.vatNumber,
          fiscal_code: ctx.guest.fiscalCode,
          sdi_code: ctx.guest.sdiCode ?? '0000000',
          is_business: ctx.guest.isBusiness,
          name: ctx.guest.companyName ?? ctx.guest.fullName,
          billing_address: ctx.guest.billingAddress,
        },
        line_items: ctx.lineItems ?? [{
          description: ctx.description,
          quantity: ctx.quantity,
          unitPriceCents: ctx.unitPriceCents,
          vatRate: ctx.vatRate,
        }],
        vat_breakdown: {
          rate: ctx.vatRate,
          taxable_cents: ctx.subtotalCents,
          vat_cents: ctx.vatCents,
        },
      },
    }
  }
}

/**
 * Placeholder XML builder — integrazione reale con @touracore/fiscal-sdi (packaged separately).
 */
function buildFatturaPAXml(ctx: BundleItemContext, number: string): string {
  // Minimal FatturaPA 1.2.2 skeleton — sostituito da vero builder in pipeline push SDI.
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- FatturaPA placeholder, item ${ctx.itemId} number ${number} -->
<FatturaElettronica>
  <FatturaElettronicaHeader>
    <CedentePrestatore>
      <DatiAnagrafici>
        <IdFiscaleIVA>
          <IdPaese>IT</IdPaese>
          <IdCodice>${ctx.legalEntity.vatNumber ?? ''}</IdCodice>
        </IdFiscaleIVA>
        <Anagrafica>
          <Denominazione>${escapeXml(ctx.legalEntity.companyName ?? ctx.legalEntity.displayName)}</Denominazione>
        </Anagrafica>
      </DatiAnagrafici>
    </CedentePrestatore>
  </FatturaElettronicaHeader>
  <FatturaElettronicaBody>
    <DatiGenerali>
      <DatiGeneraliDocumento>
        <TipoDocumento>TD01</TipoDocumento>
        <Divisa>EUR</Divisa>
        <Data>${ctx.serviceDate}</Data>
        <Numero>${number}</Numero>
        <ImportoTotaleDocumento>${(ctx.totalCents / 100).toFixed(2)}</ImportoTotaleDocumento>
      </DatiGeneraliDocumento>
    </DatiGenerali>
  </FatturaElettronicaBody>
</FatturaElettronica>`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
