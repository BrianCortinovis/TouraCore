import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import ModulesForm from './modules-form'

export default async function OnboardingStepModules() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const admin = await createServiceRoleClient()
  const { data: catalog } = await admin
    .from('module_catalog')
    .select('code,label,description,icon,base_price_eur,entity_kind,order_idx,pausable')
    .eq('active', true)
    .order('order_idx', { ascending: true })

  const { data: bundles } = await admin
    .from('bundle_discounts')
    .select('min_modules,discount_percent')
    .eq('active', true)
    .order('min_modules', { ascending: true })

  return (
    <ModulesForm
      catalog={catalog ?? []}
      bundles={bundles ?? []}
    />
  )
}
