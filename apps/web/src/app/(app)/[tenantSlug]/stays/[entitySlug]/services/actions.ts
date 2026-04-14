'use server'

import { revalidatePath } from 'next/cache'
import {
  getOffers,
  getOrders,
  getUpsellRevenue,
  getAvailabilityRules,
  getAvailableSlots,
  getServiceBookings,
} from '@touracore/hospitality/src/queries/upselling'
import {
  createOffer,
  updateOffer,
  deleteOffer,
  confirmOrder,
  cancelOrder,
  completeOrder,
  addAvailabilityRule,
  removeAvailabilityRule,
  bookSlot,
  cancelSlotBooking,
  completeSlotBooking,
  type CreateOfferData,
  type UpdateOfferData,
} from '@touracore/hospitality/src/actions/upselling'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'

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

// Caricamento consolidato — una singola request HTTP per tutta la pagina
// invece di 3 separate (ognuna paga il bootstrap auth)
export async function loadServicesPageAction(filters: { limit?: number } = {}) {
  try {
    const [offers, orders, revenue] = await Promise.all([
      getOffers(),
      getOrders({ limit: filters.limit ?? 50 }),
      getUpsellRevenue(),
    ])
    return { offers, orders, revenue }
  } catch {
    return {
      offers: [],
      orders: [],
      revenue: { totalRevenue: 0, totalOrders: 0, pendingOrders: 0 },
    }
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

// ---------------------------------------------------------------------------
// Slot orari — regole disponibilità e prenotazioni
// ---------------------------------------------------------------------------

interface SlotRule {
  id: string
  offer_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
}

interface AvailableSlot {
  start: string
  end: string
  capacity: number
  booked: number
  available: number
}

interface SlotBookingRow {
  id: string
  offer_id: string
  slot_date: string
  slot_start: string
  slot_end: string
  participants: number
  status: string
  notes: string | null
  guest: { first_name: string; last_name: string } | null
}

interface SlotsLoadResult {
  success: boolean
  error?: string
  data?: {
    rules: SlotRule[]
    availableSlots: AvailableSlot[]
    bookings: SlotBookingRow[]
  }
}

export async function loadOfferSlotsDataAction(
  offerId: string,
  date: string,
): Promise<SlotsLoadResult> {
  try {
    const { property } = await requireCurrentEntity()
    const [rules, availableSlots, bookings] = await Promise.all([
      getAvailabilityRules(offerId),
      getAvailableSlots(offerId, date),
      getServiceBookings({ entityId: property.id, dateFrom: date, dateTo: date, offerId }),
    ])
    return {
      success: true,
      data: {
        rules: rules as SlotRule[],
        availableSlots: availableSlots as AvailableSlot[],
        bookings: bookings as unknown as SlotBookingRow[],
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Errore',
    }
  }
}

export async function addAvailabilityRuleAction(
  offerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
): Promise<ActionResult> {
  try {
    await addAvailabilityRule(offerId, dayOfWeek, startTime, endTime)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function removeAvailabilityRuleAction(ruleId: string): Promise<ActionResult> {
  try {
    await removeAvailabilityRule(ruleId)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function bookSlotAction(input: {
  offerId: string
  slotDate: string
  slotStart: string
  participants?: number
  notes?: string
}): Promise<ActionResult> {
  try {
    const id = await bookSlot(input)
    revalidatePath('/services')
    return { success: true, data: { id } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function cancelSlotBookingAction(bookingId: string): Promise<ActionResult> {
  try {
    await cancelSlotBooking(bookingId)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}

export async function completeSlotBookingAction(bookingId: string): Promise<ActionResult> {
  try {
    await completeSlotBooking(bookingId)
    revalidatePath('/services')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
