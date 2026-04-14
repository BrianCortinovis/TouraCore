import { createServerSupabaseClient } from '@touracore/db'
import type { SecurityDeposit } from '../types/database'

export async function getSecurityDeposits(propId: string, filters: { status?: string } = {}) {
  const supabase = await createServerSupabaseClient()
  const { status } = filters

  let query = supabase
    .from('security_deposits')
    .select('*')
    .eq('entity_id', propId)

  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SecurityDeposit[]
}

export async function getDepositByReservation(propId: string, reservationId: string): Promise<SecurityDeposit | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('security_deposits')
    .select('*')
    .eq('entity_id', propId)
    .eq('reservation_id', reservationId)
    .maybeSingle()
  if (error) throw error
  return data as SecurityDeposit | null
}
