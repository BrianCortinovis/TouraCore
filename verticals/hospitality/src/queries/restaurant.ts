import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { RestaurantOrder, RestaurantTable, RestaurantService } from '../types/database'

// --- Restaurant Services ---

export async function getRestaurantServices() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('restaurant_services')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) throw error
  return data as RestaurantService[]
}

// --- Restaurant Tables ---

export async function getRestaurantTables() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('restaurant_tables')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .eq('is_active', true)
    .order('table_number', { ascending: true })

  if (error) throw error
  return data as RestaurantTable[]
}

// --- Restaurant Orders ---

export async function getTodayOrders() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  const today = new Date().toISOString().split('T')[0]!

  let query = supabase
    .from('restaurant_orders')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query
    .eq('order_date', today)
    .order('order_time', { ascending: false })

  if (error) throw error
  return data as RestaurantOrder[]
}

export async function getRestaurantOrders(opts: { limit?: number; status?: string; dateFrom?: string; dateTo?: string } = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('restaurant_orders')
    .select('*', { count: 'exact' })

  if (propId) query = query.eq('entity_id', propId)
  if (opts.status) query = query.eq('status', opts.status)
  if (opts.dateFrom) query = query.gte('order_date', opts.dateFrom)
  if (opts.dateTo) query = query.lte('order_date', opts.dateTo)

  const { data, error, count } = await query
    .order('order_date', { ascending: false })
    .order('order_time', { ascending: false })
    .limit(opts.limit ?? 50)

  if (error) throw error
  return { orders: data as RestaurantOrder[], total: count ?? 0 }
}
