import { createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { CATEGORY_META, DIFFICULTY_META, BOOKING_MODES } from '@touracore/experiences'
import { ExperienceBookingClient } from './experience-booking-client'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tenant?: string; product?: string; ref?: string }>
}

export default async function ExperienceBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const supabase = await createServiceRoleClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, description, tenant_id, is_active')
    .eq('slug', slug)
    .eq('kind', 'activity')
    .eq('is_active', true)
    .maybeSingle()
  if (!entity) notFound()

  const { data: extExp } = await supabase
    .from('experience_entities')
    .select('category, city, address, languages, age_min_default, height_min_cm_default, difficulty_default, cancellation_policy')
    .eq('id', entity.id)
    .single()

  const { data: products } = await supabase
    .from('experience_products')
    .select('id, slug, name, description_md, booking_mode, duration_minutes, capacity_default, age_min, height_min_cm, difficulty, languages, price_base_cents, currency, highlights, includes, excludes, requirements, meeting_point, waiver_required, deposit_required_cents, cutoff_minutes, images')
    .eq('entity_id', entity.id)
    .eq('status', 'active')
    .order('name')

  const { data: variants } = await supabase
    .from('experience_variants')
    .select('*')
    .eq('tenant_id', entity.tenant_id)
    .eq('active', true)
    .in('product_id', (products ?? []).map((p) => p.id))

  const { data: addons } = await supabase
    .from('experience_addons')
    .select('*')
    .eq('tenant_id', entity.tenant_id)
    .eq('active', true)
    .in('product_id', (products ?? []).map((p) => p.id))

  const now = new Date()
  const to = new Date(); to.setDate(to.getDate() + 30)
  const { data: timeslots } = await supabase
    .from('experience_timeslots')
    .select('id, product_id, start_at, end_at, capacity_total, capacity_booked, capacity_held, status, price_override_cents')
    .eq('tenant_id', entity.tenant_id)
    .eq('status', 'open')
    .gte('start_at', now.toISOString())
    .lte('start_at', to.toISOString())
    .in('product_id', (products ?? []).map((p) => p.id))
    .order('start_at')

  const { data: zones } = await supabase
    .from('experience_pickup_zones')
    .select('id, name, radius_km, surcharge_cents')
    .eq('entity_id', entity.id)
    .eq('active', true)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-5">
          <div className="flex items-center gap-3">
            {extExp?.category && <span className="text-3xl">{CATEGORY_META[extExp.category as keyof typeof CATEGORY_META]?.icon}</span>}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{entity.name}</h1>
              <p className="text-sm text-gray-500">{entity.description}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            {extExp?.city && <span>📍 {extExp.city}</span>}
            {extExp?.languages && <span>🌐 {extExp.languages.join(' · ').toUpperCase()}</span>}
            {extExp?.difficulty_default && (
              <span className={`inline-flex rounded-full bg-${DIFFICULTY_META[extExp.difficulty_default as keyof typeof DIFFICULTY_META]?.color}-100 px-2 py-0.5 text-${DIFFICULTY_META[extExp.difficulty_default as keyof typeof DIFFICULTY_META]?.color}-700`}>
                {DIFFICULTY_META[extExp.difficulty_default as keyof typeof DIFFICULTY_META]?.label}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <ExperienceBookingClient
          entity={{ id: entity.id, slug: entity.slug, name: entity.name, tenantId: entity.tenant_id as string }}
          products={(products ?? []) as unknown as Parameters<typeof ExperienceBookingClient>[0]['products']}
          variants={(variants ?? []) as unknown as Parameters<typeof ExperienceBookingClient>[0]['variants']}
          addons={(addons ?? []) as unknown as Parameters<typeof ExperienceBookingClient>[0]['addons']}
          timeslots={(timeslots ?? []) as unknown as Parameters<typeof ExperienceBookingClient>[0]['timeslots']}
          zones={(zones ?? []) as unknown as Parameters<typeof ExperienceBookingClient>[0]['zones']}
          selectedProductSlug={sp.product}
          partnerRef={sp.ref}
        />
        <p className="mt-6 text-center text-[11px] text-gray-400">
          Booking mode: {products?.[0] ? BOOKING_MODES[products[0].booking_mode as keyof typeof BOOKING_MODES]?.label : '—'}
        </p>
      </main>
    </div>
  )
}
