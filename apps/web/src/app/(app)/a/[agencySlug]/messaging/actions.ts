'use server'

import { revalidatePath } from 'next/cache'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { saveProvider, deleteProvider, type ProviderKey } from '@touracore/notifications'
import { logAgencyAction } from '@touracore/audit'

export async function saveAgencyProviderAction(input: {
  agencyId: string
  agencySlug: string
  provider: ProviderKey
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'slack'
  config: Record<string, unknown>
  fromEmail?: string | null
  fromName?: string | null
  fromPhone?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!ctx.isPlatformAdmin && ctx.agencyId !== input.agencyId) return { ok: false, error: 'forbidden' }
  if (!hasPermission(ctx, 'billing.write') && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  const r = await saveProvider({
    scope: 'agency',
    scopeId: input.agencyId,
    provider: input.provider,
    channel: input.channel,
    config: input.config,
    fromEmail: input.fromEmail,
    fromName: input.fromName,
    fromPhone: input.fromPhone,
  })
  if (r.ok) {
    await logAgencyAction({
      action: 'notifications.agency_provider_saved',
      actorUserId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.isPlatformAdmin ? 'platform_admin' : ctx.agencyRole ?? 'agency_member',
      agencyId: input.agencyId,
      metadata: { provider: input.provider, channel: input.channel },
    })
    revalidatePath(`/a/${input.agencySlug}/messaging`)
  }
  return r
}

export async function deleteAgencyProviderAction(id: string, agencySlug: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'billing.write') && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }
  const r = await deleteProvider(id)
  if (r.ok) {
    revalidatePath(`/a/${agencySlug}/messaging`)
  }
  return r
}
