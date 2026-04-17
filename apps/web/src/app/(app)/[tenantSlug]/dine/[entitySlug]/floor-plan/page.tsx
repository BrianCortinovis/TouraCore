import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { FloorPlanEditor } from './floor-plan-editor'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function FloorPlanPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const { data: rooms } = await supabase
    .from('restaurant_rooms')
    .select('id, name, zone_type, order_idx, layout')
    .eq('restaurant_id', entity.id)
    .eq('active', true)
    .order('order_idx', { ascending: true })

  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('id, room_id, code, shape, seats_min, seats_max, seats_default, attributes, joinable_with, position')
    .eq('restaurant_id', entity.id)
    .eq('active', true)

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold text-gray-900">Pianta sala — {entity.name}</h1>
        <p className="text-xs text-gray-500">Trascina tavoli sul canvas, ridimensiona, ruota.</p>
      </header>
      <div className="flex-1 overflow-hidden">
        <FloorPlanEditor
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          restaurantId={entity.id as string}
          rooms={(rooms ?? []).map((r) => ({
            id: r.id as string,
            name: r.name as string,
            zoneType: (r.zone_type as string | null) ?? 'indoor',
            layout: (r.layout as { width: number; height: number }) ?? { width: 1200, height: 800 },
          }))}
          tables={(tables ?? []).map((t) => ({
            id: t.id as string,
            roomId: t.room_id as string,
            code: t.code as string,
            shape: t.shape as 'round' | 'square' | 'rect' | 'custom',
            seatsMin: t.seats_min as number,
            seatsMax: t.seats_max as number,
            seatsDefault: t.seats_default as number,
            attributes: (t.attributes as string[]) ?? [],
            joinableWith: (t.joinable_with as string[]) ?? [],
            position: t.position as { x: number; y: number; w: number; h: number; rotation: number },
          }))}
        />
      </div>
    </div>
  )
}
