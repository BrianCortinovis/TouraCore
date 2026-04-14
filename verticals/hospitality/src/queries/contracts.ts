import { createServerSupabaseClient } from '@touracore/db'
import type { RentalContract } from '../types/database'

export async function getContracts(propId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
  const supabase = await createServerSupabaseClient()
  const { status, page = 1, limit = 25 } = filters

  let query = supabase
    .from('rental_contracts')
    .select('*', { count: 'exact' })
    .eq('entity_id', propId)

  if (status) query = query.eq('status', status)

  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await query
    .order('contract_date', { ascending: false })
    .range(from, to)

  if (error) throw error

  return {
    contracts: (data ?? []) as RentalContract[],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  }
}

export async function getContractById(propId: string, contractId: string): Promise<RentalContract | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rental_contracts')
    .select('*')
    .eq('entity_id', propId)
    .eq('id', contractId)
    .maybeSingle()
  if (error) throw error
  return data as RentalContract | null
}

export async function getContractByReservation(propId: string, reservationId: string): Promise<RentalContract | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('rental_contracts')
    .select('*')
    .eq('entity_id', propId)
    .eq('reservation_id', reservationId)
    .maybeSingle()
  if (error) throw error
  return data as RentalContract | null
}
