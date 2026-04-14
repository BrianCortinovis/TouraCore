import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type {
  UpsellOffer,
  UpsellOrder,
  Reservation,
  Guest,
  ServiceAvailabilityRule,
  ServiceSlotBooking,
} from '../types/database'

// ---------------------------------------------------------------------------
// Offers
// ---------------------------------------------------------------------------

export async function getOffers() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  const { data, error } = await supabase
    .from('upsell_offers')
    .select('*')
    .eq('entity_id', propId)
    .order('sort_order')

  if (error) {
    console.error('[Upselling] Errore caricamento offerte:', error)
    return []
  }

  return (data ?? []) as UpsellOffer[]
}

export async function getActiveOffers(propId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('upsell_offers')
    .select('*')
    .eq('entity_id', propId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[Upselling] Errore caricamento offerte attive:', error)
    return []
  }

  return (data ?? []) as UpsellOffer[]
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function getOrders(filters: { status?: string; limit?: number } = {}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return []

  let query = supabase
    .from('upsell_orders')
    .select('*, offer:upsell_offers(*), reservation:reservations(*, guest:guests(*)), guest:guests(*)')
    .eq('entity_id', propId)
    .order('created_at', { ascending: false })
    .limit(filters.limit ?? 50)

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Upselling] Errore caricamento ordini:', error)
    return []
  }

  return (data ?? []) as (UpsellOrder & {
    offer: UpsellOffer
    reservation: Reservation & { guest: Guest }
    guest: Guest | null
  })[]
}

export async function getOrdersByReservation(reservationId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('upsell_orders')
    .select('*, offer:upsell_offers(*)')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Upselling] Errore caricamento ordini prenotazione:', error)
    return []
  }

  return (data ?? []) as (UpsellOrder & { offer: UpsellOffer })[]
}

// ---------------------------------------------------------------------------
// Revenue stats
// ---------------------------------------------------------------------------

export async function getUpsellRevenue() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const propId = property?.id
  if (!propId) return { totalRevenue: 0, totalOrders: 0, pendingOrders: 0 }

  // Aggregate lato DB invece di scaricare tutte le righe (scala a milioni di ordini)
  const [totalCount, pendingCount, revenueAgg] = await Promise.all([
    supabase
      .from('upsell_orders')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', propId),
    supabase
      .from('upsell_orders')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', propId)
      .eq('status', 'pending'),
    supabase
      .from('upsell_orders')
      .select('total_price.sum()')
      .eq('entity_id', propId)
      .in('status', ['confirmed', 'completed'])
      .single(),
  ])

  return {
    totalRevenue: (revenueAgg.data as { sum: number } | null)?.sum ?? 0,
    totalOrders: totalCount.count ?? 0,
    pendingOrders: pendingCount.count ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Public access (for guest portal, no auth)
// ---------------------------------------------------------------------------

export async function getPublicOffers(propId: string) {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('upsell_offers')
    .select('*')
    .eq('entity_id', propId)
    .eq('is_active', true)
    .order('sort_order')

  if (error) {
    console.error('[Upselling] Errore caricamento offerte pubbliche:', error)
    return []
  }

  return (data ?? []) as UpsellOffer[]
}

// ---------------------------------------------------------------------------
// Category labels
// ---------------------------------------------------------------------------

export const UPSELL_CATEGORY_LABELS: Record<string, string> = {
  food_beverage: 'Ristorazione',
  transfer: 'Transfer',
  experience: 'Esperienza',
  spa_wellness: 'Spa & Wellness',
  early_checkin: 'Early Check-in',
  late_checkout: 'Late Check-out',
  parking: 'Parcheggio',
  linen: 'Biancheria',
  laundry: 'Lavanderia',
  kitchen: 'Cucina',
  bike: 'Biciclette',
  baby_kit: 'Kit bambini',
  pet_kit: 'Kit animali',
  room_upgrade: 'Upgrade Camera',
  other: 'Altro',
}

export const UPSELL_ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  cancelled: 'Annullato',
  completed: 'Completato',
}

