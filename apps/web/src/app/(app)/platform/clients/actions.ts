'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'

async function assertPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.from('platform_admins').select('role').eq('user_id', userId).maybeSingle()
  return !!data
}

const MODULE_CODES = ['hospitality', 'restaurant', 'wellness', 'experiences', 'bike_rental', 'moto_rental', 'ski_school'] as const
type ModuleCode = typeof MODULE_CODES[number]

export async function saveTenantPlatformBillingAction(input: {
  tenantId: string
  billingModel: 'subscription' | 'commission' | 'hybrid' | 'free'
  feeMonthlyEur?: number | null
  commissionPct?: number | null
  commissionCapEur?: number | null
  commissionMinEur?: number | null
  notes?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Non autenticato' }
  if (!(await assertPlatformAdmin(user.id))) return { ok: false, error: 'Permessi insufficienti' }

  const supabase = await createServiceRoleClient()

  const payload = {
    scope: 'tenant',
    scope_id: input.tenantId,
    module_code: null,
    billing_model: input.billingModel,
    subscription_price_eur: input.feeMonthlyEur ?? null,
    commission_percent: input.commissionPct ?? null,
    commission_cap_eur: input.commissionCapEur ?? null,
    commission_min_eur: input.commissionMinEur ?? null,
    created_by_scope: 'super_admin',
    notes: input.notes ?? null,
  }

  // Upsert su billing_profiles (scope=tenant, module_code=null = profilo tenant-wide)
  const { data: existing } = await supabase
    .from('billing_profiles')
    .select('id')
    .eq('scope', 'tenant')
    .eq('scope_id', input.tenantId)
    .is('module_code', null)
    .maybeSingle()

  let error
  if (existing) {
    ;({ error } = await supabase.from('billing_profiles').update(payload).eq('id', existing.id))
  } else {
    ;({ error } = await supabase.from('billing_profiles').insert(payload))
  }

  if (error) return { ok: false, error: error.message }
  revalidatePath(`/platform/clients/${input.tenantId}`)
  return { ok: true }
}

export async function toggleTenantModuleAction(input: {
  tenantId: string
  moduleCode: ModuleCode
  active: boolean
  source?: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: 'Non autenticato' }
  if (!(await assertPlatformAdmin(user.id))) return { ok: false, error: 'Permessi insufficienti' }

  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase.from('tenants').select('modules').eq('id', input.tenantId).single()
  if (!tenant) return { ok: false, error: 'Tenant non trovato' }

  const modules = (tenant.modules ?? {}) as Record<string, { active: boolean; source: string; since?: string }>
  modules[input.moduleCode] = {
    active: input.active,
    source: input.source ?? (input.active ? 'platform_enabled' : 'platform_disabled'),
    since: new Date().toISOString(),
  }

  const { error } = await supabase.from('tenants').update({ modules }).eq('id', input.tenantId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/platform/clients/${input.tenantId}`)
  return { ok: true }
}
