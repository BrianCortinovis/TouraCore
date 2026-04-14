import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import { addDays, format } from 'date-fns'
import type { PricingRule, PriceSuggestion, DailyStats, RoomType } from '../types/database'

export async function getPricingRules() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('pricing_rules')
    .select(`
      *,
      room_type:room_types(*),
      rate_plan:rate_plans(*)
    `)

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('priority', { ascending: true })

  if (error) throw error
  return data as PricingRule[]
}

export async function getPriceSuggestions(dateFrom?: string, dateTo?: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('price_suggestions')
    .select(`
      *,
      room_type:room_types(*)
    `)

  if (propId) query = query.eq('entity_id', propId)

  if (dateFrom) query = query.gte('date', dateFrom)
  if (dateTo) query = query.lte('date', dateTo)

  const { data, error } = await query.order('date', { ascending: true })

  if (error) throw error
  return data as PriceSuggestion[]
}

export async function getDailyStats(dateFrom: string, dateTo: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('daily_stats')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .gte('date', dateFrom)
    .lte('date', dateTo)
    .order('date', { ascending: true })

  if (error) throw error
  return data as DailyStats[]
}

export async function getOccupancyForecast(days = 30) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  const today = new Date()
  const endDate = addDays(today, days)

  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, room_type_id')
    .eq('entity_id', propId)
    .eq('is_active', true)

  if (roomsError) throw roomsError
  const totalRooms = rooms?.length ?? 0
  if (totalRooms === 0) return []

  const roomsByType: Record<string, number> = {}
  for (const room of rooms ?? []) {
    roomsByType[room.room_type_id] = (roomsByType[room.room_type_id] || 0) + 1
  }

  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('check_in, check_out, room_type_id')
    .eq('entity_id', propId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('check_in', format(endDate, 'yyyy-MM-dd'))
    .gte('check_out', format(today, 'yyyy-MM-dd'))

  if (resError) throw resError

  const forecast: {
    date: string
    totalRooms: number
    occupiedRooms: number
    occupancyPct: number
    occupancyByType: Record<string, { occupied: number; total: number; pct: number }>
  }[] = []

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')

    const occupiedByType: Record<string, number> = {}
    let totalOccupied = 0

    for (const res of reservations ?? []) {
      if (res.check_in <= dateStr && res.check_out > dateStr) {
        totalOccupied++
        occupiedByType[res.room_type_id] = (occupiedByType[res.room_type_id] || 0) + 1
      }
    }

    const occupancyByType: Record<string, { occupied: number; total: number; pct: number }> = {}
    for (const [typeId, total] of Object.entries(roomsByType)) {
      const occupied = Math.min(occupiedByType[typeId] || 0, total)
      occupancyByType[typeId] = {
        occupied,
        total,
        pct: total > 0 ? Math.round((occupied / total) * 100) : 0,
      }
    }

    forecast.push({
      date: dateStr,
      totalRooms,
      occupiedRooms: Math.min(totalOccupied, totalRooms),
      occupancyPct: Math.round((Math.min(totalOccupied, totalRooms) / totalRooms) * 100),
      occupancyByType,
    })
  }

  return forecast
}

export async function getBasePriceForDate(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  propId: string,
  roomTypeId: string,
  dateStr: string,
  roomTypes: RoomType[]
): Promise<number> {
  const roomType = roomTypes.find((rt) => rt.id === roomTypeId)
  const basePrice = roomType?.base_price ?? 100

  const { data: ratePrices } = await supabase
    .from('rate_prices')
    .select('price_per_night, date_from, date_to')
    .eq('room_type_id', roomTypeId)
    .lte('date_from', dateStr)
    .gte('date_to', dateStr)
    .limit(1)

  if (ratePrices && ratePrices.length > 0) {
    return ratePrices[0]!.price_per_night
  }

  const { data: seasons } = await supabase
    .from('seasons')
    .select('price_modifier')
    .eq('entity_id', propId)
    .lte('date_from', dateStr)
    .gte('date_to', dateStr)
    .limit(1)

  if (seasons && seasons.length > 0) {
    return Math.round(basePrice * seasons[0]!.price_modifier)
  }

  return basePrice
}
