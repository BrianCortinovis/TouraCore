import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@touracore/db/server'
import { assertUserOwnsRestaurant, RestaurantAccessError } from '@/lib/restaurant-guard'

export async function GET(req: NextRequest) {
  const restaurantId = req.nextUrl.searchParams.get('restaurantId')
  const station = req.nextUrl.searchParams.get('station')
  if (!restaurantId) return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })

  try {
    await assertUserOwnsRestaurant(restaurantId)
  } catch (e) {
    if (e instanceof RestaurantAccessError) {
      return NextResponse.json({ error: e.message }, { status: 403 })
    }
    throw e
  }

  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('order_items')
    .select(`
      id, order_id, item_name, qty, notes, status, course_number, station_code, fired_at,
      restaurant_orders!inner(restaurant_id, party_size, table_id),
      menu_items(allergens)
    `)
    .in('status', ['sent', 'preparing', 'ready'])
    .eq('restaurant_orders.restaurant_id', restaurantId)
    .order('fired_at')

  if (station) {
    query = query.eq('station_code', station)
  }

  const { data: items } = await query

  // Supabase nested select restituisce array per relation
  type RawItem = {
    id: string
    order_id: string
    item_name: string
    qty: number
    notes: string | null
    status: string
    course_number: number
    station_code: string | null
    fired_at: string | null
    restaurant_orders: Array<{ restaurant_id: string; party_size: number; table_id: string | null }> | { restaurant_id: string; party_size: number; table_id: string | null }
    menu_items: Array<{ allergens: string[] }> | { allergens: string[] } | null
  }

  function unwrap<T>(rel: T | T[] | null | undefined): T | null {
    if (!rel) return null
    return Array.isArray(rel) ? rel[0] ?? null : rel
  }

  const rawItems = (items ?? []) as unknown as RawItem[]

  const tableIds = Array.from(
    new Set(
      rawItems
        .map((i) => unwrap(i.restaurant_orders)?.table_id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  let tableMap = new Map<string, string>()
  if (tableIds.length > 0) {
    const { data: tables } = await supabase
      .from('restaurant_tables')
      .select('id, code')
      .in('id', tableIds)
    tableMap = new Map((tables ?? []).map((t) => [t.id as string, t.code as string]))
  }

  const result = rawItems.map((item) => {
    const ord = unwrap(item.restaurant_orders)
    const menu = unwrap(item.menu_items)
    return {
      id: item.id,
      order_id: item.order_id,
      item_name: item.item_name,
      qty: item.qty,
      notes: item.notes,
      status: item.status,
      course_number: item.course_number,
      station_code: item.station_code,
      fired_at: item.fired_at,
      table_code: ord?.table_id ? tableMap.get(ord.table_id) ?? null : null,
      party_size: ord?.party_size ?? 1,
      allergens: menu?.allergens ?? [],
    }
  })

  return NextResponse.json(result)
}
