import { createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { listBikeTypes, listAddons, listLocations, getBikeRentalById, BIKE_TYPE_META } from '@touracore/bike-rental'
import { BikeBookingClient } from './bike-booking-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tenant?: string }>
}

/**
 * Public booking page per singolo bike_rental entity.
 * URL: /book/bike/[entitySlug]?tenant=[tenantSlug]
 */
export default async function BikeBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createServiceRoleClient()

  let tenantId: string | null = null
  let tenantName: string | null = null
  if (sp.tenant) {
    const { data: t } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('slug', sp.tenant)
      .maybeSingle()
    if (t) {
      tenantId = t.id as string
      tenantName = t.name as string
    }
  }

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, tenant_id, is_active')
    .eq('slug', slug)
    .eq('kind', 'bike_rental')
    .eq('is_active', true)
    .maybeSingle()

  if (!entity) notFound()
  if (tenantId && entity.tenant_id !== tenantId) notFound()

  const entityId = entity.id as string

  const [rental, types, addons, locations] = await Promise.all([
    getBikeRentalById({ id: entityId, usePublicClient: true }),
    listBikeTypes({ bikeRentalId: entityId, activeOnly: true, usePublicClient: true }),
    listAddons({ bikeRentalId: entityId, activeOnly: true, usePublicClient: true }),
    listLocations({ bikeRentalId: entityId, activeOnly: true, usePublicClient: true }),
  ])

  if (!rental) notFound()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-5">
          {tenantName && <p className="text-xs font-medium text-gray-500">{tenantName}</p>}
          <h1 className="text-2xl font-bold text-gray-900">{entity.name as string}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {rental.city ? `${rental.city} · ` : ''}
            {types.length} tipi disponibili · {locations.length} depositi
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <BikeBookingClient
          entityId={entityId}
          tenantId={entity.tenant_id as string}
          entityName={entity.name as string}
          types={types.map((t) => ({
            id: t.id,
            typeKey: t.type_key,
            displayName: t.display_name,
            description: t.description,
            icon: BIKE_TYPE_META[t.type_key]?.icon ?? '🚲',
            hourlyRate: t.hourly_rate ? Number(t.hourly_rate) : null,
            halfDayRate: t.half_day_rate ? Number(t.half_day_rate) : null,
            dailyRate: t.daily_rate ? Number(t.daily_rate) : null,
            weeklyRate: t.weekly_rate ? Number(t.weekly_rate) : null,
            depositAmount: Number(t.deposit_amount),
            ageMin: t.age_min,
            heightMin: t.height_min,
            heightMax: t.height_max,
          }))}
          addons={addons.map((a) => ({
            key: a.addon_key,
            label: a.display_name,
            description: a.description,
            category: a.category,
            pricingMode: a.pricing_mode,
            unitPrice: Number(a.unit_price),
            mandatoryFor: a.mandatory_for,
          }))}
          locations={locations.map((l) => ({
            id: l.id,
            name: l.name,
            city: l.city,
            isPickup: l.is_pickup,
            isReturn: l.is_return,
          }))}
          oneWayEnabled={Boolean((rental.one_way_config as Record<string, unknown> | null)?.enabled)}
          deliveryEnabled={Boolean((rental.delivery_config as Record<string, unknown> | null)?.enabled)}
        />
      </main>
    </div>
  )
}
