'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type { AutomationTrigger } from '../types/database'
import { sendWhatsAppText, type WhatsAppConfig } from '../stubs/integrations/whatsapp'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateAutomationData {
  name: string
  trigger_event: AutomationTrigger
  channel: 'email' | 'whatsapp'
  template_id?: string | null
  whatsapp_template_name?: string | null
  is_active?: boolean
  conditions?: Record<string, unknown>
}

export interface UpdateAutomationData {
  name?: string
  trigger_event?: AutomationTrigger
  channel?: 'email' | 'whatsapp'
  template_id?: string | null
  whatsapp_template_name?: string | null
  is_active?: boolean
  conditions?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Automations CRUD
// ---------------------------------------------------------------------------

export async function createAutomation(data: CreateAutomationData) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase.from('message_automations').insert({
    entity_id: orgId,
    name: data.name,
    trigger_event: data.trigger_event,
    channel: data.channel,
    template_id: data.template_id || null,
    whatsapp_template_name: data.whatsapp_template_name || null,
    is_active: data.is_active ?? true,
    conditions: data.conditions || {},
  })

  if (error) {
    console.error('[Messaging] Errore creazione automazione:', error)
    throw new Error('Impossibile creare l\'automazione')
  }

  revalidatePath('/communications/automations')
}

export async function updateAutomation(id: string, data: UpdateAutomationData) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('message_automations')
    .update(data)
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Messaging] Errore aggiornamento automazione:', error)
    throw new Error('Impossibile aggiornare l\'automazione')
  }

  revalidatePath('/communications/automations')
}

export async function toggleAutomation(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  // Fetch current state
  const { data: current } = await supabase
    .from('message_automations')
    .select('is_active')
    .eq('id', id)
    .eq('entity_id', orgId)
    .single()

  if (!current) throw new Error('Automazione non trovata')

  const { error } = await supabase
    .from('message_automations')
    .update({ is_active: !current.is_active })
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Messaging] Errore toggle automazione:', error)
    throw new Error('Impossibile modificare lo stato')
  }

  revalidatePath('/communications/automations')
}

export async function deleteAutomation(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('message_automations')
    .delete()
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Messaging] Errore eliminazione automazione:', error)
    throw new Error('Impossibile eliminare l\'automazione')
  }

  revalidatePath('/communications/automations')
}

// ---------------------------------------------------------------------------
// WhatsApp Messaging
// ---------------------------------------------------------------------------

export async function sendWhatsAppMessage(conversationId: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organizzazione non trovata')

  // Get conversation with org info to resolve WhatsApp config
  const { data: conversation } = await supabase
    .from('whatsapp_conversations')
    .select('id, phone, entity_id')
    .eq('id', conversationId)
    .eq('entity_id', orgId)
    .single()

  if (!conversation) throw new Error('Conversazione non trovata')

  // Insert message record
  const { data: message, error } = await supabase.from('whatsapp_messages').insert({
    conversation_id: conversationId,
    direction: 'outbound',
    content,
    status: 'pending',
  }).select('id').single()

  if (error) {
    console.error('[WhatsApp] Errore invio messaggio:', error)
    throw new Error('Impossibile inviare il messaggio')
  }

  // Update conversation last_message_at
  await supabase
    .from('whatsapp_conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('entity_id', orgId)

  // Resolve WhatsApp config from organization settings (separate columns)
  const { data: org } = await supabase
    .from('organizations')
    .select('whatsapp_phone, whatsapp_provider, whatsapp_api_key, whatsapp_enabled')
    .eq('id', conversation.entity_id)
    .single()

  const hasWhatsApp = org?.whatsapp_enabled && org?.whatsapp_api_key
  const waConfig: WhatsAppConfig | null = hasWhatsApp ? {
    provider: (org.whatsapp_provider as WhatsAppConfig['provider']) ?? 'twilio',
    phone: org.whatsapp_phone ?? '',
    apiKey: org.whatsapp_api_key ?? '',
  } : null

  if (waConfig) {
    // Send via actual WhatsApp API
    const result = await sendWhatsAppText(waConfig, {
      to: conversation.phone,
      body: content,
    })

    await supabase
      .from('whatsapp_messages')
      .update({
        status: result.success ? 'sent' : 'failed',
        external_id: result.messageId ?? null,
      })
      .eq('id', message.id)
  } else {
    // No config: mark as sent (dev mode / mock)
    console.log(`[WhatsApp] Dev mode: messaggio a ${conversation.phone}: ${content}`)
    await supabase
      .from('whatsapp_messages')
      .update({ status: 'sent' })
      .eq('id', message.id)
  }

  revalidatePath('/communications/inbox')
}

export async function createConversation(data: {
  phone: string
  guest_name?: string
  guest_id?: string
  reservation_id?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  // Check if conversation already exists
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id')
    .eq('entity_id', orgId)
    .eq('phone', data.phone)
    .eq('status', 'active')
    .single()

  if (existing) return existing.id

  const { data: conv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      entity_id: orgId,
      phone: data.phone,
      guest_name: data.guest_name || null,
      guest_id: data.guest_id || null,
      reservation_id: data.reservation_id || null,
      status: 'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[WhatsApp] Errore creazione conversazione:', error)
    throw new Error('Impossibile creare la conversazione')
  }

  revalidatePath('/communications/inbox')
  return conv.id
}

export async function archiveConversation(conversationId: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({ status: 'archived' })
    .eq('id', conversationId)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[WhatsApp] Errore archiviazione:', error)
    throw new Error('Impossibile archiviare la conversazione')
  }

  revalidatePath('/communications/inbox')
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) throw new Error('Organizzazione non trovata')

  await supabase
    .from('whatsapp_conversations')
    .update({ unread_count: 0 })
    .eq('id', conversationId)
    .eq('entity_id', orgId)
}
