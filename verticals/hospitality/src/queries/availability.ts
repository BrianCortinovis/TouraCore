import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type { RoomType, RatePrice, Season } from '../types/database'

export interface AvailabilityResult {
  roomType: RoomType
  totalRooms: number
  availableRooms: number
  ratePrice: RatePrice | null
  season: Season | null
}

export async function checkAvailability(params: {
  entityId: string
  checkIn: string
  checkOut: string
  guests: number
  ratePlanId?: string
  /** Usa service role per public booking (no auth) */
  usePublicClient?: boolean
}): Promise<AvailabilityResult[]> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { entityId, checkIn, checkOut, guests, ratePlanId } = params

  const { data: roomTypes, error: rtErr } = await supabase
    .from('room_types')
    .select('*')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .gte('max_occupancy', guests)
    .order('sort_order', { ascending: true })

  if (rtErr || !roomTypes) return []

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_type_id, base_price')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .in('status', ['available', 'cleaning'])

  const { data: reservations } = await supabase
    .from('reservations')
    .select('room_type_id, room_id')
    .eq('entity_id', entityId)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)

  const { data: blocks } = await supabase
    .from('room_blocks')
    .select('room_id')
    .eq('entity_id', entityId)
    .lt('date_from', checkOut)
    .gt('date_to', checkIn)

  const blockedRoomIds = new Set((blocks ?? []).map((b) => b.room_id))
  const reservedRoomIds = new Set(
    (reservations ?? []).filter((r) => r.room_id).map((r) => r.room_id as string)
  )

  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .eq('entity_id', entityId)
    .lte('date_from', checkIn)
    .gte('date_to', checkOut)
    .order('date_from', { ascending: false })
    .limit(1)

  const activeSeason = (seasons && seasons.length > 0 ? seasons[0] : null) as Season | null

  const ratePlanQuery = supabase
    .from('rate_plans')
    .select('id')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .eq('is_public', true)

  if (ratePlanId) {
    ratePlanQuery.eq('id', ratePlanId)
  } else {
    ratePlanQuery.eq('rate_type', 'standard')
  }

  const { data: publicPlans } = await ratePlanQuery
    .order('sort_order', { ascending: true })
    .limit(1)

  const publicPlanId = publicPlans?.[0]?.id

  const results: AvailabilityResult[] = []

  for (const rt of roomTypes as RoomType[]) {
    const typeRooms = (rooms ?? []).filter((r) => r.room_type_id === rt.id)
    // Fallback: se room_type non ha base_price ma le rooms sì, usa la media
    if (!rt.base_price || Number(rt.base_price) === 0) {
      const prices = typeRooms
        .map((r) => Number((r as { base_price?: number | string | null }).base_price ?? 0))
        .filter((p) => p > 0)
      if (prices.length > 0) {
        rt.base_price = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      }
    }
    const freeRooms = typeRooms.filter(
      (r) => !blockedRoomIds.has(r.id) && !reservedRoomIds.has(r.id)
    )

    const reservedByType = (reservations ?? [])
      .filter((r) => r.room_type_id === rt.id && !r.room_id)
      .length

    const available = Math.max(0, freeRooms.length - reservedByType)

    let ratePrice: RatePrice | null = null
    if (publicPlanId) {
      const { data: rp } = await supabase
        .from('rate_prices')
        .select('*')
        .eq('rate_plan_id', publicPlanId)
        .eq('room_type_id', rt.id)
        .lte('date_from', checkIn)
        .gte('date_to', checkOut)
        .limit(1)
        .maybeSingle()

      ratePrice = (rp as RatePrice) ?? null
    }

    results.push({
      roomType: rt,
      totalRooms: typeRooms.length,
      availableRooms: available,
      ratePrice,
      season: activeSeason,
    })
  }

  return results
}

export async function getPropertyBySlug(slug: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) return null
  return data
}
