'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { RoomBlock, Room, RoomType } from '../types/database'

export type RoomBlockWithRoom = RoomBlock & {
  room: Room & { room_type: RoomType }
}

export async function getRoomBlocks(): Promise<RoomBlockWithRoom[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('room_blocks')
    .select('*, room:rooms(*, room_type:room_types(*))')

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('date_from', { ascending: false })

  if (error) {
    console.error('Failed to fetch room blocks:', error.message)
    return []
  }

  return (data ?? []) as unknown as RoomBlockWithRoom[]
}

export async function getRoomBlocksForRange(
  dateFrom: string,
  dateTo: string
): Promise<RoomBlockWithRoom[]> {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id

  let query = supabase
    .from('room_blocks')
    .select('*, room:rooms(*, room_type:room_types(*))')
    .lte('date_from', dateTo)
    .gte('date_to', dateFrom)

  if (propId) query = query.eq('entity_id', propId)

  const { data, error } = await query.order('date_from', { ascending: true })

  if (error) {
    console.error('Failed to fetch room blocks for range:', error.message)
    return []
  }

  return (data ?? []) as unknown as RoomBlockWithRoom[]
}
