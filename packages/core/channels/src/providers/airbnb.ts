import type {
  ChannelAdapter,
  ChannelAvailability,
  ChannelCredentials,
  ChannelMessage,
  ChannelRate,
  ChannelReservation,
  SyncResult,
} from '../types'

const AIRBNB_API_BASE = 'https://api.airbnb.com/v2'

export class AirbnbAdapter implements ChannelAdapter {
  readonly provider = 'airbnb' as const

  constructor(private readonly creds: ChannelCredentials) {}

  get isConfigured(): boolean {
    return Boolean(this.creds.accessToken)
  }

  async pullReservations(_since?: Date): Promise<ChannelReservation[]> {
    if (!this.isConfigured) return []
    return []
  }

  async pushAvailability(updates: ChannelAvailability[]): Promise<SyncResult> {
    if (!this.isConfigured) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Airbnb adapter not configured'] }
    }
    return { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
  }

  async pushRates(updates: ChannelRate[]): Promise<SyncResult> {
    if (!this.isConfigured) {
      return { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Airbnb adapter not configured'] }
    }
    return { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
  }

  async pullMessages(_since?: Date): Promise<ChannelMessage[]> {
    if (!this.isConfigured) return []
    return []
  }

  async sendMessage(threadId: string, _body: string): Promise<{ externalMessageId: string }> {
    if (!this.isConfigured) throw new Error('Airbnb adapter not configured')
    return { externalMessageId: `stub-${threadId}-${Date.now()}` }
  }

  async acknowledgeCancellation(_externalId: string): Promise<void> {}
}

export function createAirbnbAdapter(creds: ChannelCredentials): AirbnbAdapter {
  return new AirbnbAdapter(creds)
}

export const AIRBNB_ENDPOINT = AIRBNB_API_BASE
