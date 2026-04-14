import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type {
  Reservation,
  Guest,
  Room,
  RoomType,
  RatePlan,
  ReservationStatus,
  BookingSource,
} from '../types/database'

interface ReservationFilters {
  status?: ReservationStatus
  source?: BookingSource
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  limit?: number
}

type ReservationWithRelations = Reservation & {
  guest: Guest
  room: Room | null
  room_type: RoomType
  rate_plan: RatePlan | null
}

const RESERVATION_SELECT = `
  *,
  guest:guests(*),
  room:rooms(*, room_type:room_types(*)),
  room_type:room_types(*),
  rate_plan:rate_plans(*)
`

export async function getReservations(filters: ReservationFilters = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  const { status, source, dateFrom, dateTo, search, page = 1, limit = 25 } = filters

  let query = supabase
    .from('reservations')
    .select(RESERVATION_SELECT, { count: 'exact' })

  if (propId) {
    query = query.eq('entity_id', propId)
  }

  if (status) {
    query = query.eq('status', status)
  }

  if (source) {
    query = query.eq('source', source)
  }

  if (dateFrom) {
    query = query.gte('check_in', dateFrom)
  }

  if (dateTo) {
    query = query.lte('check_out', dateTo)
  }

  if (search) {
    query = query.or(
      `reservation_code.ilike.%${search}%,channel_reservation_id.ilike.%${search}%,guest.first_name.ilike.%${search}%,guest.last_name.ilike.%${search}%`,
      { referencedTable: undefined }
    )
  }

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('check_in', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    reservations: data as ReservationWithRelations[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getReservation(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('id', id)

  if (propId) {
    query = query.eq('entity_id', propId)
  }

  const { data, error } = await query.single()

  if (error) throw error
  return data as ReservationWithRelations
}

export async function getTodayArrivals(propIdOverride?: string) {
  const supabase = await createServerSupabaseClient()
  const propId = propIdOverride ?? (await getCurrentOrg()).property?.id
  const today = new Date().toISOString().split('T')[0]!

  let query = supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('check_in', today)
    .in('status', ['confirmed', 'option'])

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as ReservationWithRelations[]
}

export async function getTodayDepartures(propIdOverride?: string) {
  const supabase = await createServerSupabaseClient()
  const propId = propIdOverride ?? (await getCurrentOrg()).property?.id
  const today = new Date().toISOString().split('T')[0]!

  let query = supabase
    .from('reservations')
    .select(RESERVATION_SELECT)
    .eq('check_out', today)
    .eq('status', 'checked_in')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error
  return data as ReservationWithRelations[]
}
