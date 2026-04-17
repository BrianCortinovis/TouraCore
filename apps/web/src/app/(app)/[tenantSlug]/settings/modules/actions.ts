'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import { logAudit, getAuditContext } from '@touracore/audit'
import { z } from 'zod'

const ModuleCodeEnum = z.enum([
  'hospitality',
  'restaurant',
  'wellness',
  'experiences',
  'bike_rental',
  'moto_rental',
  'ski_school',
])

const ToggleSchema = z.object({
  tenantSlug: z.string().min(1),
  moduleCode: ModuleCodeEnum,
  active: z.boolean(),
})

export async function toggleModuleAction(
  input: unknown
): Promise<{ success: boolean; error?: string }> {
  const parsed = ToggleSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const { tenantSlug, moduleCode, active } = parsed.data
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) return { success: false, error: 'Sessione scaduta' }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) return { success: false, error: 'Organizzazione non trovata' }

  const admin = await createServiceRoleClient()
  const current = (tenant.modules ?? {}) as Record<
    string,
    { active: boolean; source: string; since?: string; trial_until?: string }
  >

  const now = new Date().toISOString()
  const existing = current[moduleCode]
  current[moduleCode] = {
    active,
    source: active ? existing?.source ?? 'subscription' : 'subscription',
    since: existing?.since ?? now,
    ...(existing?.trial_until ? { trial_until: existing.trial_until } : {}),
  }

  const { error } = await admin
    .from('tenants')
    .update({ modules: current })
    .eq('id', tenant.id)

  if (error) return { success: false, error: error.message }

  await admin.from('module_activation_log').insert({
    tenant_id: tenant.id,
    module_code: moduleCode,
    action: active ? 'activated' : 'deactivated',
    actor_user_id: user.id,
    actor_scope: 'tenant_owner',
  })

  const auditCtx = await getAuditContext(tenant.id, user.id)
  await logAudit({
    context: auditCtx,
    action: `tenant.module_${active ? 'activate' : 'deactivate'}`,
    entityType: 'tenant',
    entityId: tenant.id,
    oldData: { modules: tenant.modules },
    newData: { modules: current },
  }).catch(() => {})

  revalidatePath(`/${tenantSlug}/settings/modules`)
  revalidatePath(`/${tenantSlug}`)
  return { success: true }
}
