/**
 * Bike rental channel manager types.
 * Unified interface per provider (Bokun/Rezdy/GYG/Viator/OCTO/bike-pure).
 */

export type BikeChannelProvider =
  | 'bokun'
  | 'rezdy'
  | 'octo_ventrata'
  | 'getyourguide'
  | 'viator'
  | 'fareharbor'
  | 'checkfront'
  | 'regiondo'
  | 'listnride'
  | 'civitatis'
  | 'klook'
  | 'musement'
  | 'tiqets'
  | 'headout'
  | 'bikesbooking'
  | 'komoot'
  | 'bikemap'

export interface ChannelCredentials {
  apiKey?: string
  clientId?: string
  clientSecret?: string
  accessToken?: string
  supplierId?: string
  webhookSecret?: string
  [k: string]: unknown
}

export interface ChannelAvailabilityPush {
  bikeTypeId: string
  externalProductId: string
  rentalStart: string
  rentalEnd: string
  availableCount: number
  rate?: number
  currency?: string
}

export interface ChannelRatePush {
  bikeTypeId: string
  externalProductId: string
  date: string
  hourlyRate?: number
  dailyRate?: number
  weeklyRate?: number
  currency: string
}

export interface ChannelInboundBooking {
  externalBookingRef: string
  externalProductId: string
  rentalStart: string
  rentalEnd: string
  quantity: number
  guestName: string
  guestEmail?: string
  guestPhone?: string
  totalAmount: number
  commissionAmount?: number
  netAmount?: number
  currency: string
  status: 'confirmed' | 'cancelled' | 'modified'
  raw: Record<string, unknown>
}

export interface SyncResult {
  success: boolean
  operation: string
  itemsProcessed: number
  errors: string[]
  durationMs: number
}

export interface WebhookResult {
  verified: boolean
  bookings: ChannelInboundBooking[]
  error?: string
}

/**
 * Uniform adapter interface. Every channel provider must implement.
 * Adapters are stateless; credentials + context passed per call.
 */
export interface BikeChannelAdapter {
  readonly provider: BikeChannelProvider

  pushAvailability(args: {
    credentials: ChannelCredentials
    connectionId: string
    items: ChannelAvailabilityPush[]
  }): Promise<SyncResult>

  pushRates(args: {
    credentials: ChannelCredentials
    connectionId: string
    items: ChannelRatePush[]
  }): Promise<SyncResult>

  pullBookings(args: {
    credentials: ChannelCredentials
    connectionId: string
    since?: string
  }): Promise<{ result: SyncResult; bookings: ChannelInboundBooking[] }>

  ackBooking(args: {
    credentials: ChannelCredentials
    externalBookingRef: string
    status: 'accepted' | 'rejected'
  }): Promise<SyncResult>

  cancelBooking(args: {
    credentials: ChannelCredentials
    externalBookingRef: string
    reason?: string
  }): Promise<SyncResult>

  handleWebhook(args: {
    credentials: ChannelCredentials
    payload: string | Record<string, unknown>
    signature?: string
  }): Promise<WebhookResult>
}
