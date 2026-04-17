import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from '../types'

/**
 * Emitter: Locazione Turistica (privato, <30gg, no P.IVA).
 *
 * Output:
 *  - Ricevuta non fiscale (receipt) numerata annuale
 *  - CIN code push AdE (se configurato)
 *  - Alloggiati web push (obbligatorio Questura)
 *  - NO IVA, NO SDI, NO RT
 *  - Marca da bollo €2 se >€77.47 (obbligatorio ricevuta non fiscale)
 */
export class LocazioneTuristicaEmitter implements FiscalEmitter {
  readonly name = 'locazione_turistica'

  canHandle(ctx: BundleItemContext): boolean {
    return (
      ctx.legalEntity.type === 'private' &&
      ctx.itemType === 'hospitality' &&
      (ctx.legalEntity.fiscalRegime === 'locazione_turistica_privata' ||
        ctx.legalEntity.fiscalRegime === 'cedolare_secca_21' ||
        ctx.legalEntity.fiscalRegime === 'cedolare_secca_26')
    )
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    const stampDuty = ctx.totalCents >= 7747 ? 200 : 0  // €2.00 marca bollo se >€77.47
    const issuedAt = new Date().toISOString()

    return {
      documentType: 'receipt',
      emitterType: 'locazione_turistica',
      number: `LT-${new Date().getFullYear()}-${ctx.itemId.slice(0, 8).toUpperCase()}`,
      series: 'LT',
      issuedAt,
      totalCents: ctx.totalCents,
      vatCents: 0,
      regionalRef: ctx.legalEntity.cinCode ?? undefined,
      requiresRtPush: false,
      requiresSdiPush: false,
      requiresRegionalPush: true,  // CIN + alloggiati web
      stampDutyCents: stampDuty,
      metadata: {
        issuer: {
          type: 'private',
          name: ctx.legalEntity.displayName,
          fiscal_code: ctx.legalEntity.fiscalCode,
          cin_code: ctx.legalEntity.cinCode,
          cin_region: ctx.legalEntity.cinRegionCode,
          regime: ctx.legalEntity.fiscalRegime,
        },
        guest: {
          name: ctx.guest.fullName,
          email: ctx.guest.email,
          fiscal_code: ctx.guest.fiscalCode,
        },
        service: {
          type: 'locazione_turistica',
          service_date: ctx.serviceDate,
          end_date: ctx.endDate,
          nights: ctx.quantity,
        },
        compliance: {
          cin_required: true,
          alloggiati_web_required: true,
          stamp_duty_cents: stampDuty,
          note: stampDuty > 0 ? 'Marca da bollo €2 obbligatoria (>€77.47)' : undefined,
        },
      },
    }
  }
}
