'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

const triggerEnum = z.enum([
  'booking_confirmed', 'booking_cancelled', 'pre_arrival',
  'check_in', 'check_out', 'post_stay', 'birthday',
  'manual', 'quote_sent', 'payment_reminder',
])

const channelEnum = z.enum(['email', 'whatsapp', 'sms'])

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  trigger: triggerEnum,
  channel: channelEnum,
  subject: z.string().max(500).nullish(),
  body_html: z.string().max(50000).nullish(),
  body_text: z.string().max(10000).nullish(),
  variables: z.array(z.string().max(50)).max(30).default([]),
  send_days_offset: z.number().int().min(-30).max(365).default(0),
  is_active: z.boolean().default(true),
})

export type TemplateData = z.infer<typeof templateSchema>

export async function loadTemplatesAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('entity_id', property.id)
      .order('trigger')
      .order('name')

    if (error) return { success: false, error: error.message }
    return { success: true, data: { templates: data ?? [] } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function createTemplateAction(raw: TemplateData): Promise<ActionResult> {
  const parsed = templateSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }

  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('message_templates')
      .insert({
        entity_id: property.id,
        name: parsed.data.name,
        trigger: parsed.data.trigger,
        channel: parsed.data.channel,
        subject: parsed.data.subject ?? null,
        body_html: parsed.data.body_html ?? null,
        body_text: parsed.data.body_text ?? null,
        variables: parsed.data.variables,
        send_days_offset: parsed.data.send_days_offset,
        is_active: parsed.data.is_active,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/communications')
    return { success: true, data: { template: data } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateTemplateAction(id: string, raw: Partial<TemplateData>): Promise<ActionResult> {
  if (!id) return { success: false, error: 'ID mancante' }

  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('message_templates')
      .update({ ...raw, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('entity_id', property.id)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/communications')
    return { success: true, data: { template: data } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteTemplateAction(id: string): Promise<ActionResult> {
  if (!id) return { success: false, error: 'ID mancante' }

  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { error } = await supabase
      .from('message_templates')
      .delete()
      .eq('id', id)
      .eq('entity_id', property.id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/communications')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function toggleTemplateAction(id: string, isActive: boolean): Promise<ActionResult> {
  return updateTemplateAction(id, { is_active: isActive })
}

export async function loadSentMessagesAction(filters?: {
  status?: string
  channel?: string
  page?: number
  limit?: number
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()
    const page = filters?.page ?? 1
    const limit = filters?.limit ?? 25

    let query = supabase
      .from('sent_messages')
      .select('*', { count: 'exact' })
      .eq('entity_id', property.id)

    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.channel) query = query.eq('channel', filters.channel)

    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return { success: false, error: error.message }
    return {
      success: true,
      data: {
        messages: data ?? [],
        total: count ?? 0,
        page,
        limit,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
