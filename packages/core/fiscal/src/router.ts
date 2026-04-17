import type { BundleItemContext, FiscalDocumentResult, FiscalEmitter } from './types'
import {
  LocazioneTuristicaEmitter,
  RestaurantRTEmitter,
  SDIInvoiceEmitter,
  SDIForfettarioEmitter,
  PrestazioneOccasionaleEmitter,
  CortesiaEmitter,
} from './emitters'

/**
 * FiscalRouter — seleziona l'emitter corretto in base al context.
 *
 * Ordine priorità:
 *  1. LocazioneTuristica (private + hospitality)
 *  2. Forfettario (business + regime forfettario) — prima di SDIInvoice generico
 *  3. Occasionale (type='occasionale')
 *  4. RestaurantRT (business + restaurant + !B2B)
 *  5. SDIInvoice (B2B OR hospitality business)
 *  6. Cortesia (fallback)
 */
export class FiscalRouter {
  private readonly emitters: FiscalEmitter[]

  constructor(customEmitters?: FiscalEmitter[]) {
    this.emitters = customEmitters ?? [
      new LocazioneTuristicaEmitter(),
      new SDIForfettarioEmitter(),
      new PrestazioneOccasionaleEmitter(),
      new RestaurantRTEmitter(),
      new SDIInvoiceEmitter(),
      new CortesiaEmitter(),
    ]
  }

  route(ctx: BundleItemContext): FiscalEmitter {
    const handler = this.emitters.find((e) => e.canHandle(ctx))
    if (!handler) {
      throw new FiscalRoutingError(
        `Nessun fiscal emitter gestisce ctx: legal_entity.type=${ctx.legalEntity.type}, regime=${ctx.legalEntity.fiscalRegime}, item=${ctx.itemType}, is_b2b=${ctx.guest.isBusiness}`,
        ctx,
      )
    }
    return handler
  }

  async emit(ctx: BundleItemContext): Promise<FiscalDocumentResult> {
    const emitter = this.route(ctx)
    return emitter.emit(ctx)
  }

  async emitMany(contexts: BundleItemContext[]): Promise<FiscalDocumentResult[]> {
    return Promise.all(contexts.map((ctx) => this.emit(ctx)))
  }
}

export class FiscalRoutingError extends Error {
  constructor(message: string, public readonly ctx: BundleItemContext) {
    super(message)
    this.name = 'FiscalRoutingError'
  }
}

/**
 * Helper singleton default.
 */
export const defaultFiscalRouter = new FiscalRouter()
