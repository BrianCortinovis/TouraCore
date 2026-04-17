import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from '../types'

/**
 * Emitter: Prestazione Occasionale.
 *
 * - Max €5000/anno/committente (ritenuta 20% se prestatore occasionale NON professionale)
 * - Limite globale €5000/anno totale (sopra: richiede iscrizione gestione separata INPS)
 * - Output: Ricevuta prestazione occasionale (non fattura)
 * - Marca bollo €2 se >€77.47
 * - NO IVA
 */
export class PrestazioneOccasionaleEmitter implements FiscalEmitter {
  readonly name = 'prestazione_occasionale'

  canHandle(ctx: BundleItemContext): boolean {
    return ctx.legalEntity.type === 'occasionale'
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    const stampDuty = ctx.totalCents >= 7747 ? 200 : 0
    const year = new Date().getFullYear()
    const number = `OCC-${year}-${ctx.itemId.slice(0, 8).toUpperCase()}`
    const issuedAt = new Date().toISOString()

    const projectedYtd = ctx.legalEntity.occasionaleYtdRevenueCents + ctx.totalCents
    const overAnnualLimit = projectedYtd > ctx.legalEntity.occasionaleAnnualLimitCents

    // Ritenuta 20% se prestatore senza P.IVA e committente sostituto d'imposta (B2B)
    const withholdingApplies = ctx.guest.isBusiness
    const withholdingCents = withholdingApplies ? Math.round(ctx.totalCents * 0.20) : 0

    return {
      documentType: 'receipt',
      emitterType: 'prestazione_occasionale',
      number,
      series: 'OCC',
      issuedAt,
      totalCents: ctx.totalCents + stampDuty,
      vatCents: 0,
      requiresRtPush: false,
      requiresSdiPush: false,
      requiresRegionalPush: false,
      stampDutyCents: stampDuty,
      metadata: {
        issuer: {
          type: 'occasionale',
          name: ctx.legalEntity.displayName,
          fiscal_code: ctx.legalEntity.fiscalCode,
        },
        recipient: {
          name: ctx.guest.companyName ?? ctx.guest.fullName,
          fiscal_code: ctx.guest.fiscalCode,
          vat_number: ctx.guest.vatNumber,
          is_business: ctx.guest.isBusiness,
        },
        ytd_tracking: {
          ytd_revenue_cents_before: ctx.legalEntity.occasionaleYtdRevenueCents,
          ytd_revenue_cents_after: projectedYtd,
          annual_limit_cents: ctx.legalEntity.occasionaleAnnualLimitCents,
          over_limit: overAnnualLimit,
          warning: overAnnualLimit ? 'Superato limite €5000/anno. Iscrizione Gestione Separata INPS obbligatoria.' : null,
        },
        withholding: {
          applies: withholdingApplies,
          rate: withholdingApplies ? 0.20 : 0,
          amount_cents: withholdingCents,
          note: withholdingApplies ? 'Ritenuta d\'acconto 20% a carico committente sostituto d\'imposta' : 'B2C, no ritenuta',
        },
        stamp_duty: {
          applicable: stampDuty > 0,
          amount_cents: stampDuty,
        },
        causale: 'Prestazione occasionale non professionale ex art. 2222 c.c. Non soggetta a IVA.',
      },
    }
  }
}
