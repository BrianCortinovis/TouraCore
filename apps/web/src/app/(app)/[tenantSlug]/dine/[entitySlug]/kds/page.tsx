import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { KDSView } from './kds-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
  searchParams: Promise<{ station?: string }>
}

export default async function KDSPage({ params, searchParams }: Props) {
  const { tenantSlug, entitySlug } = await params
  const { station } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const { data: stations } = await supabase
    .from('kitchen_stations')
    .select('id, code, name')
    .eq('restaurant_id', entity.id)
    .eq('active', true)
    .order('name')

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <KDSView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        restaurantName={entity.name as string}
        stations={(stations ?? []).map((s) => ({
          id: s.id as string,
          code: s.code as string,
          name: s.name as string,
        }))}
        activeStationCode={station ?? null}
      />
    </div>
  )
}
