'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

async function assertAgencyMember(userId: string, agencyId: string): Promise<boolean> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('agency_members')
    .select('role')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .maybeSingle()
  return Boolean(data) && ['agency_owner', 'agency_admin'].includes(data?.role ?? '')
}

async function checkAgencyLink(agencyId: string, tenantId: string): Promise<boolean> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('agency_tenant_links')
    .select('id')
    .eq('agency_id', agencyId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle()
  return Boolean(data)
}

const GrantSchema = z.object({
  tenantId: z.string().uuid(),
  agencyId: z.string().uuid(),
  moduleCode: z.enum([
    'hospitality',
    'restaurant',
    'wellness',
    'experiences',
    'bike_rental',
    'moto_rental',
    'ski_school',
  ]),
  reason: z.string().min(3),
  validUntil: z.string().nullable(),
})

export async function agencyGrantFreeAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = GrantSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Non autenticato' }

  const isMember = await assertAgencyMember(user.id, parsed.data.agencyId)
  if (!isMember) return { success: false, error: 'Non sei agency_owner/admin' }

  const hasLink = await checkAgencyLink(parsed.data.agencyId, parsed.data.tenantId)
  if (!hasLink) return { success: false, error: 'Tenant non è sotto la tua agenzia' }

  const admin = await createServiceRoleClient()

  // Verifica can_grant_free + quota
  const { data: agency } = await admin
    .from('agencies')
    .select('can_grant_free, free_grant_quota')
    .eq('id', parsed.data.agencyId)
    .single()
  if (!agency?.can_grant_free) {
    return { success: false, error: 'Agenzia non ha permesso di concedere free' }
  }

  const { data: remaining } = await admin.rpc('agency_can_grant_free_remaining', {
    p_agency: parsed.data.agencyId,
  })
  if (remaining !== null && (remaining as number) <= 0) {
    return { success: false, error: 'Quota free esaurita' }
  }

  const { error } = await admin.from('module_overrides').insert({
    tenant_id: parsed.data.tenantId,
    module_code: parsed.data.moduleCode,
    override_type: 'free',
    reason: parsed.data.reason,
    granted_by_user_id: user.id,
    granted_by_scope: 'agency',
    granted_by_agency_id: parsed.data.agencyId,
    valid_until: parsed.data.validUntil || null,
    active: true,
  })

  if (error) return { success: false, error: error.message }

  // Aggiorna tenants.modules
  const { data: tenant } = await admin
    .from('tenants')
    .select('modules')
    .eq('id', parsed.data.tenantId)
    .single()
  const modules = (tenant?.modules ?? {}) as Record<string, { active: boolean; source: string; since?: string }>
  modules[parsed.data.moduleCode] = {
    active: true,
    source: 'override_free',
    since: new Date().toISOString(),
  }
  await admin.from('tenants').update({ modules }).eq('id', parsed.data.tenantId)

  await admin.from('module_activation_log').insert({
    tenant_id: parsed.data.tenantId,
    module_code: parsed.data.moduleCode,
    action: 'free_granted',
    actor_user_id: user.id,
    actor_scope: 'agency',
    actor_agency_id: parsed.data.agencyId,
    notes: parsed.data.reason,
  })

  revalidatePath('/agency/billing')
  return { success: true }
}

const RevokeSchema = z.object({
  overrideId: z.string().uuid(),
  agencyId: z.string().uuid(),
  reason: z.string().min(3),
})

export async function agencyRevokeOverrideAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = RevokeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Non autenticato' }

  const isMember = await assertAgencyMember(user.id, parsed.data.agencyId)
  if (!isMember) return { success: false, error: 'Permessi insufficienti' }

  const admin = await createServiceRoleClient()

  const { data: override } = await admin
    .from('module_overrides')
    .select('tenant_id, module_code, granted_by_agency_id, granted_by_scope')
    .eq('id', parsed.data.overrideId)
    .maybeSingle()

  if (!override) return { success: false, error: 'Override non trovato' }
  if (override.granted_by_scope !== 'agency' || override.granted_by_agency_id !== parsed.data.agencyId) {
    return { success: false, error: 'Solo super-admin può revocare questo override' }
  }

  const { error } = await admin
    .from('module_overrides')
    .update({
      active: false,
      revoked_at: new Date().toISOString(),
      revoked_by_user_id: user.id,
      revoked_reason: parsed.data.reason,
    })
    .eq('id', parsed.data.overrideId)

  if (error) return { success: false, error: error.message }

  await admin.from('module_activation_log').insert({
    tenant_id: override.tenant_id,
    module_code: override.module_code,
    action: 'free_revoked',
    actor_user_id: user.id,
    actor_scope: 'agency',
    actor_agency_id: parsed.data.agencyId,
    notes: parsed.data.reason,
  })

  revalidatePath('/agency/billing')
  return { success: true }
}
