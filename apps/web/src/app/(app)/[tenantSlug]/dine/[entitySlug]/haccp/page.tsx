import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { HACCPView } from './haccp-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function HACCPPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [{ data: temps }, { data: lots }] = await Promise.all([
    supabase
      .from('haccp_temperature_log')
      .select('id, equipment_code, equipment_name, temperature_c, reading_at, notes')
      .eq('restaurant_id', entity.id)
      .gte('reading_at', since.toISOString())
      .order('reading_at', { ascending: false })
      .limit(200),
    supabase
      .from('ingredient_lots')
      .select('id, ingredient_id, lot_code, received_date, expiry_date, qty_remaining, ingredients(name)')
      .gt('qty_remaining', 0)
      .order('expiry_date', { ascending: true })
      .limit(50),
  ])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">HACCP</h1>
        <p className="text-sm text-gray-500">Temperature, lotti, tracciabilità (Reg. CE 852/2004)</p>
      </header>
      <HACCPView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        temperatures={(temps ?? []).map((t) => ({
          id: t.id as string,
          equipmentCode: t.equipment_code as string,
          equipmentName: t.equipment_name as string,
          temperatureC: Number(t.temperature_c),
          readingAt: t.reading_at as string,
          notes: t.notes as string | null,
        }))}
        lots={(lots ?? []).map((l) => {
          const ing = Array.isArray(l.ingredients) ? l.ingredients[0] : l.ingredients
          return {
            id: l.id as string,
            ingredientName: (ing?.name as string) ?? '—',
            lotCode: l.lot_code as string,
            receivedDate: l.received_date as string,
            expiryDate: l.expiry_date as string | null,
            qtyRemaining: Number(l.qty_remaining),
          }
        })}
      />
    </div>
  )
}
