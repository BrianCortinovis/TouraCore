import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type { BikeTypeRow, BikeRentalAddonRow, BikePricingRuleRow } from '../types/database'

export async function listBikeTypes(params: {
  bikeRentalId: string
  activeOnly?: boolean
  usePublicClient?: boolean
}): Promise<BikeTypeRow[]> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  let q = supabase
    .from('bike_types')
    .select('*')
    .eq('bike_rental_id', params.bikeRentalId)
    .order('display_order', { ascending: true })
  if (params.activeOnly) q = q.eq('active', true)
  const { data } = await q
  return (data as BikeTypeRow[] | null) ?? []
}

export async function getBikeType(params: {
  id: string
  usePublicClient?: boolean
}): Promise<BikeTypeRow | null> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { data } = await supabase.from('bike_types').select('*').eq('id', params.id).maybeSingle()
  return (data as BikeTypeRow | null) ?? null
}

export async function listAddons(params: {
  bikeRentalId: string
  activeOnly?: boolean
  usePublicClient?: boolean
}): Promise<BikeRentalAddonRow[]> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  let q = supabase
    .from('bike_rental_addons')
    .select('*')
    .eq('bike_rental_id', params.bikeRentalId)
    .order('display_order', { ascending: true })
  if (params.activeOnly) q = q.eq('active', true)
  const { data } = await q
  return (data as BikeRentalAddonRow[] | null) ?? []
}

export async function listPricingRules(params: {
  bikeRentalId: string
  activeOnly?: boolean
  usePublicClient?: boolean
}): Promise<BikePricingRuleRow[]> {
  const supabase = params.usePublicClient
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  let q = supabase
    .from('bike_rental_pricing_rules')
    .select('*')
    .eq('bike_rental_id', params.bikeRentalId)
    .order('priority', { ascending: false })
  if (params.activeOnly) q = q.eq('active', true)
  const { data } = await q
  return (data as BikePricingRuleRow[] | null) ?? []
}
