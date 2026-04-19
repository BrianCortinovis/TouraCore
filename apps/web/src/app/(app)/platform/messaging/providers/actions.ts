'use server'

import { revalidatePath } from 'next/cache'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { saveProvider, deleteProvider, type ProviderKey, type ProviderScope } from '@touracore/notifications'
import { logAgencyAction } from '@touracore/audit'

export async function saveProviderAction(input: {
  scope: ProviderScope
  scopeId: string | null
  provider: ProviderKey
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'slack'
  config: Record<string, unknown>
  fromEmail?: string | null
  fromName?: string | null
  fromPhone?: string | null
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getVisibilityContext()
  if (input.scope === 'platform' && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }
  if (input.scope === 'agency' && !ctx.isPlatformAdmin && input.scopeId !== ctx.agencyId) return { ok: false, error: 'forbidden' }

  const result = await saveProvider(input)
  if (result.ok) {
    await logAgencyAction({
      action: 'notifications.provider_saved',
      actorUserId: ctx.user?.id,
      actorEmail: ctx.user?.email,
      actorRole: ctx.isPlatformAdmin ? 'platform_admin' : ctx.agencyRole ?? 'tenant',
      agencyId: input.scope === 'agency' ? input.scopeId : null,
      tenantId: input.scope === 'tenant' ? input.scopeId : null,
      metadata: { provider: input.provider, channel: input.channel },
    })
    revalidatePath('/platform/messaging/providers')
  }
  return result
}

export async function deleteProviderAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }
  const r = await deleteProvider(id)
  if (r.ok) {
    await logAgencyAction({
      action: 'notifications.provider_deleted',
      actorUserId: ctx.user?.id,
      actorEmail: ctx.user?.email,
      actorRole: 'platform_admin',
      targetType: 'provider',
      targetId: id,
    })
    revalidatePath('/platform/messaging/providers')
  }
  return r
}
