/**
 * TouraTableClient — Restaurant booking widget SDK
 * Pubblica prenotazione tavolo via API pubbliche /api/public/restaurant/*
 */

export interface TableClientConfig {
  baseUrl: string
  slug: string
}

export interface RestaurantContextResponse {
  id: string
  slug: string
  name: string
  cuisine_type: string[]
  price_range: number | null
  capacity_total: number
  avg_turn_minutes: number
  reservation_mode: string
  opening_hours: Record<string, Array<{ open: string; close: string }>>
  services: Array<{ name: string; start: string; end: string; max_covers?: number }>
  deposit_policy: { enabled?: boolean; amount_per_cover?: number; above_party?: number }
  template?: string
  theme?: Record<string, string>
}

export interface AvailabilityResponse {
  slug: string
  date: string
  partySize: number
  service: string | null
  slots: string[]
  depositRequired: boolean
  depositAmount: number
}

export interface ReserveInput {
  guestName: string
  guestEmail: string
  guestPhone: string
  partySize: number
  slotDate: string
  slotTime: string
  serviceLabel?: string
  specialRequests?: string
  allergies?: string[]
  occasion?: string
}

export interface ReserveResponse {
  reservationId: string
  status: 'pending_deposit' | 'confirmed'
  tableIds: string[]
  depositRequired: boolean
  depositAmount: number
  checkoutRequired: boolean
  idempotent?: boolean
}

export interface CheckoutResponse {
  checkoutUrl: string
  sessionId: string
}

export class TouraTableClient {
  private baseUrl: string
  private slug: string

  constructor(config: TableClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '')
    this.slug = config.slug
  }

  async context(): Promise<RestaurantContextResponse> {
    const r = await fetch(`${this.baseUrl}/api/public/restaurant/context?slug=${this.slug}`)
    if (!r.ok) throw new Error(`context ${r.status}`)
    return r.json() as Promise<RestaurantContextResponse>
  }

  async availability(date: string, party: number, service?: string): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({ slug: this.slug, date, party: String(party) })
    if (service) params.set('service', service)
    const r = await fetch(`${this.baseUrl}/api/public/restaurant/availability?${params.toString()}`)
    if (!r.ok) throw new Error(`availability ${r.status}`)
    return r.json() as Promise<AvailabilityResponse>
  }

  async reserve(input: ReserveInput, idempotencyKey?: string): Promise<ReserveResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
    const r = await fetch(`${this.baseUrl}/api/public/restaurant/reserve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...input, slug: this.slug, source: 'widget' }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error ?? `reserve ${r.status}`)
    return data as ReserveResponse
  }

  async checkout(reservationId: string, successUrl: string, cancelUrl: string): Promise<CheckoutResponse> {
    const r = await fetch(`${this.baseUrl}/api/public/restaurant/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationId, successUrl, cancelUrl }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data.error ?? `checkout ${r.status}`)
    return data as CheckoutResponse
  }
}
