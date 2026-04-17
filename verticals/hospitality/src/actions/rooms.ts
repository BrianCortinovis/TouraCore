'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { syncAvailabilityForOrg, syncRatesForOrg } from '../stubs/integrations/channel-manager'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type { RoomStatus, RoomCategory, Json } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateRoomData {
  entity_id: string
  room_type_id?: string
  room_number: string
  name?: string | null
  floor?: number | null
  building?: string | null
  status?: RoomStatus
  is_active?: boolean
  notes?: string | null
  features?: Json
  description?: string | null
  base_price?: number | null
  base_occupancy?: number | null
  max_occupancy?: number | null
  max_children?: number | null
  size_sqm?: number | null
  bed_configuration?: string | null
  amenities?: Json
  photos?: string[]
}

export interface UpdateRoomData {
  room_type_id?: string
  room_number?: string
  name?: string | null
  floor?: number | null
  building?: string | null
  status?: RoomStatus
  is_active?: boolean
  notes?: string | null
  features?: Json
  description?: string | null
  base_price?: number | null
  base_occupancy?: number | null
  max_occupancy?: number | null
  max_children?: number | null
  size_sqm?: number | null
  bed_configuration?: string | null
  amenities?: Json
  photos?: string[]
}

export interface CreateRoomTypeData {
  entity_id: string
  name: string
  code?: string | null
  category?: RoomCategory
  description?: string | null
  base_occupancy?: number
  max_occupancy?: number
  max_children?: number
  base_price: number
  size_sqm?: number | null
  amenities?: Json
  photos?: string[]
  bed_configuration?: string | null
  floor_range?: string | null
  sort_order?: number
  is_active?: boolean
}

export interface UpdateRoomTypeData {
  name?: string
  code?: string | null
  category?: RoomCategory
  description?: string | null
  base_occupancy?: number
  max_occupancy?: number
  max_children?: number
  base_price?: number
  size_sqm?: number | null
  amenities?: Json
  photos?: string[]
  bed_configuration?: string | null
  floor_range?: string | null
  sort_order?: number
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOM_PATHS = ['/rooms', '/dashboard', '/planning']

function revalidateRoomPaths() {
  for (const p of ROOM_PATHS) {
    revalidatePath(p)
  }
}

// ---------------------------------------------------------------------------
// Room Actions
// ---------------------------------------------------------------------------

/**
 * Create a new room.
 */
export async function createRoom(data: CreateRoomData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.room_number) throw new Error('room_number is required')

  await assertCurrentEntityAccess(data.entity_id)

  const supabase = await createServerSupabaseClient()

  let roomTypeId = data.room_type_id
  if (!roomTypeId) {
    const { data: defaultType } = await supabase
      .rpc('get_default_room_type_id', { p_entity_id: data.entity_id })
    if (!defaultType) {
      throw new Error('room_type_id is required')
    }
    roomTypeId = defaultType as string
  }

  const { data: roomType } = await supabase
    .from('room_types')
    .select('id')
    .eq('id', roomTypeId)
    .eq('entity_id', data.entity_id)
    .maybeSingle()

  if (!roomType) {
    throw new Error('Room type not found in this organization')
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      entity_id: data.entity_id,
      room_type_id: roomTypeId,
      room_number: data.room_number,
      name: data.name ?? null,
      floor: data.floor ?? null,
      building: data.building ?? null,
      status: data.status ?? 'available',
      is_active: data.is_active ?? true,
      notes: data.notes ?? null,
      features: data.features ?? {},
      description: data.description ?? null,
      base_price: data.base_price ?? null,
      base_occupancy: data.base_occupancy ?? null,
      max_occupancy: data.max_occupancy ?? null,
      max_children: data.max_children ?? null,
      size_sqm: data.size_sqm ?? null,
      bed_configuration: data.bed_configuration ?? null,
      amenities: data.amenities ?? [],
      photos: data.photos ?? [],
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create room: ${error.message}`)

  syncAvailabilityForOrg(room.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync availability post-create room:', err)
  )

  revalidateRoomPaths()
  return room
}

/**
 * Partially update a room.
 */
export async function updateRoom(id: string, data: UpdateRoomData) {
  if (!id) throw new Error('Room id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  let query = supabase
    .from('rooms')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: room, error } = await query.select().single()

  if (error) throw new Error(`Failed to update room: ${error.message}`)

  syncAvailabilityForOrg(room.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync availability post-update room:', err)
  )

  revalidateRoomPaths()
  return room
}

/**
 * Update only the status field of a room.
 */
export async function updateRoomStatus(id: string, status: RoomStatus) {
  if (!id) throw new Error('Room id is required')
  if (!status) throw new Error('status is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  let query = supabase
    .from('rooms')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: room, error } = await query.select().single()

  if (error) throw new Error(`Failed to update room status: ${error.message}`)

  syncAvailabilityForOrg(room.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync availability post-update status:', err)
  )

  revalidateRoomPaths()
  return room
}

// ---------------------------------------------------------------------------
// Room Type Actions
// ---------------------------------------------------------------------------

/**
 * Create a new room type.
 */
export async function createRoomType(data: CreateRoomTypeData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.name) throw new Error('name is required')
  if (data.base_price == null) throw new Error('base_price is required')

  await assertCurrentEntityAccess(data.entity_id)

  const supabase = await createServerSupabaseClient()

  const { data: roomType, error } = await supabase
    .from('room_types')
    .insert({
      entity_id: data.entity_id,
      name: data.name,
      code: data.code ?? null,
      category: data.category ?? 'room',
      description: data.description ?? null,
      base_occupancy: data.base_occupancy ?? 2,
      max_occupancy: data.max_occupancy ?? 2,
      max_children: data.max_children ?? 0,
      base_price: data.base_price,
      size_sqm: data.size_sqm ?? null,
      amenities: data.amenities ?? [],
      photos: data.photos ?? [],
      bed_configuration: data.bed_configuration ?? null,
      floor_range: data.floor_range ?? null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create room type: ${error.message}`)

  syncAvailabilityForOrg(roomType.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync availability post-create room type:', err)
  )
  syncRatesForOrg(roomType.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync rates post-create room type:', err)
  )

  revalidateRoomPaths()
  return roomType
}

/**
 * Partially update a room type.
 */
export async function updateRoomType(id: string, data: UpdateRoomTypeData) {
  if (!id) throw new Error('Room type id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  let query = supabase
    .from('room_types')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: roomType, error } = await query.select().single()

  if (error) throw new Error(`Failed to update room type: ${error.message}`)

  syncAvailabilityForOrg(roomType.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync availability post-update room type:', err)
  )
  syncRatesForOrg(roomType.entity_id).catch((err) =>
    console.error('[Rooms] Errore sync rates post-update room type:', err)
  )

  revalidateRoomPaths()
  return roomType
}
