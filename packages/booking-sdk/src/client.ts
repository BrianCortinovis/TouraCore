import type { SdkProperty, SdkRatePlan, SdkUpsell, SdkTheme } from './types'

export interface BookingClientConfig {
  /** Base URL TouraCore API — es. "https://app.touracore.com" */
  baseUrl: string
  /** Slug entity pubblico — es. "grand-hotel-adriatico" */
  slug: string
  /** (Opzionale) Public API key se richiesta per questo entity */
  apiKey?: string
}

export interface SdkBookingContext {
  property: SdkProperty
  ratePlans: SdkRatePlan[]
  upsells: SdkUpsell[]
  defaultRatePlanId: string | null
  cancellationPolicyText: string | null
  theme: SdkTheme
  template: 'minimal' | 'luxury' | 'mobile'
}

export interface SdkAvailabilityItem {
  roomTypeId: string
  roomTypeName: string
  description: string | null
  baseOccupancy: number
  maxOccupancy: number
  photos: string[]
  amenities: string[]
  sizeSqm: number | null
  bedConfiguration: string | null
  availableRooms: number
  totalRooms: number
  pricePerNight: number
  totalPrice: number
}

export interface SdkCreateBookingInput {
  entityId: string
  roomTypeId: string
  ratePlanId?: string | null
  checkIn: string
  checkOut: string
  adults: number
  children?: number
  infants?: number
  petCount?: number
  guestName: string
  guestEmail: string
  guestPhone: string
  nationality?: string
  specialRequests?: string
  privacyConsent: boolean
  marketingConsent?: boolean
  selectedUpsells?: Array<{ offerId: string; quantity: number }>
}

/**
 * Client headless per booking engine TouraCore.
 *
 * Uso in sito custom Next.js:
 * ```ts
 * import { TouraBookingClient } from '@touracore/booking-sdk'
 *
 * const client = new TouraBookingClient({
 *   baseUrl: 'https://app.touracore.com',
 *   slug: 'grand-hotel-adriatico',
 * })
 *
 * const ctx = await client.getContext()
 * const rooms = await client.searchAvailability({ checkIn: '2026-06-10', checkOut: '2026-06-14', guests: 2 })
 * const booking = await client.createBooking({ ... })
 * const { url } = await client.createCheckoutSession(booking.reservationId)
 * window.location.href = url
 * ```
 *
 * Tu costruisci la tua UI, il client gestisce API + Stripe checkout redirect.
 */
export class TouraBookingClient {
  private baseUrl: string
  private slug: string
  private apiKey?: string

  constructor(cfg: BookingClientConfig) {
    this.baseUrl = cfg.baseUrl.replace(/\/$/, '')
    this.slug = cfg.slug
    this.apiKey = cfg.apiKey
  }

  async getContext(): Promise<SdkBookingContext> {
    const r = await this.fetch(`/api/public/booking/context?slug=${encodeURIComponent(this.slug)}`)
    if (!r.ok) throw new Error(`context ${r.status}`)
    return r.json()
  }

  async searchAvailability(params: {
    checkIn: string
    checkOut: string
    guests: number
    ratePlanId?: string
  }): Promise<{ nights: number; items: SdkAvailabilityItem[] }> {
    const q = new URLSearchParams({
      slug: this.slug,
      check_in: params.checkIn,
      check_out: params.checkOut,
      guests: String(params.guests),
    })
    if (params.ratePlanId) q.set('rate_plan_id', params.ratePlanId)
    const r = await this.fetch(`/api/public/booking/availability?${q.toString()}`)
    if (!r.ok) throw new Error(`availability ${r.status}`)
    return r.json()
  }

  async createBooking(input: SdkCreateBookingInput): Promise<{
    reservationCode: string
    reservationId: string
    checkIn: string
    checkOut: string
    totalAmount: number
    currency: string
    ratePlanId: string
  }> {
    const r = await this.fetch('/api/public/booking/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({})) as { error?: string }
      throw new Error(err.error ?? `create ${r.status}`)
    }
    return r.json()
  }

  async createCheckoutSession(reservationId: string, opts?: {
    returnUrl?: string
    cancelUrl?: string
  }): Promise<{ url: string; sessionId: string }> {
    const r = await this.fetch('/api/public/booking/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId, ...opts }),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => ({})) as { error?: string }
      throw new Error(err.error ?? `checkout ${r.status}`)
    }
    return r.json()
  }

  private fetch(path: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers)
    if (this.apiKey) headers.set('X-Booking-Key', this.apiKey)
    return fetch(`${this.baseUrl}${path}`, { ...init, headers })
  }
}