// ---------------------------------------------------------------------------
// Slot prenotabili — regole disponibilità + booking
// ---------------------------------------------------------------------------

interface AvailableSlot {
  start: string  // "HH:mm"
  end: string    // "HH:mm"
  capacity: number
  booked: number
  available: number
}

// Somma minuti a un orario "HH:mm"
function addMinutes(time: string, minutes: number): string {
  const parts = time.split(':').map(Number)
  const h = parts[0] ?? 0
  const m = parts[1] ?? 0
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}

export async function getAvailabilityRules(offerId: string): Promise<ServiceAvailabilityRule[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('service_availability_rules')
    .select('*')
    .eq('offer_id', offerId)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time')

  if (error) {
    console.error('[Upselling] Errore caricamento regole disponibilità:', error)
    return []
  }
  return (data ?? []) as ServiceAvailabilityRule[]
}

// Calcola gli slot disponibili per una data specifica di una offerta bookable_with_slots
export async function getAvailableSlots(offerId: string, date: string): Promise<AvailableSlot[]> {
  const supabase = await createServerSupabaseClient()

  // Carica l'offerta per sapere durata slot e max concorrenti
  const { data: offer, error: offerErr } = await supabase
    .from('upsell_offers')
    .select('bookable_with_slots, slot_duration_minutes, max_concurrent')
    .eq('id', offerId)
    .single()

  if (offerErr || !offer || !offer.bookable_with_slots || !offer.slot_duration_minutes) {
    return []
  }

  const duration = offer.slot_duration_minutes as number
  const capacity = (offer.max_concurrent as number) ?? 1

  // Regole per il weekday della data richiesta
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const { data: rules } = await supabase
    .from('service_availability_rules')
    .select('start_time, end_time')
    .eq('offer_id', offerId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return []

  // Prenotazioni esistenti in quella data (solo confirmed/completed)
  const { data: bookings } = await supabase
    .from('service_slot_bookings')
    .select('slot_start, slot_end, participants')
    .eq('offer_id', offerId)
    .eq('slot_date', date)
    .in('status', ['confirmed', 'completed'])

  const slots: AvailableSlot[] = []

  for (const rule of rules) {
    let current = rule.start_time.slice(0, 5) // "HH:mm"
    const end = rule.end_time.slice(0, 5)

    while (current < end) {
      const next = addMinutes(current, duration)
      if (next > end) break

      const overlapping = (bookings ?? []).filter((b) => {
        const bs = b.slot_start.slice(0, 5)
        const be = b.slot_end.slice(0, 5)
        return bs < next && be > current
      })
      const booked = overlapping.reduce((sum, b) => sum + (b.participants ?? 1), 0)

      slots.push({
        start: current,
        end: next,
        capacity,
        booked,
        available: Math.max(0, capacity - booked),
      })

      current = next
    }
  }

  return slots
}

export async function getServiceBookings(filters: {
  entityId: string
  dateFrom?: string
  dateTo?: string
  offerId?: string
  status?: string
}): Promise<(ServiceSlotBooking & { offer: UpsellOffer | null; guest: Guest | null })[]> {
  const supabase = await createServerSupabaseClient()

  let query = supabase
    .from('service_slot_bookings')
    .select('*, offer:upsell_offers!inner(*), guest:guests(*)')
    .eq('offer.entity_id', filters.entityId)
    .order('slot_date', { ascending: false })
    .order('slot_start', { ascending: false })

  if (filters.dateFrom) query = query.gte('slot_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('slot_date', filters.dateTo)
  if (filters.offerId) query = query.eq('offer_id', filters.offerId)
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query

  if (error) {
    console.error('[Upselling] Errore caricamento prenotazioni slot:', error)
    return []
  }

  return (data ?? []) as (ServiceSlotBooking & { offer: UpsellOffer | null; guest: Guest | null })[]
}
