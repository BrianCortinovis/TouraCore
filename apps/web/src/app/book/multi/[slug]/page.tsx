import { createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { UnifiedBookingClient } from './unified-booking-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

type ModuleState = { active?: boolean } | boolean
function isActive(m: ModuleState | undefined): boolean {
  if (!m) return false
  if (typeof m === 'boolean') return m
  return m.active === true
}

export default async function UnifiedBookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug, modules')
    .eq('slug', slug)
    .single()

  if (!tenant) notFound()

  const modules = (tenant.modules as Record<string, ModuleState>) ?? {}
  const activeVerticals: Array<'hospitality' | 'restaurant' | 'experiences' | 'bike_rental' | 'wellness'> = []
  if (isActive(modules.hospitality)) activeVerticals.push('hospitality')
  if (isActive(modules.restaurant)) activeVerticals.push('restaurant')
  if (isActive(modules.experiences)) activeVerticals.push('experiences')
  if (isActive(modules.bike_rental)) activeVerticals.push('bike_rental')
  if (isActive(modules.wellness)) activeVerticals.push('wellness')

  if (activeVerticals.length === 0) notFound()

  // Load bookable entities + basic data for each active vertical
  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, name, kind, legal_entity_id')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)

  const hospitalityEntities = (entities ?? []).filter((e) => e.kind === 'accommodation')
  const restaurantEntities = (entities ?? []).filter((e) => e.kind === 'restaurant')
  const experienceEntities = (entities ?? []).filter((e) => e.kind === 'activity')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
          <p className="text-xs text-gray-500">Prenota online — unica esperienza multi-servizio</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <UnifiedBookingClient
          tenantId={tenant.id as string}
          tenantSlug={slug}
          tenantName={tenant.name as string}
          activeVerticals={activeVerticals}
          hospitalityEntities={hospitalityEntities}
          restaurantEntities={restaurantEntities}
          experienceEntities={experienceEntities}
        />
      </main>
    </div>
  )
}
