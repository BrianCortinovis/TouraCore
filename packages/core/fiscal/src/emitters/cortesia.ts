import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from '../types'

/**
 * Emitter: Scontrino di cortesia (solo informativo, non fiscale).
 * Fallback quando cliente B2C chiede documento non fiscale per attività non-ristorazione
 * dove il fiscale è già coperto da corrispettivi telematici aggregati.
 */
export class CortesiaEmitter implements FiscalEmitter {
  readonly name = 'cortesia'

  canHandle(_ctx: BundleItemContext): boolean {
    return false  // fallback, mai primary handler
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    return {
      documentType: 'receipt',
      emitterType: 'cortesia',
      number: `COR-${ctx.itemId.slice(0, 8).toUpperCase()}`,
      series: 'COR',
      issuedAt: new Date().toISOString(),
      totalCents: ctx.totalCents,
      vatCents: ctx.vatCents,
      requiresRtPush: false,
      requiresSdiPush: false,
      requiresRegionalPush: false,
      stampDutyCents: 0,
      metadata: {
        note: 'Documento di cortesia. Non valido ai fini fiscali.',
      },
    }
  }
}
