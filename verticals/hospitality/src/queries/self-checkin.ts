import { createServerSupabaseClient } from '@touracore/db'
import type { SelfCheckinConfig } from '../types/database'

export async function getSelfCheckinConfigs(propId: string): Promise<SelfCheckinConfig[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('self_checkin_configs')
    .select('*')
    .eq('entity_id', propId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as SelfCheckinConfig[]
}

export async function getSelfCheckinConfigByRoom(propId: string, roomId: string): Promise<SelfCheckinConfig | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('self_checkin_configs')
    .select('*')
    .eq('entity_id', propId)
    .eq('room_id', roomId)
    .maybeSingle()
  if (error) throw error
  return data as SelfCheckinConfig | null
}
