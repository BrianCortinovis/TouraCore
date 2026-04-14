'use server'

import { revalidatePath } from 'next/cache'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { getSeasons } from '@touracore/hospitality/src/queries/rates'
import {
  createSeason,
  updateSeason,
  deleteSeason,
  type CreateSeasonData,
  type UpdateSeasonData,
} from '@touracore/hospitality/src/actions/rates'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listSeasonsAction() {
  try {
    return await getSeasons()
  } catch {
    return []
  }
}

export async function createSeasonAction(input: Omit<CreateSeasonData, 'entity_id'>): Promise<ActionResult> {

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.property) return { success: false, error: 'Nessuna struttura selezionata.' }

  try {
    const season = await createSeason({ ...input, entity_id: bootstrap.property.id })
    revalidatePath('/seasons')
    return { success: true, data: season }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateSeasonAction(id: string, input: UpdateSeasonData): Promise<ActionResult> {

  try {
    const season = await updateSeason(id, input)
    revalidatePath('/seasons')
    return { success: true, data: season }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteSeasonAction(id: string): Promise<ActionResult> {

  try {
    await deleteSeason(id)
    revalidatePath('/seasons')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
