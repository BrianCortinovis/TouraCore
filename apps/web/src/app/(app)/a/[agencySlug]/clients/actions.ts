'use server'

import { randomBytes } from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'
import { logAgencyAction } from '@touracore/audit'
import { enqueueNotification } from '@touracore/notifications'

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

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export async function createClientInviteAction(input: {
  agencySlug: string
  email: string
  tenantName?: string
  verticalHint?: 'hospitality' | 'restaurant' | 'wellness' | 'experiences' | 'bike_rental' | 'moto_rental' | 'ski_school'
  billingMode?: 'client_direct' | 'agency_covered'
  managementMode?: 'agency_managed' | 'self_service'
}): Promise<{ ok: boolean; error?: string; inviteUrl?: string; token?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, branding, max_tenants')
    .eq('slug', input.agencySlug)
    .maybeSingle()
  if (!agency) return { ok: false, error: 'agency_not_found' }
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  const { count } = await supabase
    .from('agency_tenant_links')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .eq('status', 'active')
  if (agency.max_tenants && (count ?? 0) >= agency.max_tenants) {
    return { ok: false, error: 'plan_limit_reached' }
  }

  const token = generateToken()
  const { data: inv, error } = await supabase
    .from('agency_client_invitations')
    .insert({
      agency_id: agency.id,
      email: input.email.toLowerCase().trim(),
      tenant_name: input.tenantName ?? null,
      vertical_hint: input.verticalHint ?? null,
      billing_mode: input.billingMode ?? 'client_direct',
      management_mode: input.managementMode ?? 'self_service',
      token,
      invited_by: ctx.user.id,
    })
    .select('id')
    .single()
  if (error || !inv) return { ok: false, error: error?.message ?? 'insert_failed' }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://touracore.vercel.app'
  const inviteUrl = `${baseUrl}/register?client_invite=${token}`

  const brand = (agency.branding ?? {}) as { color?: string }
  await enqueueNotification({
    eventKey: 'agency.client.invite_sent',
    templateKey: 'agency.client.invite_sent',
    channel: 'email',
    scope: 'agency',
    agencyId: agency.id,
    recipientEmail: input.email.toLowerCase().trim(),
    variables: {
      agency: { name: agency.name },
      invite: { accept_url: inviteUrl, vertical: input.verticalHint ?? 'attività' },
      brand: { color: brand.color ?? '#4f46e5' },
    },
    idempotencyKey: `agency.client.invite.${inv.id}`,
  })

  await logAgencyAction({
    action: 'client.invite_sent',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.agencyRole ?? 'agency_member',
    agencyId: agency.id,
    targetType: 'client_invitation',
    targetId: inv.id,
    metadata: { email: input.email, vertical: input.verticalHint ?? null },
  })

  revalidatePath(`/a/${input.agencySlug}/clients`)
  return { ok: true, inviteUrl, token }
}

export async function revokeClientInviteAction(
  agencySlug: string,
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()
  const { data: inv } = await supabase
    .from('agency_client_invitations')
    .select('id, agency_id')
    .eq('id', invitationId)
    .maybeSingle()
  if (!inv || (inv.agency_id !== ctx.agencyId && !ctx.isPlatformAdmin)) return { ok: false, error: 'not_found' }

  const { error } = await supabase
    .from('agency_client_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/a/${agencySlug}/clients`)
  return { ok: true }
}

export async function saveEntityBillingAction(input: {
  agencySlug: string
  entityId: string
  billingModel: 'subscription' | 'commission' | 'hybrid' | 'free'
  feeMonthlyEur?: number | null
  commissionPct?: number | null
  commissionCapEur?: number | null
  notes?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getVisibilityContext()
  if (!ctx.user) return { ok: false, error: 'unauthenticated' }
  if (!hasPermission(ctx, 'tenant.write')) return { ok: false, error: 'forbidden' }

  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', input.agencySlug)
    .maybeSingle()
  if (!agency) return { ok: false, error: 'agency_not_found' }
  if (agency.id !== ctx.agencyId && !ctx.isPlatformAdmin) return { ok: false, error: 'forbidden' }

  // Verifica che l'entity appartenga a un tenant linkato a questa agenzia
  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id')
    .eq('id', input.entityId)
    .maybeSingle()
  if (!entity) return { ok: false, error: 'entity_not_found' }

  const { data: link } = await supabase
    .from('agency_tenant_links')
    .select('id')
    .eq('agency_id', agency.id)
    .eq('tenant_id', entity.tenant_id)
    .eq('status', 'active')
    .maybeSingle()
  if (!link) return { ok: false, error: 'tenant_not_linked' }

  const payload = {
    agency_id: agency.id,
    entity_id: input.entityId,
    tenant_id: entity.tenant_id,
    billing_model: input.billingModel,
    fee_monthly_eur: input.feeMonthlyEur ?? null,
    commission_pct: input.commissionPct ?? null,
    commission_cap_eur: input.commissionCapEur ?? null,
    notes: input.notes ?? null,
  }

  const { error } = await supabase
    .from('agency_entity_billing')
    .upsert(payload, { onConflict: 'agency_id,entity_id' })
  if (error) return { ok: false, error: error.message }

  await logAgencyAction({
    action: 'entity.billing_updated',
    actorUserId: ctx.user.id,
    actorEmail: ctx.user.email,
    actorRole: ctx.isPlatformAdmin ? 'platform_admin' : (ctx.agencyRole ?? 'agency_member'),
    agencyId: agency.id,
    tenantId: entity.tenant_id,
    metadata: { entity_id: input.entityId, billing_model: input.billingModel },
  })

  revalidatePath(`/a/${input.agencySlug}/clients/${entity.tenant_id}`)
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
