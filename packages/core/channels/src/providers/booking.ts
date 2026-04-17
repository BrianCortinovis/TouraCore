import type {
  ChannelAdapter,
  ChannelAvailability,
  ChannelCredentials,
  ChannelMessage,
  ChannelRate,
  ChannelReservation,
  SyncResult,
} from '../types'

const BOOKING_API_BASE = 'https://supply-xml.booking.com/hotels'

export class BookingComAdapter implements ChannelAdapter {
  readonly provider = 'booking' as const

  constructor(private readonly creds: ChannelCredentials) {}

  get isConfigured(): boolean {
    return Boolean(this.creds.apiKey && this.creds.accountId)
  }

  async pullReservations(_since?: Date): Promise<ChannelReservation[]> {
    if (!this.isConfigured) return []
    return []
  }

  async pushAvailability(updates: ChannelAvailability[]): Promise<SyncResult> {
    if (!this.isConfigured) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Booking.com adapter not configured'] }
    }
    return { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
  }

  async pushRates(updates: ChannelRate[]): Promise<SyncResult> {
    if (!this.isConfigured) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Booking.com adapter not configured'] }
    }
    return { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
  }

  async pullMessages(_since?: Date): Promise<ChannelMessage[]> {
    if (!this.isConfigured) return []
    return []
  }

  async sendMessage(threadId: string, _body: string): Promise<{ externalMessageId: string }> {
    if (!this.isConfigured) throw new Error('Booking.com adapter not configured')
    return { externalMessageId: `stub-${threadId}-${Date.now()}` }
  }

  async acknowledgeCancellation(_externalId: string): Promise<void> {
    if (!this.isConfigured) return
  }
}

export function createBookingAdapter(creds: ChannelCredentials): BookingComAdapter {
  return new BookingComAdapter(creds)
}

export const BOOKING_COM_ENDPOINT = BOOKING_API_BASE
