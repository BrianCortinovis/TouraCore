import type { PublicListing } from './types'
import type { AccommodationDetails } from './accommodation'
import type { RestaurantDetails } from './restaurant'
import type { BikeRentalDetails } from './bike-rental'
import { WEEKDAY_KEYS, getWeekdayLabel } from './restaurant'

export interface FaqItem {
  question: string
  answer: string
}

/** Build context-aware FAQ items derived from listing data.
 * Returns at least 3 items when possible (Google rich results threshold). */
export function buildListingFaqs(
  listing: PublicListing,
  opts: {
    accommodation?: AccommodationDetails | null
    restaurant?: RestaurantDetails | null
    bikeRental?: BikeRentalDetails | null
  } = {}
): FaqItem[] {
  const items: FaqItem[] = []
  const name = listing.entity_name

  if (listing.entity_kind === 'accommodation' && opts.accommodation) {
    const a = opts.accommodation
    if (a.check_in_time || a.check_out_time) {
      items.push({
        question: `Quali sono gli orari di check-in e check-out di ${name}?`,
        answer: [
          a.check_in_time ? `Check-in dalle ${a.check_in_time.slice(0, 5)}.` : null,
          a.check_out_time ? `Check-out entro le ${a.check_out_time.slice(0, 5)}.` : null,
        ]
          .filter(Boolean)
          .join(' '),
      })
    }
    if (a.cin_code) {
      items.push({
        question: `Qual è il CIN di ${name}?`,
        answer: `Il Codice Identificativo Nazionale (CIN) della struttura è ${a.cin_code}, conforme al D.L. 145/2023.`,
      })
    }
    if (a.address || a.city) {
      items.push({
        question: `Dove si trova ${name}?`,
        answer: [
          a.address,
          [a.zip, a.city].filter(Boolean).join(' '),
          a.province,
          a.country,
        ]
          .filter(Boolean)
          .join(', '),
      })
    }
    items.push({
      question: `Posso prenotare direttamente su questa pagina?`,
      answer: `Sì, la prenotazione avviene tramite il booking engine di ${listing.tenant_name}: conferma immediata e pagamento sicuro.`,
    })
  }

  if (listing.entity_kind === 'restaurant' && opts.restaurant) {
    const r = opts.restaurant
    const dayWithSlots = WEEKDAY_KEYS.find((d) => (r.opening_hours?.[d]?.length ?? 0) > 0)
    if (dayWithSlots) {
      const slots = r.opening_hours?.[dayWithSlots] ?? []
      const formatted = slots.map((s) => `${s.open}–${s.close}`).join(', ')
      items.push({
        question: `Quali sono gli orari di apertura di ${name}?`,
        answer: `${getWeekdayLabel(dayWithSlots)} ${formatted}. Verifica gli orari completi sul sito.`,
      })
    }
    if (r.cuisine_type.length > 0) {
      items.push({
        question: `Che tipo di cucina propone ${name}?`,
        answer: `${name} propone cucina ${r.cuisine_type.join(', ')}.`,
      })
    }
    items.push({
      question: `Posso prenotare un tavolo online?`,
      answer: `Sì, la prenotazione tavoli avviene tramite il sistema di ${listing.tenant_name}.`,
    })
  }

  if (listing.entity_kind === 'bike_rental' && opts.bikeRental) {
    const b = opts.bikeRental
    if (b.bike_types && b.bike_types.length > 0) {
      items.push({
        question: `Che tipi di bici si possono noleggiare da ${name}?`,
        answer: `Disponibili: ${b.bike_types.join(', ')}.`,
      })
    }
    if (b.address || b.city) {
      items.push({
        question: `Dove ritiro la bici?`,
        answer: [b.address, b.city, b.country].filter(Boolean).join(', '),
      })
    }
    items.push({
      question: `Come prenoto il noleggio?`,
      answer: `Seleziona il tipo di bici, le date e il punto di ritiro: la conferma è immediata.`,
    })
  }

  if (items.length < 3) {
    items.push({
      question: `Come funziona la cancellazione?`,
      answer: `Le condizioni di cancellazione vengono mostrate al checkout, in base alla policy di ${listing.tenant_name}.`,
    })
  }
  if (items.length < 3) {
    items.push({
      question: `Il pagamento è sicuro?`,
      answer: `Sì, i pagamenti sono gestiti tramite Stripe con cifratura PCI-DSS Level 1.`,
    })
  }

  return items
}

/** Schema.org FAQPage payload. Returns null when below Google's 3-question threshold. */
export function buildFaqJsonLd(faqs: FaqItem[]): Record<string, unknown> | null {
  if (faqs.length < 3) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  }
}
