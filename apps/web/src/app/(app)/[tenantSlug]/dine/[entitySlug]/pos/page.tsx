import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { POSView } from './pos-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function POSPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()

  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const [{ data: tables }, { data: rooms }, { data: openOrders }, { data: categories }, { data: items }] = await Promise.all([
    supabase
      .from('restaurant_tables')
      .select('id, code, room_id, seats_default')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('code'),
    supabase.from('restaurant_rooms').select('id, name').eq('restaurant_id', entity.id).eq('active', true).order('order_idx'),
    supabase
      .from('restaurant_orders')
      .select('id, table_id, status, subtotal, total, party_size, opened_at')
      .eq('restaurant_id', entity.id)
      .in('status', ['open', 'sent']),
    supabase.from('menu_categories').select('id, name, order_idx').eq('restaurant_id', entity.id).eq('active', true).order('order_idx'),
    supabase
      .from('menu_items')
      .select('id, category_id, name, price_base, vat_pct, station_code, allergens')
      .eq('restaurant_id', entity.id)
      .eq('active', true)
      .order('order_idx'),
  ])

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">POS</h1>
        <p className="text-sm text-gray-500">Punto cassa — apri tavolo, invia ordine, chiudi conto</p>
      </header>
      <POSView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        rooms={(rooms ?? []).map((r) => ({ id: r.id as string, name: r.name as string }))}
        tables={(tables ?? []).map((t) => ({
          id: t.id as string,
          code: t.code as string,
          roomId: t.room_id as string,
          seatsDefault: t.seats_default as number,
        }))}
        openOrders={(openOrders ?? []).map((o) => ({
          id: o.id as string,
          tableId: o.table_id as string | null,
          status: o.status as 'open' | 'sent',
          subtotal: Number(o.subtotal),
          total: Number(o.total),
          partySize: o.party_size as number,
          openedAt: o.opened_at as string,
        }))}
        categories={(categories ?? []).map((c) => ({
          id: c.id as string,
          name: c.name as string,
        }))}
        items={(items ?? []).map((i) => ({
          id: i.id as string,
          categoryId: i.category_id as string,
          name: i.name as string,
          priceBase: Number(i.price_base),
          vatPct: Number(i.vat_pct),
          stationCode: i.station_code as string | null,
          allergens: (i.allergens as string[]) ?? [],
        }))}
      />
    </div>
  )
}
