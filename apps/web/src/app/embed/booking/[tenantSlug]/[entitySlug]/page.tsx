import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@touracore/db/server'
import {
  listBikeTypes,
  listAddons,
  listLocations,
  getBikeRentalById,
  BIKE_TYPE_META,
} from '@touracore/bike-rental'
import { BikeBookingClient } from '../../../../book/bike/[slug]/bike-booking-client'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EmbedBookingEntityPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const sp = await searchParams
  const partnerRef = typeof sp.ref === 'string' ? sp.ref : null
  const supabase = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', tenantSlug)
    .maybeSingle()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, kind, tenant_id, is_active')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .eq('is_active', true)
    .maybeSingle()
  if (!entity) notFound()

  const kind = entity.kind as string

  if (kind === 'bike_rental') {
    const entityId = entity.id as string
    const [rental, types, addons, locations] = await Promise.all([
      getBikeRentalById({ id: entityId, usePublicClient: true }),
      listBikeTypes({ bikeRentalId: entityId, activeOnly: true, usePublicClient: true }),
      listAddons({ bikeRentalId: entityId, activeOnly: true, usePublicClient: true }),
      listLocations({ bikeRentalId: entityId, activeOnly: true, usePublicClient: true }),
    ])
    if (!rental) notFound()

    return (
      <div style={{ padding: 16, background: '#fff', minHeight: '100vh' }}>
        <BikeBookingClient
          entityId={entityId}
          tenantId={entity.tenant_id as string}
          entityName={entity.name as string}
          partnerRef={partnerRef}
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
      </div>
    )
  }

  // Accommodation + restaurant embed (riuso existing route con redirect interno)
  return (
    <div style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{entity.name as string}</h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
        Booking engine disponibile su{' '}
        <a href={`/book/${tenantSlug}`} target="_top" style={{ color: '#003b95', fontWeight: 600 }}>
          /book/{tenantSlug}
        </a>
        .
      </p>
    </div>
  )
}
