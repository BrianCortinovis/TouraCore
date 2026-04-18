import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type { BikeRow, BikeType } from '../types/database'

export interface AvailabilityQuery {
  bikeRentalId: string
  bikeType?: BikeType
  rentalStart: string // ISO timestamptz
  rentalEnd: string
  locationId?: string
  usePublicClient?: boolean
}

export interface AvailabilityResult {
  bikeType: BikeType
  totalBikes: number
  availableBikes: number
  availableBikeIds: string[]
}

/**
 * Compute availability per bike_type for given time window.
 * Excludes bikes currently in reservations overlapping [rentalStart, rentalEnd]
 * and bikes not in 'available' or 'rented' status (e.g. maintenance/damaged).
 */
export async function checkAvailability(
  params: AvailabilityQuery,
): Promise<AvailabilityResult[]> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()

  // 1. Fleet excluding retired/lost/damaged/maintenance
  let bikesQ = supabase
    .from('bikes')
    .select('id, bike_type, status')
    .eq('bike_rental_id', params.bikeRentalId)
    .not('status', 'in', '(retired,lost,damaged,maintenance)')
  if (params.bikeType) bikesQ = bikesQ.eq('bike_type', params.bikeType)
  if (params.locationId) bikesQ = bikesQ.eq('location_id', params.locationId)
  const { data: bikes } = await bikesQ
  const fleet = (bikes as Pick<BikeRow, 'id' | 'bike_type' | 'status'>[] | null) ?? []

  if (fleet.length === 0) return []

  // 2. Find overlapping reservation items
  // Overlap = reservation.rental_start < rentalEnd AND reservation.rental_end > rentalStart
  const { data: reservations } = await supabase
    .from('bike_rental_reservations')
    .select('id, rental_start, rental_end, status')
    .eq('bike_rental_id', params.bikeRentalId)
    .lt('rental_start', params.rentalEnd)
    .gt('rental_end', params.rentalStart)
    .not('status', 'in', '(cancelled,no_show,completed,returned)')
  const reservationIds = ((reservations as Array<{ id: string }> | null) ?? []).map((r) => r.id)

  const occupiedBikeIds = new Set<string>()
  if (reservationIds.length > 0) {
    const { data: items } = await supabase
      .from('bike_rental_reservation_items')
      .select('bike_id')
      .in('reservation_id', reservationIds)
      .not('bike_id', 'is', null)
    for (const it of (items as Array<{ bike_id: string | null }> | null) ?? []) {
      if (it.bike_id) occupiedBikeIds.add(it.bike_id)
    }
  }

  // 3. Aggregate per bike_type
  const byType = new Map<BikeType, { total: number; avail: string[] }>()
  for (const b of fleet) {
    const bucket = byType.get(b.bike_type) ?? { total: 0, avail: [] }
    bucket.total++
    if (!occupiedBikeIds.has(b.id)) bucket.avail.push(b.id)
    byType.set(b.bike_type, bucket)
  }

  const result: AvailabilityResult[] = []
  for (const [type, agg] of byType) {
    result.push({
      bikeType: type,
      totalBikes: agg.total,
      availableBikes: agg.avail.length,
      availableBikeIds: agg.avail,
    })
  }
  return result
}

/**
 * Find next available bike of a type (FIFO rotation by last_maintenance_at ASC)
 * to equalize fleet usage.
 */
export async function findNextAvailableBike(params: {
  bikeRentalId: string
  bikeType: BikeType
  rentalStart: string
  rentalEnd: string
  locationId?: string
}): Promise<string | null> {
  const avail = await checkAvailability({
    bikeRentalId: params.bikeRentalId,
    bikeType: params.bikeType,
    rentalStart: params.rentalStart,
    rentalEnd: params.rentalEnd,
    locationId: params.locationId,
  })
  const bucket = avail.find((a) => a.bikeType === params.bikeType)
  if (!bucket || bucket.availableBikeIds.length === 0) return null

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bikes')
    .select('id, last_maintenance_at')
    .in('id', bucket.availableBikeIds)
    .order('last_maintenance_at', { ascending: true, nullsFirst: true })
    .limit(1)
  const rows = (data as Array<{ id: string }> | null) ?? []
  return rows[0]?.id ?? null
}
