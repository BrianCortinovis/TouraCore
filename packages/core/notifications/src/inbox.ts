import { createServiceRoleClient } from '@touracore/db/server'

export interface InboxEntry {
  id: string
  scope: 'platform' | 'agency' | 'tenant'
  category: string
  title: string
  body: string
  action_url: string | null
  read_at: string | null
  archived_at: string | null
  created_at: string
}

export async function createInboxEntry(input: {
  userId: string
  tenantId?: string | null
  agencyId?: string | null
  scope: 'platform' | 'agency' | 'tenant'
  category: string
  title: string
  body: string
  actionUrl?: string | null
  metadata?: Record<string, unknown>
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServiceRoleClient()
  const { data, error } = await supabase
    .from('notifications_inbox')
    .insert({
      user_id: input.userId,
      tenant_id: input.tenantId ?? null,
      agency_id: input.agencyId ?? null,
      scope: input.scope,
      category: input.category,
      title: input.title,
      body: input.body,
      action_url: input.actionUrl ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createServiceRoleClient()
  const { count } = await supabase
    .from('notifications_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
    .is('archived_at', null)
  return count ?? 0
}

export async function listInbox(userId: string, limit = 50): Promise<InboxEntry[]> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('notifications_inbox')
    .select('id, scope, category, title, body, action_url, read_at, archived_at, created_at')
    .eq('user_id', userId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as InboxEntry[]
}

export async function markAsRead(id: string, userId: string): Promise<void> {
  const supabase = await createServiceRoleClient()
  await supabase
    .from('notifications_inbox')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
}

export async function markAllAsRead(userId: string): Promise<void> {
  const supabase = await createServiceRoleClient()
  await supabase
    .from('notifications_inbox')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)
}

export async function archiveEntry(id: string, userId: string): Promise<void> {
  const supabase = await createServiceRoleClient()
  await supabase
    .from('notifications_inbox')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
}
