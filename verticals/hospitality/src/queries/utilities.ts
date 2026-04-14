import { createServerSupabaseClient } from '@touracore/db'
import type { UtilityCost } from '../types/database'

export async function getUtilityCosts(propId: string, filters: { periodFrom?: string; periodTo?: string } = {}) {
  const supabase = await createServerSupabaseClient()
  const { periodFrom, periodTo } = filters

  let query = supabase
    .from('utility_costs')
    .select('*')
    .eq('entity_id', propId)

  if (periodFrom) query = query.gte('period_from', periodFrom)
  if (periodTo) query = query.lte('period_to', periodTo)

  const { data, error } = await query.order('period_from', { ascending: false })
  if (error) throw error
  return (data ?? []) as UtilityCost[]
}

export async function getUtilitySummary(propId: string, year: number) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('utility_costs')
    .select('utility_type, amount')
    .eq('entity_id', propId)
    .gte('period_from', `${year}-01-01`)
    .lte('period_to', `${year}-12-31`)

  if (error) throw error

  const byType = new Map<string, number>()
  let total = 0
  for (const row of data ?? []) {
    const current = byType.get(row.utility_type) ?? 0
    byType.set(row.utility_type, current + Number(row.amount))
    total += Number(row.amount)
  }

  return {
    byType: Object.fromEntries(byType),
    total,
    count: (data ?? []).length,
  }
}
