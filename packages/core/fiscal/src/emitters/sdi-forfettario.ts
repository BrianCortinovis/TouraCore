import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from '../types'

/**
 * Emitter: Fattura regime forfettario.
 *
 * - IVA 0 (natura N2.2 — non soggetta)
 * - Marca da bollo €2 obbligatoria se >€77.47
 * - Causale "Operazione effettuata in regime forfettario ex art. 1 commi 54-89 L. 190/2014"
 * - XML SDI TD01 con RegimeFiscale=RF19
 */
export class SDIForfettarioEmitter implements FiscalEmitter {
  readonly name = 'sdi_forfettario'

  canHandle(ctx: BundleItemContext): boolean {
    return (
      ctx.legalEntity.type === 'business' &&
      ctx.legalEntity.fiscalRegime === 'forfettario'
    )
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    const stampDuty = ctx.totalCents >= 7747 ? 200 : 0
    const year = new Date().getFullYear()
    const number = `FFT-${year}-${ctx.itemId.slice(0, 8).toUpperCase()}`
    const issuedAt = new Date().toISOString()

    return {
      documentType: 'b2b_invoice',
      emitterType: 'sdi_forfettario',
      number,
      series: 'FFT',
      issuedAt,
      totalCents: ctx.totalCents + stampDuty,
      vatCents: 0,
      requiresRtPush: false,
      requiresSdiPush: true,
      requiresRegionalPush: ctx.itemType === 'hospitality',
      stampDutyCents: stampDuty,
      metadata: {
        issuer: {
          vat_number: ctx.legalEntity.vatNumber,
          company: ctx.legalEntity.companyName,
          regime: 'forfettario',
          regime_code: 'RF19',
        },
        recipient: {
          vat_number: ctx.guest.vatNumber,
          fiscal_code: ctx.guest.fiscalCode,
          sdi_code: ctx.guest.sdiCode ?? '0000000',
          name: ctx.guest.companyName ?? ctx.guest.fullName,
        },
        line_items: ctx.lineItems ?? [{
          description: ctx.description,
          quantity: ctx.quantity,
          unitPriceCents: ctx.unitPriceCents,
          vatRate: 0,
          vatNature: 'N2.2',
        }],
        stamp_duty: {
          applicable: stampDuty > 0,
          amount_cents: stampDuty,
          reason: 'Marca da bollo €2 ex art. 13 DPR 642/72',
        },
        causale: 'Operazione effettuata in regime forfettario ex art. 1 commi 54-89 L. 190/2014. Non soggetta a IVA.',
      },
    }
  }
}
