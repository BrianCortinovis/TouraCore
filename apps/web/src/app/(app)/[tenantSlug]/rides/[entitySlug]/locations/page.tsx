import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { Badge } from '@touracore/ui'
import { listLocations } from '@touracore/bike-rental'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function LocationsList({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', tenantSlug).single()
  if (!tenant) notFound()

  const { data: entity } = await supabase
    .from('entities')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('slug', entitySlug)
    .single()
  if (!entity) notFound()

  const locations = await listLocations({ bikeRentalId: entity.id as string })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Depositi</h1>
        <p className="mt-1 text-sm text-gray-500">
          {locations.length} depositi configurati · multi-location con pickup/return
        </p>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Nessun deposito</h3>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <div key={loc.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{loc.name}</h3>
                <Badge variant={loc.active ? 'default' : 'secondary'}>
                  {loc.active ? 'Attivo' : 'Inattivo'}
                </Badge>
              </div>
              {loc.address && (
                <p className="mt-1 text-sm text-gray-600">
                  {loc.address}
                  {loc.city ? `, ${loc.city}` : ''} {loc.zip ?? ''}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {loc.is_pickup && <Badge variant="outline" className="text-xs">Pickup</Badge>}
                {loc.is_return && <Badge variant="outline" className="text-xs">Return</Badge>}
                {loc.capacity && <Badge variant="outline" className="text-xs">cap. {loc.capacity}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
