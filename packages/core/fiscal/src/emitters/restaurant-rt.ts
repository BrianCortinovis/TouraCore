import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from '../types'

/**
 * Emitter: Scontrino Telematico RT (ristorazione + retail P.IVA).
 *
 * - Richiede RT device + push corrispettivi telematici AdE
 * - IVA 10% ristorazione standard (bevande alcoliche 22%)
 * - Se cliente B2B (ha P.IVA) → usa B2B invoice emitter invece
 */
export class RestaurantRTEmitter implements FiscalEmitter {
  readonly name = 'fiscal_receipt_rt'

  canHandle(ctx: BundleItemContext): boolean {
    return (
      ctx.itemType === 'restaurant' &&
      ctx.legalEntity.type === 'business' &&
      !ctx.guest.isBusiness &&  // B2B va a SDI emitter
      Boolean(ctx.legalEntity.rtDeviceSerial)
    )
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    const issuedAt = new Date().toISOString()
    return {
      documentType: 'fiscal_receipt',
      emitterType: 'fiscal_receipt_rt',
      number: `RT-${new Date().getFullYear()}-${ctx.itemId.slice(0, 8).toUpperCase()}`,
      series: 'RT',
      issuedAt,
      totalCents: ctx.totalCents,
      vatCents: ctx.vatCents,
      externalRef: null as unknown as string | undefined,  // settato post-push RT
      requiresRtPush: true,
      requiresSdiPush: false,
      requiresRegionalPush: false,
      stampDutyCents: 0,
      metadata: {
        issuer: {
          vat_number: ctx.legalEntity.vatNumber,
          company: ctx.legalEntity.companyName,
          rt_serial: ctx.legalEntity.rtDeviceSerial,
          rt_provider: ctx.legalEntity.rtProvider,
        },
        service: {
          type: 'restaurant',
          service_date: ctx.serviceDate,
          covers: ctx.quantity,
        },
        line_items: ctx.lineItems ?? [],
        vat_breakdown: {
          rate: ctx.vatRate,
          taxable_cents: ctx.subtotalCents,
          vat_cents: ctx.vatCents,
        },
        compliance: {
          corrispettivi_telematici_required: true,
          lottery_code_accepted: true,
        },
      },
    }
  }
}
