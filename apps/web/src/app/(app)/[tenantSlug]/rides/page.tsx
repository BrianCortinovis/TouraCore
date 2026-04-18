import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, Bike } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@touracore/ui'
import { assertTenantModuleActive } from '@/lib/module-guard'

interface RidesListProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function RidesList({ params }: RidesListProps) {
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
    moduleCode: 'bike_rental',
  })

  const { data: entities } = await supabase
    .from('entities')
    .select('id, slug, name, management_mode, is_active, created_at')
    .eq('tenant_id', tenant.id)
    .eq('kind', 'bike_rental')
    .order('created_at', { ascending: false })

  const entityIds = (entities ?? []).map((e) => e.id)
  const { data: rentals } =
    entityIds.length > 0
      ? await supabase
          .from('bike_rentals')
          .select('id, city, capacity_total, bike_types')
          .in('id', entityIds)
      : { data: [] }

  const rentalMap = new Map(
    (rentals ?? []).map((r) => [r.id, r as { id: string; city: string | null; capacity_total: number; bike_types: string[] }]),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Noleggio Bici</h1>
        <Link
          href={`/${tenantSlug}/rides/new`}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuovo noleggio
        </Link>
      </div>

      {!entities || entities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <Bike className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nessun noleggio</h3>
          <p className="mt-2 text-sm text-gray-500">
            Crea il primo punto di noleggio bici o e-bike per gestire la flotta e le prenotazioni.
          </p>
          <Link
            href={`/${tenantSlug}/rides/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Crea noleggio
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => {
            const r = rentalMap.get(entity.id)
            return (
              <Link key={entity.id} href={`/${tenantSlug}/rides/${entity.slug}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-lg">{entity.name}</span>
                      <Badge variant={entity.is_active ? 'default' : 'secondary'}>
                        {entity.is_active ? 'Attivo' : 'Inattivo'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      {r?.city && <span>{r.city}</span>}
                      {r && (
                        <>
                          <span className="text-gray-300">·</span>
                          <span>{r.capacity_total} bici</span>
                        </>
                      )}
                    </div>
                    {r?.bike_types && r.bike_types.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.bike_types.slice(0, 4).map((t) => (
                          <Badge key={t} variant="outline" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                        {r.bike_types.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{r.bike_types.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
