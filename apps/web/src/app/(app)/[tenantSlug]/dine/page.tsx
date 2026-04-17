import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, UtensilsCrossed, Users, MapPin } from 'lucide-react'
import { assertTenantModuleActive } from '@/lib/module-guard'

interface Props {
  params: Promise<{ tenantSlug: string }>
}

export default async function DineList({ params }: Props) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  await assertTenantModuleActive({
    supabase,
    tenantId: tenant.id as string,
    tenantSlug,
    moduleCode: 'restaurant',
  })

  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, name, kind, management_mode, is_active, created_at')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'restaurant')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Se solo 1 ristorante, redirect diretto
  if (entities && entities.length === 1 && entities[0]) {
    redirect(`/${tenantSlug}/dine/${entities[0].slug}`)
  }

  const entityIds = (entities ?? []).map((e) => e.id as string)
  const { data: restaurants } = entityIds.length > 0
    ? await supabase
        .from('restaurants')
        .select('id, cuisine_type, price_range, capacity_total, reservation_mode, parent_entity_id')
        .in('id', entityIds)
    : { data: [] }

  const restMap = new Map((restaurants ?? []).map((r) => [r.id as string, r]))

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ristorazione</h1>
          <p className="text-sm text-gray-500">Le tue strutture di ristorazione</p>
        </div>
        <Link
          href={`/${tenantSlug}/new?kind=restaurant`}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> Nuovo ristorante
        </Link>
      </header>

      {(entities ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-3 text-sm text-gray-600">Nessun ristorante configurato</p>
          <Link
            href={`/${tenantSlug}/new?kind=restaurant`}
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Crea primo ristorante
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(entities ?? []).map((e) => {
            const r = restMap.get(e.id as string)
            return (
              <Link
                key={e.id as string}
                href={`/${tenantSlug}/dine/${e.slug}`}
                className="group rounded-lg border border-gray-200 bg-white p-4 transition hover:border-blue-400 hover:shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-md bg-amber-50 p-2">
                    <UtensilsCrossed className="h-5 w-5 text-amber-600" />
                  </div>
                  {r?.parent_entity_id && (
                    <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">
                      Dentro hotel
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-base font-semibold text-gray-900 group-hover:text-blue-600">
                  {e.name}
                </h3>
                {r && (
                  <>
                    {Array.isArray(r.cuisine_type) && r.cuisine_type.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {(r.cuisine_type as string[]).slice(0, 3).join(' · ')}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-600">
                      {r.price_range && (
                        <span className="flex items-center gap-1">
                          {'€'.repeat(r.price_range as number)}
                        </span>
                      )}
                      {(r.capacity_total as number) > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {r.capacity_total}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {r.reservation_mode}
                      </span>
                    </div>
                  </>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
