import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from './auth'
import type { UpsellOffer, UpsellOrder, Reservation, Guest } from '../types/database'

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

  const { data, error } = await supabase
    .from('upsell_orders')
    .select('total_price, status')
    .eq('entity_id', propId)

  if (error) return { totalRevenue: 0, totalOrders: 0, pendingOrders: 0 }

  const orders = data ?? []
  const confirmed = orders.filter((o) => o.status === 'confirmed' || o.status === 'completed')
  const pending = orders.filter((o) => o.status === 'pending')

  return {
    totalRevenue: confirmed.reduce((sum, o) => sum + (o.total_price || 0), 0),
    totalOrders: orders.length,
    pendingOrders: pending.length,
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
