import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type {
  MessageAutomation,
  WhatsAppConversation,
  WhatsAppMessage,
  MessageTemplate,
} from '../types/database'

// ---------------------------------------------------------------------------
// Automations
// ---------------------------------------------------------------------------

export async function getAutomations() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  const { data, error } = await supabase
    .from('message_automations')
    .select('*, template:message_templates(*)')
    .eq('entity_id', propId)
    .order('trigger_event')

  if (error) {
    console.error('[Messaging] Errore caricamento automazioni:', error)
    return []
  }

  return (data ?? []) as (MessageAutomation & { template: MessageTemplate | null })[]
}

export async function getAutomationById(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return null

  const { data, error } = await supabase
    .from('message_automations')
    .select('*, template:message_templates(*)')
    .eq('id', id)
    .eq('entity_id', propId)
    .single()

  if (error) return null
  return data as MessageAutomation & { template: MessageTemplate | null }
}

// ---------------------------------------------------------------------------
// WhatsApp Conversations
// ---------------------------------------------------------------------------

export async function getConversations() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .select('*, guest:guests(*), reservation:reservations(*)')
    .eq('entity_id', propId)
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[Messaging] Errore caricamento conversazioni:', error)
    return []
  }

  return (data ?? []) as WhatsAppConversation[]
}

export async function getConversationMessages(conversationId: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('entity_id', propId)
    .maybeSingle()

  if (!conversation) return []

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true })

  if (error) {
    console.error('[Messaging] Errore caricamento messaggi:', error)
    return []
  }

  return (data ?? []) as WhatsAppMessage[]
}

// ---------------------------------------------------------------------------
// Sent Messages
// ---------------------------------------------------------------------------

export async function getSentMessages(filters: { channel?: string; limit?: number } = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  let query = supabase
    .from('sent_messages')
    .select('*')
    .eq('entity_id', propId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.channel) {
    query = query.eq('channel', filters.channel)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Messaging] Errore caricamento messaggi inviati:', error)
    return []
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// Automation trigger labels
// ---------------------------------------------------------------------------

export const TRIGGER_EVENT_LABELS: Record<string, string> = {
  booking_confirmed: 'Prenotazione confermata',
  pre_arrival_7d: '7 giorni prima dell\'arrivo',
  pre_arrival_3d: '3 giorni prima dell\'arrivo',
  pre_arrival_1d: '1 giorno prima dell\'arrivo',
  checkin_day: 'Giorno del check-in',
  during_stay_1d: '1 giorno durante il soggiorno',
  checkout_day: 'Giorno del check-out',
  post_checkout_1d: '1 giorno dopo il check-out',
  post_checkout_3d: '3 giorni dopo il check-out',
  post_checkout_7d: '7 giorni dopo il check-out',
}
