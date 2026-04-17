import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import PlanForm from './plan-form'

export default async function OnboardingStepPlan() {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding/step-2')
  }

  const tenantId = memberships[0]!.tenant_id
  const admin = await createServiceRoleClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('modules')
    .eq('id', tenantId)
    .single()

  const modules = (tenant?.modules ?? {}) as Record<string, { active: boolean; source: string }>
  const pendingCodes = Object.keys(modules).filter((k) => modules[k]?.source === 'onboarding_pending')

  if (pendingCodes.length === 0) {
    redirect('/onboarding/step-modules')
  }

  const { data: catalog } = await admin
    .from('module_catalog')
    .select('code,label,base_price_eur')
    .in('code', pendingCodes)

  const { data: bundles } = await admin
    .from('bundle_discounts')
    .select('min_modules,discount_percent')
    .eq('active', true)
    .order('min_modules', { ascending: true })

  return (
    <PlanForm
      selectedModules={catalog ?? []}
      bundles={bundles ?? []}
    />
  )
}
