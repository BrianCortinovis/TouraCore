'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'

export async function updatePlatformConfigAction(input: {
  plans: Record<string, { price: number; max_tenants: number }>
  commissionTiers: Record<string, Array<{ threshold: number; rate: number }>>
  platformFeeRate: number
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('platform_config')
    .update({
      plans: input.plans,
      commission_tiers: input.commissionTiers,
      platform_fee_rate: input.platformFeeRate,
      updated_at: new Date().toISOString(),
      updated_by: ctx.user!.id,
    })
    .eq('id', 1)
  if (error) return { ok: false, error: error.message }

  await logAgencyAction({
    action: 'platform.config_updated',
    actorUserId: ctx.user!.id,
    actorEmail: ctx.user!.email,
    actorRole: 'platform_admin',
    metadata: { fee: input.platformFeeRate, plans_count: Object.keys(input.plans).length },
  })

  revalidatePath('/platform/config')
  return { ok: true }
}
