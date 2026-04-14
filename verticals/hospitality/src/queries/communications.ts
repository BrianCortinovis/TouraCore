import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { MessageTemplate, MessageChannel, MessageStatus } from '../types/database'

// --- Message Templates ---

export async function getMessageTemplates() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('message_templates')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .order('trigger', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data as MessageTemplate[]
}

// --- Sent Messages ---

interface SentMessageFilters {
  channel?: MessageChannel
  status?: MessageStatus
  reservationId?: string
  guestId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

interface SentMessage {
  id: string
  entity_id: string
  template_id: string | null
  reservation_id: string | null
  guest_id: string | null
  channel: MessageChannel
  recipient: string
  subject: string | null
  body: string | null
  status: MessageStatus
  sent_at: string | null
  opened_at: string | null
  error_message: string | null
  created_at: string
}

export async function getCommunicationsSentMessages(filters: SentMessageFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const {
    channel,
    status,
    reservationId,
    guestId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 25,
  } = filters

  let query = supabase
    .from('sent_messages' as 'message_templates')
    .select('*', { count: 'exact' })

  if (propId) {
    query = query.eq('entity_id' as 'id', propId)
  }

  if (channel) {
    query = query.eq('channel' as 'name', channel)
  }

  if (status) {
    query = query.eq('status' as 'name', status)
  }

  if (reservationId) {
    query = query.eq('reservation_id' as 'id', reservationId)
  }

  if (guestId) {
    query = query.eq('guest_id' as 'id', guestId)
  }

  if (dateFrom) {
    query = query.gte('sent_at' as 'name', dateFrom)
  }

  if (dateTo) {
    query = query.lte('sent_at' as 'name', dateTo)
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('sent_at' as 'name', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    messages: data as unknown as SentMessage[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

// --- Channel Connections ---

interface ChannelConnection {
  id: string
  entity_id: string
  channel_name: string
  external_entity_id: string | null
  is_active: boolean
  credentials: Record<string, unknown> | null
  last_sync_at: string | null
  sync_errors: string | null
  created_at: string
  updated_at: string
}

export async function getChannelConnections() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  const { data, error } = await supabase
    .from('channel_connections')
    .select('*')
    .eq('entity_id', propId ?? '')
    .order('channel_name', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as ChannelConnection[]
}
