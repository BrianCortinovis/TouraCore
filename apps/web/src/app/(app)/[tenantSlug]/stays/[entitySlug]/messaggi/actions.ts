'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { z } from 'zod'

async function assertOwnsTenant(tenantSlug: string): Promise<{ tenantId: string }> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const supabase = await createServerSupabaseClient()
  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) throw new Error('Tenant not found')

  const admin = await createServiceRoleClient()
  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (pa) return { tenantId: tenant.id as string }

  const { data: m } = await admin.from('memberships').select('id').eq('user_id', user.id).eq('tenant_id', tenant.id).eq('is_active', true).maybeSingle()
  if (!m) throw new Error('Forbidden')
  return { tenantId: tenant.id as string }
}

async function assertThreadInTenant(threadId: string, tenantId: string): Promise<{ entityId: string }> {
  const admin = await createServiceRoleClient()
  const { data: thread } = await admin
    .from('message_threads')
    .select('id, entity_id, entities!inner(tenant_id)')
    .eq('id', threadId)
    .eq('entities.tenant_id', tenantId)
    .maybeSingle()
  if (!thread) throw new Error('Thread not in tenant')
  return { entityId: thread.entity_id as string }
}

const ReplySchema = z.object({
  threadId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  body: z.string().min(1).max(4000),
})

export async function replyToThread(input: z.infer<typeof ReplySchema>): Promise<{ success: boolean; error?: string }> {
  const parsed = ReplySchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  let tenantId: string
  try {
    const ctx = await assertOwnsTenant(parsed.data.tenantSlug)
    tenantId = ctx.tenantId
    await assertThreadInTenant(parsed.data.threadId, tenantId)
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }

  const admin = await createServiceRoleClient()
  const { data: thread } = await admin
    .from('message_threads')
    .select('entity_id, channel, external_thread_id, guest_id')
    .eq('id', parsed.data.threadId)
    .maybeSingle()
  if (!thread) return { success: false, error: 'Thread not found' }

  // Insert message inbound
  await admin.from('thread_messages').insert({
    thread_id: parsed.data.threadId,
    direction: 'outbound',
    sender_user_id: user.id,
    body: parsed.data.body,
    sent_at: new Date().toISOString(),
  })

  // Update thread last_message_at + unread reset
  await admin
    .from('message_threads')
    .update({ last_message_at: new Date().toISOString(), unread_count: 0, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.threadId)

  // TODO: dispatch via channel adapter (email/whatsapp/etc) quando configurato
  revalidatePath(`/${parsed.data.tenantSlug}/stays/${parsed.data.entitySlug}/messaggi`)
  return { success: true }
}

export async function markThreadRead(threadId: string, tenantSlug: string, entitySlug: string): Promise<void> {
  const { tenantId } = await assertOwnsTenant(tenantSlug)
  await assertThreadInTenant(threadId, tenantId)

  const admin = await createServiceRoleClient()
  await admin.from('message_threads').update({ unread_count: 0 }).eq('id', threadId)
  await admin.from('thread_messages').update({ read_at: new Date().toISOString() }).eq('thread_id', threadId).is('read_at', null)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/messaggi`)
}

const NewThreadSchema = z.object({
  entitySlug: z.string(),
  tenantSlug: z.string(),
  channel: z.enum(['email','sms','whatsapp','widget']),
  recipient: z.string().min(1),
  subject: z.string().optional(),
  body: z.string().min(1),
  reservationId: z.string().uuid().optional(),
  guestId: z.string().uuid().optional(),
})

export async function createThreadAndSend(input: z.infer<typeof NewThreadSchema>): Promise<{ success: boolean; threadId?: string; error?: string }> {
  const parsed = NewThreadSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  let tenantId: string
  try {
    const ctx = await assertOwnsTenant(parsed.data.tenantSlug)
    tenantId = ctx.tenantId
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }

  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id')
    .eq('slug', parsed.data.entitySlug)
    .eq('tenant_id', tenantId)
    .single()
  if (!entity) return { success: false, error: 'Entity not found' }

  const admin = await createServiceRoleClient()
  const { data: thread, error } = await admin
    .from('message_threads')
    .insert({
      entity_id: entity.id,
      guest_id: parsed.data.guestId ?? null,
      reservation_id: parsed.data.reservationId ?? null,
      channel: parsed.data.channel,
      subject: parsed.data.subject ?? null,
      last_message_at: new Date().toISOString(),
      status: 'open',
    })
    .select('id')
    .single()
  if (error || !thread) return { success: false, error: error?.message ?? 'Create error' }

  await admin.from('thread_messages').insert({
    thread_id: thread.id,
    direction: 'outbound',
    sender_user_id: user.id,
    body: parsed.data.body,
  })

  // Queue email tramite message_queue se channel email
  if (parsed.data.channel === 'email') {
    await admin.from('message_queue').insert({
      entity_id: entity.id,
      reservation_id: parsed.data.reservationId ?? null,
      guest_id: parsed.data.guestId ?? null,
      channel: 'email',
      recipient: parsed.data.recipient,
      subject: parsed.data.subject ?? '(no subject)',
      body: parsed.data.body,
      status: 'pending',
    })
  }

  revalidatePath(`/${parsed.data.tenantSlug}/stays/${parsed.data.entitySlug}/messaggi`)
  return { success: true, threadId: thread.id as string }
}
