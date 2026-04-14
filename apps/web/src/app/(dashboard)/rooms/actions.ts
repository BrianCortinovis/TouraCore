'use server'

import { revalidatePath } from 'next/cache'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { getRooms, getRoomTypes } from '@touracore/hospitality/src/queries/rooms'
import type { RoomStatus } from '@touracore/hospitality/src/types/database'
import {
  createRoom,
  updateRoom,
  updateRoomStatus,
  type CreateRoomData,
  type UpdateRoomData,
} from '@touracore/hospitality/src/actions/rooms'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listRoomsAction() {
  try {
    return await getRooms()
  } catch {
    return []
  }
}

export async function listRoomTypesForSelectAction() {
  try {
    const types = await getRoomTypes()
    return types.map((t) => ({ value: t.id, label: t.name }))
  } catch {
    return []
  }
}

export async function createRoomAction(input: Omit<CreateRoomData, 'entity_id'>): Promise<ActionResult> {

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.property) return { success: false, error: 'Nessuna struttura selezionata.' }

  try {
    const room = await createRoom({ ...input, entity_id: bootstrap.property.id })
    revalidatePath('/rooms')
    return { success: true, data: room }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateRoomAction(id: string, input: UpdateRoomData): Promise<ActionResult> {

  try {
    const room = await updateRoom(id, input)
    revalidatePath('/rooms')
    return { success: true, data: room }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateRoomStatusAction(id: string, status: RoomStatus): Promise<ActionResult> {

  try {
    const room = await updateRoomStatus(id, status)
    revalidatePath('/rooms')
    return { success: true, data: room }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
