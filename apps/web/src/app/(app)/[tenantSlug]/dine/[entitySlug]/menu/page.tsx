import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { MenuEditor } from './menu-editor'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function MenuPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id, name, order_idx, available_services')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('order_idx'),
    supabase
      .from('menu_items')
      .select('id, category_id, name, description, price_base, vat_pct, course_number, station_code, allergens, available_services, order_idx')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('order_idx'),
  ])

  return (
    <div className="space-y-4 p-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="text-sm text-gray-500">Categorie, piatti, modifiers, allergeni UE</p>
        </div>
        <a
          href={`/api/allergens-qr/${entitySlug}`}
          download
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Stampa QR allergeni (UE 1169/2011)
        </a>
      </header>
      <MenuEditor
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        categories={(categories ?? []).map((c) => ({
          id: c.id as string,
          name: c.name as string,
          orderIdx: c.order_idx as number,
          availableServices: (c.available_services as string[]) ?? [],
        }))}
        items={(items ?? []).map((i) => ({
          id: i.id as string,
          categoryId: i.category_id as string,
          name: i.name as string,
          description: i.description as string | null,
          priceBase: Number(i.price_base),
          vatPct: Number(i.vat_pct),
          courseNumber: i.course_number as number,
          stationCode: i.station_code as string | null,
          allergens: (i.allergens as string[]) ?? [],
          availableServices: (i.available_services as string[]) ?? [],
        }))}
      />
    </div>
  )
}
