import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { assertTenantModuleActive } from '@/lib/module-guard'
import { RestaurantSidebar } from './restaurant-sidebar'

interface DineLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function DineLayout({ children, params }: DineLayoutProps) {
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
    moduleCode: 'restaurant',
  })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, tenant_id')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity || entity.kind !== 'restaurant') notFound()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, cuisine_type, price_range, capacity_total, reservation_mode')
    .eq('id', entity.id)
    .maybeSingle()

  const { data: allEntities } = await supabase
    .from('entities')
    .select('id, slug, name, management_mode')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'restaurant')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="flex w-full gap-3 lg:gap-6">
      <RestaurantSidebar
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        entityName={entity.name as string}
        managementMode={entity.management_mode as 'agency_managed' | 'self_service'}
        hasRestaurantConfig={Boolean(restaurant)}
        allEntities={(allEntities ?? []).map((e) => ({
          id: e.id as string,
          slug: e.slug as string,
          name: e.name as string,
          management_mode: e.management_mode as 'agency_managed' | 'self_service',
        }))}
      />
      <div className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </div>
    </div>
  )
}
