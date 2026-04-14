'use server'

import { revalidatePath } from 'next/cache'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { getRoomTypes } from '@touracore/hospitality/src/queries/rooms'
import {
  createRoomType,
  updateRoomType,
  type CreateRoomTypeData,
  type UpdateRoomTypeData,
} from '@touracore/hospitality/src/actions/rooms'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listRoomTypesAction() {
  try {
    return await getRoomTypes()
  } catch {
    return []
  }
}

export async function createRoomTypeAction(input: Omit<CreateRoomTypeData, 'entity_id'>): Promise<ActionResult> {

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.property) return { success: false, error: 'Nessuna struttura selezionata.' }

  try {
    const roomType = await createRoomType({ ...input, entity_id: bootstrap.property.id })
    revalidatePath('/room-types')
    return { success: true, data: roomType }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateRoomTypeAction(id: string, input: UpdateRoomTypeData): Promise<ActionResult> {

  try {
    const roomType = await updateRoomType(id, input)
    revalidatePath('/room-types')
    return { success: true, data: roomType }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
