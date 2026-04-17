import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { assertTenantModuleActive } from '@/lib/module-guard'
import { EntitySidebar } from './entity-sidebar'

interface EntityLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function EntityLayout({ children, params }: EntityLayoutProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, country')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  await assertTenantModuleActive({
    supabase,
    tenantId: tenant.id as string,
    tenantSlug,
    moduleCode: 'hospitality',
  })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, tenant_id, country_override')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity) notFound()

  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('property_type, is_imprenditoriale')
    .eq('entity_id', entity.id)
    .maybeSingle()

  const { data: allEntities } = await supabase
    .from('entities')
    .select('id, slug, name, management_mode')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'accommodation')
    .eq('is_active', true)
    .order('name', { ascending: true })

  const country = (entity.country_override ?? tenant.country ?? 'IT') as string

  return (
    <div className="flex w-full gap-3 lg:gap-6">
      <EntitySidebar
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        entityName={entity.name}
        managementMode={entity.management_mode as 'agency_managed' | 'self_service'}
        propertyType={accommodation?.property_type ?? null}
        isImprenditoriale={accommodation?.is_imprenditoriale ?? false}
        country={country}
        allEntities={(allEntities ?? []).map((e) => ({
          id: e.id as string,
          slug: e.slug as string,
          name: e.name as string,
          management_mode: e.management_mode as 'agency_managed' | 'self_service',
        }))}
      />
      <div className="min-w-0 flex-1 pt-14 lg:pt-0">
        {/* Wrap contenuto con max-width ragionevole per leggibilità form.
            Pagine che richiedono full-width (planning, reports) possono
            usare classi -mx-* o annidare in un div con max-w: none */}
        <div className="mx-auto w-full max-w-5xl">
          {children}
        </div>
      </div>
    </div>
  )
}
