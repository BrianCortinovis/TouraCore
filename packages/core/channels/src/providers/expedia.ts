import type {
  ChannelAdapter,
  ChannelAvailability,
  ChannelCredentials,
  ChannelMessage,
  ChannelRate,
  ChannelReservation,
  SyncResult,
} from '../types'

export class ExpediaAdapter implements ChannelAdapter {
  readonly provider = 'expedia' as const

  constructor(private readonly creds: ChannelCredentials) {}

  get isConfigured(): boolean {
    return Boolean(this.creds.clientId && this.creds.clientSecret)
  }

  async pullReservations(_since?: Date): Promise<ChannelReservation[]> {
    return []
  }
  async pushAvailability(updates: ChannelAvailability[]): Promise<SyncResult> {
    return this.isConfigured
      ? { success: true, imported: 0, updated: updates.length, skipped: 0, errors: [] }
      : { success: false, imported: 0, updated: 0, skipped: updates.length, errors: ['Expedia not configured'] }
  }
  async pushRates(updates: ChannelRate[]): Promise<SyncResult> {
    return this.pushAvailability(updates as unknown as ChannelAvailability[])
  }
  async pullMessages(): Promise<ChannelMessage[]> {
    return []
  }
  async sendMessage(threadId: string, _body: string): Promise<{ externalMessageId: string }> {
    if (!this.isConfigured) throw new Error('Expedia not configured')
    return { externalMessageId: `stub-${threadId}-${Date.now()}` }
  }
  async acknowledgeCancellation(): Promise<void> {}
}

export function createExpediaAdapter(creds: ChannelCredentials): ExpediaAdapter {
  return new ExpediaAdapter(creds)
}
