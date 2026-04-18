'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'

export async function suspendAgencyAction(agencyId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('agencies').update({ is_active: false }).eq('id', agencyId)
  if (error) return { ok: false, error: error.message }
  await logAgencyAction({
    action: 'platform.agency_suspended',
    actorUserId: ctx.user!.id,
    actorEmail: ctx.user!.email,
    actorRole: 'platform_admin',
    agencyId,
  })
  revalidatePath(`/platform/agencies/${agencyId}`)
  revalidatePath('/platform/agencies')
  return { ok: true }
}

export async function reactivateAgencyAction(agencyId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('agencies').update({ is_active: true }).eq('id', agencyId)
  if (error) return { ok: false, error: error.message }
  await logAgencyAction({
    action: 'platform.agency_reactivated',
    actorUserId: ctx.user!.id,
    actorEmail: ctx.user!.email,
    actorRole: 'platform_admin',
    agencyId,
  })
  revalidatePath(`/platform/agencies/${agencyId}`)
  revalidatePath('/platform/agencies')
  return { ok: true }
}
