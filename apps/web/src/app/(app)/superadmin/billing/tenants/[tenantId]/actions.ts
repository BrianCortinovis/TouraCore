'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

async function assertSuperAdmin(userId: string): Promise<boolean> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('platform_admins')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.role === 'super_admin' || data?.role === 'admin'
}

const GrantSchema = z.object({
  tenantId: z.string().uuid(),
  moduleCode: z.enum([
    'hospitality',
    'restaurant',
    'wellness',
    'experiences',
    'bike_rental',
    'moto_rental',
    'ski_school',
  ]),
  reason: z.string().min(3, 'Motivo obbligatorio (min 3 caratteri)'),
  validUntil: z.string().nullable(),
})

export async function grantFreeOverrideAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = GrantSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Non autenticato' }

  const isAdmin = await assertSuperAdmin(user.id)
  if (!isAdmin) return { success: false, error: 'Permessi insufficienti' }

  const admin = await createServiceRoleClient()

  // Insert override
  const { error } = await admin.from('module_overrides').insert({
    tenant_id: parsed.data.tenantId,
    module_code: parsed.data.moduleCode,
    override_type: 'free',
    reason: parsed.data.reason,
    granted_by_user_id: user.id,
    granted_by_scope: 'super_admin',
    valid_until: parsed.data.validUntil || null,
    active: true,
  })

  if (error) return { success: false, error: error.message }

  // Aggiorna tenants.modules per attivare se non già
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

  // Log
  await admin.from('module_activation_log').insert({
    tenant_id: parsed.data.tenantId,
    module_code: parsed.data.moduleCode,
    action: 'free_granted',
    actor_user_id: user.id,
    actor_scope: 'super_admin',
    notes: parsed.data.reason,
  })

  revalidatePath(`/superadmin/billing/tenants/${parsed.data.tenantId}`)
  revalidatePath('/superadmin/billing/overrides')
  return { success: true }
}

const RevokeSchema = z.object({
  overrideId: z.string().uuid(),
  reason: z.string().min(3),
})

export async function revokeOverrideAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = RevokeSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }

  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Non autenticato' }

  const isAdmin = await assertSuperAdmin(user.id)
  if (!isAdmin) return { success: false, error: 'Permessi insufficienti' }

  const admin = await createServiceRoleClient()

  const { data: override } = await admin
    .from('module_overrides')
    .select('tenant_id, module_code')
    .eq('id', parsed.data.overrideId)
    .maybeSingle()

  if (!override) return { success: false, error: 'Override non trovato' }

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
    actor_scope: 'super_admin',
    notes: parsed.data.reason,
  })

  revalidatePath(`/superadmin/billing/tenants/${override.tenant_id}`)
  revalidatePath('/superadmin/billing/overrides')
  return { success: true }
}
