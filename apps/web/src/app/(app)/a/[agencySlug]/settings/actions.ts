'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'

export async function updateBrandingAction(input: {
  agencySlug: string
  color: string
  logoUrl: string
  domain: string
  legalName: string
  billingEmail: string
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  const allowed = ctx.isPlatformAdmin || ctx.agencyRole === 'agency_owner' || ctx.agencyRole === 'agency_admin'
  if (!allowed) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase.from('agencies').select('id').eq('slug', input.agencySlug).maybeSingle()
  if (!agency) return { ok: false, error: 'not_found' }
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  const { error } = await supabase
    .from('agencies')
    .update({
      branding: { color: input.color, logo_url: input.logoUrl || null },
      white_label_domain: input.domain || null,
      legal_name: input.legalName || null,
      billing_email: input.billingEmail || null,
    })
    .eq('id', agency.id)
  if (error) return { ok: false, error: error.message }

  await logAgencyAction({
    action: 'agency.branding_updated',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole ?? 'platform_admin',
    agencyId: agency.id,
    metadata: { color: input.color, domain: input.domain || null },
  })

  revalidatePath(`/a/${input.agencySlug}/settings`)
  return { ok: true }
}
