import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { ModulesClient } from './modules-client'

interface ModulesSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function ModulesSettingsPage({ params }: ModulesSettingsProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()
  const admin = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: catalog } = await admin
    .from('module_catalog')
    .select('code,label,description,icon,base_price_eur,entity_kind,order_idx,pausable')
    .eq('active', true)
    .order('order_idx', { ascending: true })

  const { data: overrides } = await admin
    .from('module_overrides')
    .select('module_code,override_type,valid_until,reason')
    .eq('tenant_id', tenant.id)
    .eq('active', true)

  return (
    <ModulesClient
      tenantSlug={tenantSlug}
      tenantModules={(tenant.modules ?? {}) as Record<string, { active: boolean; source: string; trial_until?: string }>}
      catalog={catalog ?? []}
      overrides={overrides ?? []}
    />
  )
}
