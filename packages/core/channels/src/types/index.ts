export type ChannelProvider = 'booking' | 'airbnb' | 'expedia' | 'tripadvisor' | 'google' | 'other'

export interface ChannelCredentials {
  provider: ChannelProvider
  clientId?: string
  clientSecret?: string
  apiKey?: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: string
  accountId?: string
  [key: string]: unknown
}

export interface ChannelReservation {
  externalId: string
  externalConfirmationCode?: string
  roomTypeExternalId?: string
  roomExternalId?: string
  status: 'confirmed' | 'cancelled' | 'modified'
  checkIn: string
  checkOut: string
  guestName: string
  guestEmail?: string
  guestPhone?: string
  guestCountry?: string
  adults: number
  children: number
  totalAmount: number
  currency: string
  paymentType?: 'ota_collect' | 'property_collect' | 'virtual_card'
  notes?: string
  raw: Record<string, unknown>
}

export interface ChannelAvailability {
  roomTypeExternalId: string
  date: string
  availableCount: number
  stopSell?: boolean
  closedToArrival?: boolean
  closedToDeparture?: boolean
  minStay?: number
  maxStay?: number
}

export interface ChannelRate {
  roomTypeExternalId: string
  ratePlanExternalId: string
  date: string
  price: number
  currency: string
  occupancyLevel?: number
}

export interface ChannelMessage {
  externalThreadId: string
  externalMessageId: string
  fromName: string
  fromIdentifier?: string
  body: string
  sentAt: string
  attachments?: Array<{ url: string; filename: string }>
}

export interface SyncResult {
  success: boolean
  imported: number
  updated: number
  skipped: number
  errors: string[]
}

export interface ChannelAdapter {
  readonly provider: ChannelProvider
  readonly isConfigured: boolean
  pullReservations(since?: Date): Promise<ChannelReservation[]>
  pushAvailability(updates: ChannelAvailability[]): Promise<SyncResult>
  pushRates(updates: ChannelRate[]): Promise<SyncResult>
  pullMessages(since?: Date): Promise<ChannelMessage[]>
  sendMessage(threadId: string, body: string): Promise<{ externalMessageId: string }>
  acknowledgeCancellation(externalId: string): Promise<void>
}
