import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type { BikeLocationRow } from '../types/database'

export async function listLocations(params: {
  bikeRentalId: string
  usePublicClient?: boolean
  activeOnly?: boolean
}): Promise<BikeLocationRow[]> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const query = supabase
    .from('bike_locations')
    .select('*')
    .eq('bike_rental_id', params.bikeRentalId)
    .order('display_order', { ascending: true })
  if (params.activeOnly) query.eq('active', true)
  const { data } = await query
  return (data as BikeLocationRow[] | null) ?? []
}

export async function createLocation(params: {
  input: Omit<BikeLocationRow, 'id' | 'created_at' | 'updated_at'>
}): Promise<BikeLocationRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_locations')
    .insert(params.input)
    .select('*')
    .maybeSingle()
  return (data as BikeLocationRow | null) ?? null
}

export async function updateLocation(params: {
  id: string
  patch: Partial<BikeLocationRow>
}): Promise<BikeLocationRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_locations')
    .update(params.patch)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()
  return (data as BikeLocationRow | null) ?? null
}

export async function deleteLocation(params: { id: string }): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.from('bike_locations').delete().eq('id', params.id)
  return !error
}
