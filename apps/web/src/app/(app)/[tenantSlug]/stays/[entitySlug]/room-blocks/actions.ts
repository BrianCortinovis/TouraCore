'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import {
  createRoomBlock,
  updateRoomBlock,
  deleteRoomBlock,
} from '@touracore/hospitality/src/actions/room-blocks'
import type { UpdateRoomBlockData } from '@touracore/hospitality/src/actions/room-blocks'
import type { RoomBlockType } from '@touracore/hospitality/src/types/database'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function loadBlocksAction(dateFrom?: string, dateTo?: string): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    let query = supabase
      .from('room_blocks')
      .select('*, room:rooms(id, name, room_number, room_type:room_types(id, name))')
      .eq('entity_id', property.id)

    if (dateFrom) query = query.gte('date_to', dateFrom)
    if (dateTo) query = query.lte('date_from', dateTo)

    const { data, error } = await query.order('date_from', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data: { blocks: data ?? [] } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function loadRoomsAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data, error } = await supabase
      .from('rooms')
      .select('id, name, room_number, is_active, room_type:room_types(id, name)')
      .eq('entity_id', property.id)
      .eq('is_active', true)
      .order('room_number')

    if (error) return { success: false, error: error.message }
    return { success: true, data: { rooms: data ?? [] } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function createBlockAction(data: {
  room_id: string
  block_type: string
  date_from: string
  date_to: string
  reason?: string
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const block = await createRoomBlock({
      entity_id: property.id,
      room_id: data.room_id,
      block_type: data.block_type as RoomBlockType,
      date_from: data.date_from,
      date_to: data.date_to,
      reason: data.reason ?? null,
    })
    return { success: true, data: { block } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateBlockAction(
  id: string,
  data: {
    room_id?: string
    block_type?: string
    date_from?: string
    date_to?: string
    reason?: string
  },
): Promise<ActionResult> {
  try {
    const update: UpdateRoomBlockData = {}
    if (data.room_id) update.room_id = data.room_id
    if (data.block_type) update.block_type = data.block_type as RoomBlockType
    if (data.date_from) update.date_from = data.date_from
    if (data.date_to) update.date_to = data.date_to
    if (data.reason !== undefined) update.reason = data.reason || null

    const block = await updateRoomBlock(id, update)
    return { success: true, data: { block } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  try {
    await deleteRoomBlock(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function bulkCreateBlocksAction(data: {
  room_ids: string[]
  block_type: string
  date_from: string
  date_to: string
  reason?: string
}): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const created: string[] = []
    const errors: string[] = []

    for (const roomId of data.room_ids) {
      try {
        await createRoomBlock({
          entity_id: property.id,
          room_id: roomId,
          block_type: data.block_type as RoomBlockType,
          date_from: data.date_from,
          date_to: data.date_to,
          reason: data.reason ?? null,
        })
        created.push(roomId)
      } catch (err) {
        errors.push(`${roomId}: ${err instanceof Error ? err.message : 'Errore'}`)
      }
    }

    return {
      success: true,
      data: { created: created.length, errors },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function bulkDeleteBlocksAction(ids: string[]): Promise<ActionResult> {
  try {
    const deleted: string[] = []
    const errors: string[] = []

    for (const id of ids) {
      try {
        await deleteRoomBlock(id)
        deleted.push(id)
      } catch (err) {
        errors.push(`${id}: ${err instanceof Error ? err.message : 'Errore'}`)
      }
    }

    return {
      success: true,
      data: { deleted: deleted.length, errors },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
