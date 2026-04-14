import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { ModulesClient } from './modules-client'

interface ModulesSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function ModulesSettingsPage({ params }: ModulesSettingsProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const modules = (tenant.modules as { hospitality?: boolean; experiences?: boolean }) ?? {}

  return (
    <ModulesClient
      tenantSlug={tenantSlug}
      hospitalityEnabled={modules.hospitality ?? true}
      experiencesEnabled={modules.experiences ?? false}
    />
  )
}
