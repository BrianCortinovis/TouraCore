import type {
  BikeChannelAdapter,
  ChannelAvailabilityPush,
  ChannelCredentials,
  ChannelInboundBooking,
  ChannelRatePush,
  SyncResult,
  WebhookResult,
} from '../types'

/**
 * Bókun Channel Manager adapter.
 * Docs: https://docs.bokun.io/en/articles/326-channel-manager-api
 *
 * STATUS: stub scaffolding. Real HTTP calls require Bokun partner API key
 * (`BOKUN_API_BASE` + approved supplier id). Methods return not_implemented
 * SyncResult so wiring + error handling + logs are testable end-to-end.
 *
 * When enabling production:
 * 1. Set env BOKUN_API_BASE (default https://api.bokun.io)
 * 2. Provide credentials via bike_channel_connections.provider_credentials
 *    (apiKey + clientSecret + supplierId)
 * 3. Implement:
 *    - HMAC-signed request header generation (Bokun uses X-Bokun-AccessKey + Date + HMAC-SHA1)
 *    - Product inventory upsert via POST /activity.json
 *    - Availability push via POST /availability.json
 *    - Rate push via POST /pricing-category.json
 *    - Webhook verification via X-Bokun-Signature header
 */

const BOKUN_API_BASE = process.env.BOKUN_API_BASE ?? 'https://api.bokun.io'

function notImplemented(operation: string, durationMs = 0): SyncResult {
  return {
    success: false,
    operation,
    itemsProcessed: 0,
    errors: [`bokun.${operation}: not_implemented (awaiting partner API key)`],
    durationMs,
  }
}

export class BokunAdapter implements BikeChannelAdapter {
  readonly provider = 'bokun' as const

  async pushAvailability(args: {
    credentials: ChannelCredentials
    connectionId: string
    items: ChannelAvailabilityPush[]
  }): Promise<SyncResult> {
    // TODO: POST ${BOKUN_API_BASE}/availability.json with HMAC-signed request
    void args
    void BOKUN_API_BASE
    return notImplemented('pushAvailability')
  }

  async pushRates(args: {
    credentials: ChannelCredentials
    connectionId: string
    items: ChannelRatePush[]
  }): Promise<SyncResult> {
    void args
    return notImplemented('pushRates')
  }

  async pullBookings(args: {
    credentials: ChannelCredentials
    connectionId: string
    since?: string
  }): Promise<{ result: SyncResult; bookings: ChannelInboundBooking[] }> {
    void args
    return {
      result: notImplemented('pullBookings'),
      bookings: [],
    }
  }

  async ackBooking(args: {
    credentials: ChannelCredentials
    externalBookingRef: string
    status: 'accepted' | 'rejected'
  }): Promise<SyncResult> {
    void args
    return notImplemented('ackBooking')
  }

  async cancelBooking(args: {
    credentials: ChannelCredentials
    externalBookingRef: string
    reason?: string
  }): Promise<SyncResult> {
    void args
    return notImplemented('cancelBooking')
  }

  async handleWebhook(args: {
    credentials: ChannelCredentials
    payload: string | Record<string, unknown>
    signature?: string
  }): Promise<WebhookResult> {
    void args
    return {
      verified: false,
      bookings: [],
      error: 'bokun.handleWebhook: not_implemented (awaiting partner API key + HMAC validation)',
    }
  }
}

export const bokunAdapter = new BokunAdapter()
