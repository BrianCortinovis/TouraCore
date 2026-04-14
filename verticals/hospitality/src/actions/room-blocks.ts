'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess, requireCurrentEntity } from '../auth/access'
import { syncAvailabilityForOrg, syncRatesForOrg } from '../stubs/integrations/channel-manager'
import { createServerSupabaseClient } from '@touracore/db'
import type { RoomBlockType } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateRoomBlockData {
  entity_id: string
  room_id: string
  block_type: RoomBlockType
  date_from: string
  date_to: string
  reason?: string | null
  created_by?: string | null
}

export interface UpdateRoomBlockData {
  room_id?: string
  block_type?: RoomBlockType
  date_from?: string
  date_to?: string
  reason?: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BLOCK_PATHS = ['/room-blocks', '/planning', '/rooms', '/dashboard', '/rates']

function revalidateBlockPaths() {
  for (const p of BLOCK_PATHS) {
    revalidatePath(p)
  }
}

/**
 * After creating/updating/deleting a block, recalculate whether all rooms
 * of the affected room_type are blocked for the given date range.
 * If ALL rooms of that type are blocked, set stop_sell=true on overlapping
 * rate_prices. If not all blocked, set stop_sell=false.
 *
 * This ensures the Channel Manager knows the room type is unavailable.
 */
async function syncStopSell(
  organizationId: string,
  roomId: string,
  dateFrom: string,
  dateTo: string
) {
  const supabase = await createServerSupabaseClient()

  // 1. Get the room_type_id for this room
  const { data: room } = await supabase
    .from('rooms')
    .select('room_type_id')
    .eq('id', roomId)
    .eq('entity_id', organizationId)
    .single()

  if (!room) return

  const roomTypeId = room.room_type_id

  // 2. Count total active rooms of this type
  const { count: totalRooms } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', organizationId)
    .eq('room_type_id', roomTypeId)
    .eq('is_active', true)

  if (!totalRooms || totalRooms === 0) return

  // 3. Count rooms of this type that have a block overlapping the date range
  const { data: blockedRoomIds } = await supabase
    .from('room_blocks')
    .select('room_id')
    .lte('date_from', dateTo)
    .gte('date_to', dateFrom)
    .in(
      'room_id',
      // Get all room IDs of this type
      (await supabase
        .from('rooms')
        .select('id')
        .eq('entity_id', organizationId)
        .eq('room_type_id', roomTypeId)
        .eq('is_active', true)
      ).data?.map((r) => r.id) ?? []
    )

  // Count unique blocked rooms
  const uniqueBlockedRooms = new Set(blockedRoomIds?.map((b) => b.room_id) ?? [])
  const allBlocked = uniqueBlockedRooms.size >= totalRooms

  // 4. Update stop_sell on rate_prices that overlap with this date range
  const { data: overlappingPrices } = await supabase
    .from('rate_prices')
    .select('id')
    .eq('room_type_id', roomTypeId)
    .lte('date_from', dateTo)
    .gte('date_to', dateFrom)

  if (overlappingPrices && overlappingPrices.length > 0) {
    const priceIds = overlappingPrices.map((p) => p.id)
    await supabase
      .from('rate_prices')
      .update({ stop_sell: allBlocked, updated_at: new Date().toISOString() })
      .in('id', priceIds)
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function createRoomBlock(data: CreateRoomBlockData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.room_id) throw new Error('room_id is required')
  if (!data.date_from) throw new Error('date_from is required')
  if (!data.date_to) throw new Error('date_to is required')
  if (data.date_to < data.date_from) throw new Error('date_to must be >= date_from')

  await assertCurrentEntityAccess(data.entity_id)

  const supabase = await createServerSupabaseClient()
  const { data: room } = await supabase
    .from('rooms')
    .select('id')
    .eq('id', data.room_id)
    .eq('entity_id', data.entity_id)
    .maybeSingle()

  if (!room) {
    throw new Error('Room not found in this organization')
  }

  const { data: block, error } = await supabase
    .from('room_blocks')
    .insert({
      entity_id: data.entity_id,
      room_id: data.room_id,
      block_type: data.block_type,
      date_from: data.date_from,
      date_to: data.date_to,
      reason: data.reason ?? null,
      created_by: data.created_by ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create room block: ${error.message}`)

  // Sync stop_sell on rate_prices
  await syncStopSell(data.entity_id, data.room_id, data.date_from, data.date_to)
  syncAvailabilityForOrg(data.entity_id).catch((err) =>
    console.error('[RoomBlocks] Errore sync availability post-create:', err)
  )
  syncRatesForOrg(data.entity_id).catch((err) =>
    console.error('[RoomBlocks] Errore sync rates post-create:', err)
  )

  revalidateBlockPaths()
  return block
}

export async function updateRoomBlock(id: string, data: UpdateRoomBlockData) {
  if (!id) throw new Error('Block id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await requireCurrentEntity()

  // Fetch existing block to know the old dates/room for re-sync
  const { data: oldBlock } = await supabase
    .from('room_blocks')
    .select('entity_id, room_id, date_from, date_to')
    .eq('id', id)
    .eq('entity_id', property.id)
    .single()

  const { data: block, error } = await supabase
    .from('room_blocks')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('entity_id', property.id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update room block: ${error.message}`)

  // Re-sync stop_sell for old dates (might need to un-stop-sell)
  if (oldBlock) {
    await syncStopSell(oldBlock.entity_id, oldBlock.room_id, oldBlock.date_from, oldBlock.date_to)
  }

  // Sync stop_sell for new dates
  if (block) {
    await syncStopSell(
      block.entity_id,
      data.room_id ?? block.room_id,
      data.date_from ?? block.date_from,
      data.date_to ?? block.date_to
    )
    syncAvailabilityForOrg(block.entity_id).catch((err) =>
      console.error('[RoomBlocks] Errore sync availability post-update:', err)
    )
    syncRatesForOrg(block.entity_id).catch((err) =>
      console.error('[RoomBlocks] Errore sync rates post-update:', err)
    )
  }

  revalidateBlockPaths()
  return block
}

export async function deleteRoomBlock(id: string) {
  if (!id) throw new Error('Block id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await requireCurrentEntity()

  // Fetch block before deleting to know what to re-sync
  const { data: block } = await supabase
    .from('room_blocks')
    .select('entity_id, room_id, date_from, date_to')
    .eq('id', id)
    .eq('entity_id', property.id)
    .single()

  const { error } = await supabase
    .from('room_blocks')
    .delete()
    .eq('id', id)
    .eq('entity_id', property.id)

  if (error) throw new Error(`Failed to delete room block: ${error.message}`)

  // Re-sync stop_sell (will likely set to false since block is gone)
  if (block) {
    await syncStopSell(block.entity_id, block.room_id, block.date_from, block.date_to)
    syncAvailabilityForOrg(block.entity_id).catch((err) =>
      console.error('[RoomBlocks] Errore sync availability post-delete:', err)
    )
    syncRatesForOrg(block.entity_id).catch((err) =>
      console.error('[RoomBlocks] Errore sync rates post-delete:', err)
    )
  }

  revalidateBlockPaths()
}
