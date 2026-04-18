import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@touracore/db/server'
import { assertTenantModuleActive } from '@/lib/module-guard'
import { BikeRentalSidebar } from './bike-rental-sidebar'

interface RidesEntityLayoutProps {
  children: React.ReactNode
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function RidesEntityLayout({ children, params }: RidesEntityLayoutProps) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  await assertTenantModuleActive({
    supabase,
    tenantId: tenant.id as string,
    tenantSlug,
    moduleCode: 'bike_rental',
  })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()

  if (!entity || entity.kind !== 'bike_rental') notFound()

  const { data: rental } = await supabase
    .from('bike_rentals')
    .select('id')
    .eq('id', entity.id)
    .maybeSingle()

  return (
    <div className="flex w-full gap-3 lg:gap-6">
      <BikeRentalSidebar
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        entityName={entity.name as string}
        hasRentalConfig={Boolean(rental)}
      />
      <div className="min-w-0 flex-1 pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </div>
    </div>
  )
}
