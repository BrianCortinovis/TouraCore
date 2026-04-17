/**
 * IVA rates Italia per vertical / categoria.
 */

import type { ItemType } from './types'

export type VatRate = 0 | 4 | 5 | 10 | 22

export function defaultVatRate(itemType: ItemType, category?: string): VatRate {
  switch (itemType) {
    case 'hospitality':
      return 10  // alberghiera art. 123 Tab.A Parte III
    case 'restaurant': {
      // Bevande alcoliche / aperitivi = 22%, cibo / bevande analcoliche = 10%
      if (category === 'alcoholic' || category === 'spirits' || category === 'wine') return 22
      return 10
    }
    case 'experience':
      return 22  // tour / attività guidata standard
    case 'wellness':
      return 22  // SPA
    case 'bike_rental':
    case 'moto_rental':
      return 22
    case 'ski_school':
      return 22
    case 'addon':
      return 22
    default:
      return 22
  }
}

/**
 * Calcola VAT scorporata da prezzo IVA inclusa.
 *   totalCents = price_incl_vat
 *   taxableCents = totalCents / (1 + vatRate/100)
 *   vatCents = totalCents - taxableCents
 */
export function extractVat(totalCents: number, vatRate: VatRate): { taxableCents: number; vatCents: number } {
  if (vatRate === 0) return { taxableCents: totalCents, vatCents: 0 }
  const taxable = Math.round(totalCents / (1 + vatRate / 100))
  return { taxableCents: taxable, vatCents: totalCents - taxable }
}

/**
 * Calcola VAT su imponibile.
 */
export function addVat(taxableCents: number, vatRate: VatRate): { vatCents: number; totalCents: number } {
  if (vatRate === 0) return { vatCents: 0, totalCents: taxableCents }
  const vat = Math.round(taxableCents * (vatRate / 100))
  return { vatCents: vat, totalCents: taxableCents + vat }
}
