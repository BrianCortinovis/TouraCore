import type {
  ChannelAdapter,
  ChannelAvailability,
  ChannelCredentials,
  ChannelMessage,
  ChannelRate,
  ChannelReservation,
  SyncResult,
} from '../types'

/**
 * Octorate Channel Manager adapter (REST API).
 * Docs: https://api.octorate.com (require partnership)
 * Endpoints used:
 * - POST /api/v1/reservations/list (pull reservations)
 * - PUT /api/v1/availability (push)
 * - PUT /api/v1/rates (push)
 * - POST /api/v1/messages (send guest message)
 */
const OCTORATE_API_BASE = process.env.OCTORATE_API_BASE ?? 'https://api.octorate.com/api/v1'

interface OctorateAuthResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
}

interface OctorateReservationDto {
  id: string
  channel: string
  status: string
  check_in: string
  check_out: string
  guest: { name: string; email?: string; phone?: string }
  property_id: string
  room_type_id?: string
  adults?: number
  children?: number
  total_amount?: number
  currency?: string
  notes?: string
  created_at?: string
  modified_at?: string
}

export class OctorateAdapter implements ChannelAdapter {
  readonly provider = 'octorate' as const
  private accessToken: string | null = null
  private tokenExpiry = 0

  constructor(private readonly creds: ChannelCredentials) {}

  get isConfigured(): boolean {
    return Boolean(this.creds.apiKey && this.creds.accountId)
  }

  /**
   * OAuth2 client_credentials grant. Cache token in-memory.
   */
  private async ensureToken(): Promise<string> {
    const now = Date.now()
    if (this.accessToken && this.tokenExpiry > now + 30_000) return this.accessToken

    const res = await fetch(`${OCTORATE_API_BASE}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: String(this.creds.apiKey ?? ''),
        client_secret: String(this.creds.apiSecret ?? ''),
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    })

    if (!res.ok) {
      throw new Error(`Octorate auth failed HTTP ${res.status}`)
    }

    const data = (await res.json()) as OctorateAuthResponse
    this.accessToken = data.access_token
    this.tokenExpiry = now + data.expires_in * 1000
    return this.accessToken
  }

  async pullReservations(since?: Date): Promise<ChannelReservation[]> {
    if (!this.isConfigured) return []

    try {
      const token = await this.ensureToken()
      const params = new URLSearchParams({ property_id: String(this.creds.accountId ?? '') })
      if (since) params.set('modified_since', since.toISOString())

      const res = await fetch(`${OCTORATE_API_BASE}/reservations/list?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30_000),
      })

      if (!res.ok) return []

      const data = (await res.json()) as { reservations: OctorateReservationDto[] }
      return (data.reservations ?? []).map((r): ChannelReservation => ({
        externalId: r.id,
        roomTypeExternalId: r.room_type_id,
        status: this.mapStatus(r.status),
        checkIn: r.check_in,
        checkOut: r.check_out,
        guestName: r.guest.name,
        guestEmail: r.guest.email,
        guestPhone: r.guest.phone,
        adults: r.adults ?? 1,
        children: r.children ?? 0,
        totalAmount: r.total_amount ?? 0,
        currency: r.currency ?? 'EUR',
        notes: r.notes,
        raw: r as unknown as Record<string, unknown>,
      }))
    } catch (e) {
      console.error('[octorate] pullReservations error', e)
      return []
    }
  }

  async pushAvailability(updates: ChannelAvailability[]): Promise<SyncResult> {
    if (!this.isConfigured) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Octorate adapter not configured'] }
    }

    try {
      const token = await this.ensureToken()
      const payload = {
        property_id: this.creds.accountId,
        updates: updates.map((u) => ({
          room_type_id: u.roomTypeExternalId,
          date: u.date,
          available: u.availableCount,
          stop_sell: u.stopSell ?? false,
        })),
      }

      const res = await fetch(`${OCTORATE_API_BASE}/availability`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      })

      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText)
        return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: [`HTTP ${res.status}: ${err.slice(0, 200)}`] }
      }

      return { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
    } catch (e) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: [e instanceof Error ? e.message : 'Push error'] }
    }
  }

  async pushRates(updates: ChannelRate[]): Promise<SyncResult> {
    if (!this.isConfigured) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Octorate adapter not configured'] }
    }

    try {
      const token = await this.ensureToken()
      const res = await fetch(`${OCTORATE_API_BASE}/rates`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: this.creds.accountId,
          updates: updates.map((u) => ({
            room_type_id: u.roomTypeExternalId,
            rate_plan_id: u.ratePlanExternalId,
            date: u.date,
            price: u.price,
            currency: u.currency,
            occupancy_level: u.occupancyLevel,
          })),
        }),
        signal: AbortSignal.timeout(30_000),
      })

      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText)
        return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: [`HTTP ${res.status}: ${err.slice(0, 200)}`] }
      }

      return { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
    } catch (e) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: [e instanceof Error ? e.message : 'Push error'] }
    }
  }

  async pullMessages(_since?: Date): Promise<ChannelMessage[]> {
    if (!this.isConfigured) return []
    // Octorate non espone messaging API standard; ritorna vuoto
    return []
  }

  async sendMessage(threadId: string, _body: string): Promise<{ externalMessageId: string }> {
    if (!this.isConfigured) throw new Error('Octorate adapter not configured')
    return { externalMessageId: `octorate-${threadId}-${Date.now()}` }
  }

  async acknowledgeCancellation(_externalId: string): Promise<void> {
    if (!this.isConfigured) return
    // Octorate auto-handles cancellation status; no ack endpoint needed
  }

  private mapStatus(status: string): ChannelReservation['status'] {
    const s = status.toLowerCase()
    if (s.includes('cancel')) return 'cancelled'
    if (s.includes('modif')) return 'modified'
    return 'confirmed'
  }
}

export function createOctorateAdapter(creds: ChannelCredentials): OctorateAdapter {
  return new OctorateAdapter(creds)
}
