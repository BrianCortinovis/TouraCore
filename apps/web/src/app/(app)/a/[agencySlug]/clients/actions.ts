'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'

export async function linkTenantToAgencyAction(input: {
  agencySlug: string
  tenantSlug: string
  billingMode: 'client_direct' | 'agency_covered'
  managementMode: 'agency_managed' | 'self_service'
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, max_tenants')
    .eq('slug', input.agencySlug)
    .maybeSingle()
  if (!agency) return { ok: false, error: 'agency_not_found' }
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', input.tenantSlug)
    .maybeSingle()
  if (!tenant) return { ok: false, error: 'tenant_not_found' }

  const { count } = await supabase
    .from('agency_tenant_links')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('status', 'active')

  if (agency.max_tenants && (count ?? 0) >= agency.max_tenants) {
    return { ok: false, error: 'plan_limit_reached' }
  }

  const { data: existing } = await supabase
    .from('agency_tenant_links')
    .select('id, status')
    .eq('agency_id', agency.id)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'active') return { ok: false, error: 'already_linked' }
    await supabase
      .from('agency_tenant_links')
      .update({
        status: 'active',
        billing_mode: input.billingMode,
        default_management_mode: input.managementMode,
        revoked_at: null,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    const { error } = await supabase.from('agency_tenant_links').insert({
      agency_id: agency.id,
      tenant_id: tenant.id,
      billing_mode: input.billingMode,
      default_management_mode: input.managementMode,
      status: 'active',
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    })
    if (error) return { ok: false, error: error.message }
  }

  await logAgencyAction({
    action: 'tenant.linked',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.isPlatformAdmin ? 'platform_admin' : (ctx.agencyRole ?? 'agency_member'),
    agencyId: agency.id,
    tenantId: tenant.id,
    metadata: { billing_mode: input.billingMode, management_mode: input.managementMode },
  })

  revalidatePath(`/a/${input.agencySlug}/clients`)
  return { ok: true }
}

export async function unlinkTenantAction(input: {
  agencySlug: string
  linkId: string
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: link } = await supabase
    .from('agency_tenant_links')
    .select('id, agency_id, tenant_id')
    .eq('id', input.linkId)
    .maybeSingle()
  if (!link) return { ok: false, error: 'not_found' }
  if (link.agency_id !== ctx.agencyId && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  const { error } = await supabase
    .from('agency_tenant_links')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', input.linkId)
  if (error) return { ok: false, error: error.message }

  await logAgencyAction({
    action: 'tenant.unlinked',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.isPlatformAdmin ? 'platform_admin' : (ctx.agencyRole ?? 'agency_member'),
    agencyId: link.agency_id,
    tenantId: link.tenant_id,
  })

  revalidatePath(`/a/${input.agencySlug}/clients`)
  return { ok: true }
}
