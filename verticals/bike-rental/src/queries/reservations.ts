import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type {
  BikeRentalReservationRow,
  BikeRentalReservationItemRow,
  BikeRentalReservationAddonRow,
  BikeRentalReservationStatus,
} from '../types/database'

export interface ReservationFilters {
  bikeRentalId: string
  status?: BikeRentalReservationStatus | BikeRentalReservationStatus[]
  fromDate?: string
  toDate?: string
  search?: string
  source?: string
  usePublicClient?: boolean
  limit?: number
  offset?: number
}

export async function listReservations(
  filters: ReservationFilters,
): Promise<BikeRentalReservationRow[]> {
  const supabase = filters.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  let q = supabase
    .from('bike_rental_reservations')
    .select('*')
    .eq('bike_rental_id', filters.bikeRentalId)
    .order('rental_start', { ascending: false })

  if (filters.status) {
    if (Array.isArray(filters.status)) q = q.in('status', filters.status)
    else q = q.eq('status', filters.status)
  }
  if (filters.fromDate) q = q.gte('rental_start', filters.fromDate)
  if (filters.toDate) q = q.lte('rental_end', filters.toDate)
  if (filters.source) q = q.eq('source', filters.source)
  if (filters.search) {
    q = q.or(
      `reference_code.ilike.%${filters.search}%,guest_name.ilike.%${filters.search}%,guest_email.ilike.%${filters.search}%`,
    )
  }
  if (filters.limit) q = q.limit(filters.limit)
  if (filters.offset) q = q.range(filters.offset, (filters.offset ?? 0) + (filters.limit ?? 50) - 1)

  const { data } = await q
  return (data as BikeRentalReservationRow[] | null) ?? []
}

export interface ReservationWithRelations {
  reservation: BikeRentalReservationRow
  items: BikeRentalReservationItemRow[]
  addons: BikeRentalReservationAddonRow[]
}

export async function getReservationFull(params: {
  id: string
  usePublicClient?: boolean
}): Promise<ReservationWithRelations | null> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { data: reservation } = await supabase
    .from('bike_rental_reservations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!reservation) return null

  const [itemsRes, addonsRes] = await Promise.all([
    supabase.from('bike_rental_reservation_items').select('*').eq('reservation_id', params.id),
    supabase.from('bike_rental_reservation_addons').select('*').eq('reservation_id', params.id),
  ])

  return {
    reservation: reservation as BikeRentalReservationRow,
    items: (itemsRes.data as BikeRentalReservationItemRow[] | null) ?? [],
    addons: (addonsRes.data as BikeRentalReservationAddonRow[] | null) ?? [],
  }
}

export async function updateReservationStatus(params: {
  id: string
  status: BikeRentalReservationStatus
  actualPickupAt?: string
  actualReturnAt?: string
}): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const patch: Partial<BikeRentalReservationRow> = { status: params.status }
  if (params.actualPickupAt) patch.actual_pickup_at = params.actualPickupAt
  if (params.actualReturnAt) patch.actual_return_at = params.actualReturnAt
  const { error } = await supabase
    .from('bike_rental_reservations')
    .update(patch)
    .eq('id', params.id)
  return !error
}

export interface ReservationStats {
  total: number
  byStatus: Record<BikeRentalReservationStatus, number>
  revenueTotal: number
  revenuePaid: number
  avgDurationHours: number
  upcomingCount: number
  activeCount: number
}

export async function getReservationStats(params: {
  bikeRentalId: string
  fromDate?: string
  toDate?: string
}): Promise<ReservationStats> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('bike_rental_reservations')
    .select('status, total_amount, paid_amount, duration_hours, rental_start')
    .eq('bike_rental_id', params.bikeRentalId)
  if (params.fromDate) q = q.gte('rental_start', params.fromDate)
  if (params.toDate) q = q.lte('rental_end', params.toDate)
  const { data } = await q
  const rows =
    (data as Array<
      Pick<
        BikeRentalReservationRow,
        'status' | 'total_amount' | 'paid_amount' | 'duration_hours' | 'rental_start'
      >
    > | null) ?? []

  const stats: ReservationStats = {
    total: rows.length,
    byStatus: {
      pending: 0,
      confirmed: 0,
      checked_in: 0,
      active: 0,
      returned: 0,
      cancelled: 0,
      no_show: 0,
      late: 0,
      completed: 0,
    },
    revenueTotal: 0,
    revenuePaid: 0,
    avgDurationHours: 0,
    upcomingCount: 0,
    activeCount: 0,
  }
  const now = new Date().toISOString()
  let totalDuration = 0
  for (const r of rows) {
    stats.byStatus[r.status]++
    stats.revenueTotal += Number(r.total_amount) || 0
    stats.revenuePaid += Number(r.paid_amount) || 0
    totalDuration += Number(r.duration_hours) || 0
    if (r.rental_start > now && (r.status === 'pending' || r.status === 'confirmed')) {
      stats.upcomingCount++
    }
    if (r.status === 'active' || r.status === 'checked_in') stats.activeCount++
  }
  stats.avgDurationHours = stats.total > 0 ? Math.round((totalDuration / stats.total) * 10) / 10 : 0
  return stats
}
