import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type { BikeRentalRow } from '../types/database'

export async function getBikeRentalById(params: {
  id: string
  usePublicClient?: boolean
}): Promise<BikeRentalRow | null> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_rentals')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  return (data as BikeRentalRow | null) ?? null
}

export async function listBikeRentalsByTenant(params: {
  tenantId: string
}): Promise<BikeRentalRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_rentals')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
  return (data as BikeRentalRow[] | null) ?? []
}

export async function updateBikeRental(params: {
  id: string
  patch: Partial<BikeRentalRow>
}): Promise<BikeRentalRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('bike_rentals')
    .update(params.patch)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()
  return (data as BikeRentalRow | null) ?? null
}
