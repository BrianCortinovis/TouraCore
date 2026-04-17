import { createServerSupabaseClient } from '@touracore/db/server'
import { RestaurantSettingsForm } from './settings-form'
import { ensureRestaurantRecord } from './actions'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function RestaurantSettingsPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('cuisine_type, price_range, capacity_total, avg_turn_minutes, reservation_mode, opening_hours, services, deposit_policy')
    .eq('id', entity.id)
    .single()

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Impostazioni — {entity.name}</h1>
        <p className="mt-1 text-sm text-gray-500">Configurazione ristorante, orari, deposito.</p>
      </header>
      <RestaurantSettingsForm
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        initial={{
          cuisine_type: (restaurant?.cuisine_type as string[]) ?? [],
          price_range: (restaurant?.price_range as number) ?? 2,
          capacity_total: (restaurant?.capacity_total as number) ?? 0,
          avg_turn_minutes: (restaurant?.avg_turn_minutes as number) ?? 90,
          reservation_mode: (restaurant?.reservation_mode as 'slot' | 'rolling' | 'hybrid') ?? 'slot',
        }}
      />
    </div>
  )
}
