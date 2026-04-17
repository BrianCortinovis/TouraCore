import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { InventoryView } from './inventory-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function InventoryPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const { data: ingredients } = await supabase
    .from('ingredients')
    .select('id, name, category, unit_of_measure, avg_cost, stock_qty, low_stock_threshold')
    .eq('restaurant_id', entity.id)
    .eq('active', true)
    .order('name')

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        <p className="text-sm text-gray-500">Ingredienti, stock, low-stock alerts</p>
      </header>
      <InventoryView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        ingredients={(ingredients ?? []).map((i) => ({
          id: i.id as string,
          name: i.name as string,
          category: i.category as string | null,
          unitOfMeasure: i.unit_of_measure as string,
          avgCost: Number(i.avg_cost),
          stockQty: Number(i.stock_qty),
          lowStockThreshold: i.low_stock_threshold ? Number(i.low_stock_threshold) : null,
        }))}
      />
    </div>
  )
}
