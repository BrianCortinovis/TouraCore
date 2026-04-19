'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission, canAccessTenant } from '@touracore/auth/visibility'

async function getAgencyId(agencySlug: string): Promise<string | null> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('agencies').select('id').eq('slug', agencySlug).maybeSingle()
  return data?.id ?? null
}

export async function addNoteAction(input: { agencySlug: string; tenantId: string; body: string }): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.read')) return { ok: false, error: 'forbidden' }
  if (!canAccessTenant(ctx, input.tenantId)) return { ok: false, error: 'forbidden' }

  const agencyId = await getAgencyId(input.agencySlug)
  if (!agencyId) return { ok: false, error: 'agency_not_found' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('agency_client_notes').insert({
    agency_id: agencyId,
    tenant_id: input.tenantId,
    author_user_id: ctx.user.id,
    body: input.body.trim(),
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/a/${input.agencySlug}/clients/${input.tenantId}`)
  return { ok: true }
}

export async function pinNoteAction(formData: FormData): Promise<void> {
  const agencySlug = String(formData.get('agencySlug') ?? '')
  const noteId = String(formData.get('noteId') ?? '')
  const pinned = String(formData.get('pinned') ?? 'false') === 'true'

  const ctx = await getVisibilityContext()
  if (!ctx.user) return
  const agencyId = await getAgencyId(agencySlug)
  if (!agencyId) return

  const supabase = await createServiceRoleClient()
  await supabase
    .from('agency_client_notes')
    .update({ pinned })
    .eq('id', noteId)
    .eq('agency_id', agencyId)

  const { data: note } = await supabase.from('agency_client_notes').select('tenant_id').eq('id', noteId).maybeSingle()
  if (note?.tenant_id) revalidatePath(`/a/${agencySlug}/clients/${note.tenant_id}`)
}

export async function addTaskAction(input: {
  agencySlug: string
  tenantId: string
  title: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  dueDate: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }
  if (!canAccessTenant(ctx, input.tenantId)) return { ok: false, error: 'forbidden' }

  const agencyId = await getAgencyId(input.agencySlug)
  if (!agencyId) return { ok: false, error: 'agency_not_found' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('agency_client_tasks').insert({
    agency_id: agencyId,
    tenant_id: input.tenantId,
    title: input.title.trim(),
    priority: input.priority,
    due_date: input.dueDate,
    status: 'open',
    created_by: ctx.user.id,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/a/${input.agencySlug}/clients/${input.tenantId}`)
  return { ok: true }
}

export async function toggleTaskStatusAction(formData: FormData): Promise<void> {
  const agencySlug = String(formData.get('agencySlug') ?? '')
  const taskId = String(formData.get('taskId') ?? '')
  const nextStatus = String(formData.get('nextStatus') ?? 'done') as 'open' | 'done'

  const ctx = await getVisibilityContext()
  if (!ctx.user) return
  const agencyId = await getAgencyId(agencySlug)
  if (!agencyId) return

  const supabase = await createServiceRoleClient()
  await supabase
    .from('agency_client_tasks')
    .update({
      status: nextStatus,
      completed_at: nextStatus === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)
    .eq('agency_id', agencyId)

  const { data: task } = await supabase.from('agency_client_tasks').select('tenant_id').eq('id', taskId).maybeSingle()
  if (task?.tenant_id) revalidatePath(`/a/${agencySlug}/clients/${task.tenant_id}`)
}
