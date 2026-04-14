'use server'

import { revalidatePath } from 'next/cache'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import { getRatePlans } from '@touracore/hospitality/src/queries/rates'
import {
  createRatePlan,
  updateRatePlan,
  toggleRatePlan,
  deleteRatePlan,
  type CreateRatePlanData,
  type UpdateRatePlanData,
} from '@touracore/hospitality/src/actions/rates'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listRatePlansAction() {
  try {
    return await getRatePlans()
  } catch {
    return []
  }
}

export async function createRatePlanAction(input: Omit<CreateRatePlanData, 'entity_id'>): Promise<ActionResult> {

  const bootstrap = await getAuthBootstrapData()
  if (!bootstrap.property) return { success: false, error: 'Nessuna struttura selezionata.' }

  try {
    const plan = await createRatePlan({ ...input, entity_id: bootstrap.property.id })
    revalidatePath('/rate-plans')
    return { success: true, data: plan }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateRatePlanAction(id: string, input: UpdateRatePlanData): Promise<ActionResult> {

  try {
    const plan = await updateRatePlan(id, input)
    revalidatePath('/rate-plans')
    return { success: true, data: plan }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function toggleRatePlanAction(id: string, isActive: boolean): Promise<ActionResult> {

  try {
    const plan = await toggleRatePlan(id, isActive)
    revalidatePath('/rate-plans')
    return { success: true, data: plan }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteRatePlanAction(id: string): Promise<ActionResult> {

  try {
    await deleteRatePlan(id)
    revalidatePath('/rate-plans')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
