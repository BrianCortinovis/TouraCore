import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type { BikeRow, BikeStatus, BikeType, ConditionGrade } from '../types/database'

export interface BikeListFilters {
  bikeRentalId: string
  status?: BikeStatus | BikeStatus[]
  bikeType?: BikeType | BikeType[]
  locationId?: string
  isElectric?: boolean
  conditionGrade?: ConditionGrade | ConditionGrade[]
  search?: string
  usePublicClient?: boolean
}

export async function listBikes(filters: BikeListFilters): Promise<BikeRow[]> {
  const supabase = filters.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  let q = supabase
    .from('bikes')
    .select('*')
    .eq('bike_rental_id', filters.bikeRentalId)
    .order('name', { ascending: true })

  if (filters.status) {
    if (Array.isArray(filters.status)) q = q.in('status', filters.status)
    else q = q.eq('status', filters.status)
  }
  if (filters.bikeType) {
    if (Array.isArray(filters.bikeType)) q = q.in('bike_type', filters.bikeType)
    else q = q.eq('bike_type', filters.bikeType)
  }
  if (filters.locationId) q = q.eq('location_id', filters.locationId)
  if (typeof filters.isElectric === 'boolean') q = q.eq('is_electric', filters.isElectric)
  if (filters.conditionGrade) {
    if (Array.isArray(filters.conditionGrade)) q = q.in('condition_grade', filters.conditionGrade)
    else q = q.eq('condition_grade', filters.conditionGrade)
  }
  if (filters.search) {
    q = q.or(
      `name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%`,
    )
  }

  const { data } = await q
  return (data as BikeRow[] | null) ?? []
}

export async function getBike(params: { id: string; usePublicClient?: boolean }): Promise<BikeRow | null> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { data } = await supabase.from('bikes').select('*').eq('id', params.id).maybeSingle()
  return (data as BikeRow | null) ?? null
}

export async function getBikeByQR(params: { qrCode: string }): Promise<BikeRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('bikes').select('*').eq('qr_code', params.qrCode).maybeSingle()
  return (data as BikeRow | null) ?? null
}

export async function createBike(params: {
  input: Omit<BikeRow, 'id' | 'created_at' | 'updated_at' | 'qr_code'> & { qr_code?: string | null }
}): Promise<BikeRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.from('bikes').insert(params.input).select('*').maybeSingle()
  return (data as BikeRow | null) ?? null
}

export async function updateBike(params: { id: string; patch: Partial<BikeRow> }): Promise<BikeRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bikes')
    .update(params.patch)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()
  return (data as BikeRow | null) ?? null
}

export async function updateBikeStatus(params: {
  id: string
  status: BikeStatus
  maintenance_notes?: string | null
}): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const patch: Partial<BikeRow> = { status: params.status }
  if (params.maintenance_notes !== undefined) patch.maintenance_notes = params.maintenance_notes
  const { error } = await supabase.from('bikes').update(patch).eq('id', params.id)
  return !error
}

export async function deleteBike(params: { id: string }): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('bikes').delete().eq('id', params.id)
  return !error
}

export interface FleetStats {
  total: number
  available: number
  rented: number
  maintenance: number
  damaged: number
  charging: number
  retired: number
  byType: Record<string, number>
  electricCount: number
  utilizationPct: number
}

export async function getFleetStats(params: { bikeRentalId: string }): Promise<FleetStats> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bikes')
    .select('status, bike_type, is_electric')
    .eq('bike_rental_id', params.bikeRentalId)

  const rows = (data as Array<Pick<BikeRow, 'status' | 'bike_type' | 'is_electric'>> | null) ?? []
  const stats: FleetStats = {
    total: rows.length,
    available: 0,
    rented: 0,
    maintenance: 0,
    damaged: 0,
    charging: 0,
    retired: 0,
    byType: {},
    electricCount: 0,
    utilizationPct: 0,
  }
  for (const r of rows) {
    if (r.status === 'available') stats.available++
    else if (r.status === 'rented') stats.rented++
    else if (r.status === 'maintenance') stats.maintenance++
    else if (r.status === 'damaged') stats.damaged++
    else if (r.status === 'charging') stats.charging++
    else if (r.status === 'retired' || r.status === 'lost') stats.retired++
    stats.byType[r.bike_type] = (stats.byType[r.bike_type] ?? 0) + 1
    if (r.is_electric) stats.electricCount++
  }
  const active = stats.total - stats.retired
  stats.utilizationPct = active > 0 ? Math.round((stats.rented / active) * 100) : 0
  return stats
}
