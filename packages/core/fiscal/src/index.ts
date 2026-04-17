/**
 * @touracore/fiscal — Emissione documenti fiscali Italia-compliant.
 *
 * Entry points:
 *  - FiscalRouter: strategy pattern per selezionare emitter corretto
 *  - Emitters: LocazioneTuristica, RestaurantRT, SDIInvoice, SDIForfettario, PrestazioneOccasionale, Cortesia
 *  - VAT helpers: defaultVatRate, extractVat, addVat
 */

export * from './types'
export * from './router'
export * from './vat'
export * from './emitters'
