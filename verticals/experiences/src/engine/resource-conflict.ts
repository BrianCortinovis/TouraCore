import { createServerSupabaseClient } from '@touracore/db'

export async function detectResourceConflict(
  resourceId: string,
  startAt: string,
  endAt: string,
  excludeTimeslotId?: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('experience_resource_has_conflict', {
    p_resource_id: resourceId,
    p_start: startAt,
    p_end: endAt,
    p_exclude_timeslot: excludeTimeslotId ?? null,
  })
  if (error) throw error
  return data === true
}
