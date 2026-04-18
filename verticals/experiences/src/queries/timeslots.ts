import { createServerSupabaseClient } from '@touracore/db'
import type { ExperienceTimeslot } from '../types/database'

export async function listTimeslotsForProduct(
  productId: string,
  opts: { from?: string; to?: string; onlyOpen?: boolean } = {}
): Promise<ExperienceTimeslot[]> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('experience_timeslots')
    .select('*')
    .eq('product_id', productId)
    .order('start_at', { ascending: true })

  if (opts.from) q = q.gte('start_at', opts.from)
  if (opts.to) q = q.lte('start_at', opts.to)
  if (opts.onlyOpen) q = q.eq('status', 'open')

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as unknown as ExperienceTimeslot[]
}

export async function tryBookTimeslot(timeslotId: string, seats: number): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('experience_timeslot_try_book', {
    p_timeslot_id: timeslotId,
    p_seats: seats,
  })
  if (error) throw error
  return data === true
}
