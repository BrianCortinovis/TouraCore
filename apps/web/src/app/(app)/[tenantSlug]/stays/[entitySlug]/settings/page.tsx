import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { EntitySettingsForm } from './settings-form'

interface SettingsProps {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}


export default async function EntitySettingsPage({ params }: SettingsProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, country')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, is_active, country_override')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client non tipizzato
  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('*')
    .eq('entity_id', entity.id)
    .maybeSingle() as { data: any }

  return (
    <EntitySettingsForm
      tenantSlug={tenantSlug}
      tenantCountry={tenant.country ?? 'IT'}
      entity={entity as any}
      accommodation={accommodation}
    />
  )
}
