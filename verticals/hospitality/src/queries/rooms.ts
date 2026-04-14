import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { Room, RoomType, RoomAvailability } from '../types/database'

export async function getRooms() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('rooms')
    .select(`
      *,
      room_type:room_types(*)
    `)

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('room_number', { ascending: true })

  if (error) throw error
  return data as (Room & { room_type: RoomType })[]
}

export async function getRoomTypes() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('room_types')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) throw error
  return data as RoomType[]
}

export async function getRoomAvailability() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('v_room_availability')
    .select('*')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query

  if (error) throw error
  return data as RoomAvailability[]
}
