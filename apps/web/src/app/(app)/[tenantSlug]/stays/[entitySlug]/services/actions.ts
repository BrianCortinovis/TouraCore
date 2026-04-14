'use server'

import { revalidatePath } from 'next/cache'
import { getAuthBootstrapData } from '@touracore/auth/bootstrap'
import {
  getOffers,
  getOrders,
  getUpsellRevenue,
} from '@touracore/hospitality/src/queries/upselling'
import {
  createOffer,
  updateOffer,
  deleteOffer,
  confirmOrder,
  cancelOrder,
  completeOrder,
  type CreateOfferData,
  type UpdateOfferData,
} from '@touracore/hospitality/src/actions/upselling'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

export async function listOffersAction() {
  try {
    return await getOffers()
  } catch {
    return []
  }
}

export async function listOrdersAction(filters: { status?: string; limit?: number } = {}) {
  try {
    return await getOrders(filters)
  } catch {
    return []
  }
}

export async function getRevenueAction() {
  try {
    return await getUpsellRevenue()
  } catch {
    return { totalRevenue: 0, totalOrders: 0, pendingOrders: 0 }
  }
}

export async function createOfferAction(input: CreateOfferData): Promise<ActionResult> {
  try {
    await createOffer(input)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function updateOfferAction(id: string, input: UpdateOfferData): Promise<ActionResult> {
  try {
    await updateOffer(id, input)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function deleteOfferAction(id: string): Promise<ActionResult> {
  try {
    await deleteOffer(id)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function toggleOfferAction(id: string, isActive: boolean): Promise<ActionResult> {
  try {
    await updateOffer(id, { is_active: isActive })
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function confirmOrderAction(id: string): Promise<ActionResult> {
  try {
    await confirmOrder(id)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function cancelOrderAction(id: string): Promise<ActionResult> {
  try {
    await cancelOrder(id)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function completeOrderAction(id: string): Promise<ActionResult> {
  try {
    await completeOrder(id)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
