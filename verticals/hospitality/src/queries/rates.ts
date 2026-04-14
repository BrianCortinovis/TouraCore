import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { RatePlan, Season, RatePrice } from '../types/database'

export async function getRatePlans() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('rate_plans')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return data as RatePlan[]
}

export async function getSeasons() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('seasons')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('date_from', { ascending: true })

  if (error) throw error
  return data as Season[]
}

export async function getRatePrices(ratePlanId?: string, roomTypeId?: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('rate_prices')
    .select(`
      *,
      rate_plan:rate_plans(id, name, code),
      room_type:room_types(id, name, code)
    `)

  if (propId) query = query.eq('entity_id', propId)

  if (ratePlanId) {
    query = query.eq('rate_plan_id', ratePlanId)
  }

  if (roomTypeId) {
    query = query.eq('room_type_id', roomTypeId)
  }

  const { data, error } = await query
    .order('date_from', { ascending: true })

  if (error) throw error
  return data as (RatePrice & {
    rate_plan: Pick<RatePlan, 'id' | 'name' | 'code'>
    room_type: { id: string; name: string; code: string | null }
  })[]
}
