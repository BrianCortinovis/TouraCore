'use server'

import { revalidatePath } from 'next/cache'
import { assertCurrentEntityAccess } from '../auth/access'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import type { UpsellCategory, ChargeMode, PricingMode } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateOfferData {
  name: string
  description?: string
  photo_url?: string
  price: number
  category: UpsellCategory
  charge_mode?: ChargeMode
  pricing_mode?: PricingMode
  included_quantity?: number
  max_quantity?: number | null
  is_active?: boolean
  available_days?: string[]
  max_per_day?: number | null
  requires_request?: boolean
  online_bookable?: boolean
  advance_notice_hours?: number
  sort_order?: number
  // Slot prenotabili
  bookable_with_slots?: boolean
  slot_duration_minutes?: number | null
  max_concurrent?: number
}

export interface UpdateOfferData {
  name?: string
  description?: string
  photo_url?: string
  price?: number
  category?: UpsellCategory
  charge_mode?: ChargeMode
  pricing_mode?: PricingMode
  included_quantity?: number
  max_quantity?: number | null
  is_active?: boolean
  available_days?: string[]
  max_per_day?: number | null
  requires_request?: boolean
  online_bookable?: boolean
  advance_notice_hours?: number
  sort_order?: number
  // Slot prenotabili
  bookable_with_slots?: boolean
  slot_duration_minutes?: number | null
  max_concurrent?: number
}

export interface PlaceOrderData {
  entity_id: string
  reservation_id: string
  offer_id: string
  guest_id?: string
  quantity?: number
  unit_price: number
  requested_date?: string
  notes?: string
  source?: 'guest_portal' | 'reception' | 'email' | 'whatsapp'
  checkin_token?: string
}

// ---------------------------------------------------------------------------
// Offers CRUD
// ---------------------------------------------------------------------------

export async function createOffer(data: CreateOfferData) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase.from('upsell_offers').insert({
    entity_id: orgId,
    name: data.name,
    description: data.description || null,
    photo_url: data.photo_url || null,
    price: data.price,
    category: data.category,
    charge_mode: data.charge_mode ?? 'paid',
    pricing_mode: data.pricing_mode ?? 'per_stay',
    included_quantity: data.included_quantity ?? 0,
    max_quantity: data.max_quantity ?? null,
    is_active: data.is_active ?? true,
    available_days: data.available_days || [],
    max_per_day: data.max_per_day || null,
    requires_request: data.requires_request ?? false,
    online_bookable: data.online_bookable ?? true,
    advance_notice_hours: data.advance_notice_hours ?? 0,
    sort_order: data.sort_order || 0,
  })

  if (error) {
    console.error('[Upselling] Errore creazione offerta:', error)
    throw new Error('Impossibile creare l\'offerta')
  }

  revalidatePath('/upselling')
}

export async function updateOffer(id: string, data: UpdateOfferData) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('upsell_offers')
    .update(data)
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Upselling] Errore aggiornamento offerta:', error)
    throw new Error('Impossibile aggiornare l\'offerta')
  }

  revalidatePath('/upselling')
}

export async function deleteOffer(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('upsell_offers')
    .delete()
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Upselling] Errore eliminazione offerta:', error)
    throw new Error('Impossibile eliminare l\'offerta')
  }

  revalidatePath('/upselling')
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function placeOrder(data: PlaceOrderData) {
  const isGuestPortalRequest = data.source === 'guest_portal'
  const supabase = isGuestPortalRequest
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()

  if (isGuestPortalRequest) {
    if (!data.checkin_token) {
      throw new Error('Check-in token is required for guest portal orders')
    }

    const { data: checkinToken } = await supabase
      .from('checkin_tokens')
      .select('reservation_id, entity_id, status, expires_at')
      .eq('token', data.checkin_token)
      .single()

    const isExpired =
      !checkinToken ||
      checkinToken.status === 'expired' ||
      new Date(checkinToken.expires_at) < new Date()

    if (isExpired) {
      throw new Error('Guest portal access is no longer valid')
    }

    if (
      checkinToken.entity_id !== data.entity_id ||
      checkinToken.reservation_id !== data.reservation_id
    ) {
      throw new Error('Order does not belong to the active guest session')
    }
  } else {
    await assertCurrentEntityAccess(data.entity_id)
  }

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id')
    .eq('id', data.reservation_id)
    .eq('entity_id', data.entity_id)
    .maybeSingle()

  if (!reservation) {
    throw new Error('Reservation not found in this organization')
  }

  const { data: offer } = await supabase
    .from('upsell_offers')
    .select('id')
    .eq('id', data.offer_id)
    .eq('entity_id', data.entity_id)
    .maybeSingle()

  if (!offer) {
    throw new Error('Offer not found in this organization')
  }

  if (data.guest_id) {
    const { data: guest } = await supabase
      .from('guests')
      .select('id')
      .eq('id', data.guest_id)
      .eq('entity_id', data.entity_id)
      .maybeSingle()

    if (!guest) {
      throw new Error('Guest not found in this organization')
    }
  }

  const quantity = data.quantity || 1
  const totalPrice = data.unit_price * quantity

  const { error } = await supabase.from('upsell_orders').insert({
    entity_id: data.entity_id,
    reservation_id: data.reservation_id,
    offer_id: data.offer_id,
    guest_id: data.guest_id || null,
    quantity,
    unit_price: data.unit_price,
    total_price: totalPrice,
    requested_date: data.requested_date || null,
    notes: data.notes || null,
    status: 'pending',
    source: data.source || 'guest_portal',
  })

  if (error) {
    console.error('[Upselling] Errore creazione ordine:', error)
    throw new Error('Impossibile effettuare l\'ordine')
  }

  revalidatePath('/upselling')
}

export async function confirmOrder(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('upsell_orders')
    .update({ status: 'confirmed' })
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Upselling] Errore conferma ordine:', error)
    throw new Error('Impossibile confermare l\'ordine')
  }

  revalidatePath('/upselling')
}

export async function cancelOrder(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('upsell_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Upselling] Errore cancellazione ordine:', error)
    throw new Error('Impossibile cancellare l\'ordine')
  }

  revalidatePath('/upselling')
}

export async function completeOrder(id: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Organizzazione non trovata')

  const { error } = await supabase
    .from('upsell_orders')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) {
    console.error('[Upselling] Errore completamento ordine:', error)
    throw new Error('Impossibile completare l\'ordine')
  }

  revalidatePath('/upselling')
}

// ---------------------------------------------------------------------------
// Slot orari: regole disponibilità
// ---------------------------------------------------------------------------

export async function addAvailabilityRule(
  offerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
) {
  if (dayOfWeek < 0 || dayOfWeek > 6) throw new Error('Giorno non valido')
  if (startTime >= endTime) throw new Error('Ora inizio deve precedere ora fine')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  if (!property?.id) throw new Error('Organizzazione non trovata')

  // Verifica che l'offerta appartenga all'entity corrente
  const { data: offer } = await supabase
    .from('upsell_offers')
    .select('id')
    .eq('id', offerId)
    .eq('entity_id', property.id)
    .single()
  if (!offer) throw new Error('Offerta non trovata')

  const { error } = await supabase
    .from('service_availability_rules')
    .insert({
      offer_id: offerId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      is_active: true,
    })

  if (error) {
    console.error('[Upselling] Errore creazione regola disponibilità:', error)
    throw new Error('Impossibile creare la regola')
  }

  revalidatePath('/services')
}

export async function removeAvailabilityRule(ruleId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('service_availability_rules')
    .delete()
    .eq('id', ruleId)

  if (error) {
    console.error('[Upselling] Errore rimozione regola:', error)
    throw new Error('Impossibile rimuovere la regola')
  }

  revalidatePath('/services')
}

// ---------------------------------------------------------------------------
// Slot orari: prenotazioni
// ---------------------------------------------------------------------------

export async function bookSlot(input: {
  offerId: string
  slotDate: string
  slotStart: string
  participants?: number
  guestId?: string | null
  reservationId?: string | null
  notes?: string
}) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  if (!property?.id) throw new Error('Organizzazione non trovata')

  // Carica offerta per durata + max concorrenti + verifica entity
  const { data: offer } = await supabase
    .from('upsell_offers')
    .select('id, bookable_with_slots, slot_duration_minutes, max_concurrent')
    .eq('id', input.offerId)
    .eq('entity_id', property.id)
    .single()

  if (!offer || !offer.bookable_with_slots || !offer.slot_duration_minutes) {
    throw new Error('Offerta non prenotabile con slot')
  }

  const duration = offer.slot_duration_minutes as number
  const capacity = (offer.max_concurrent as number) ?? 1
  const participants = Math.max(1, input.participants ?? 1)

  // Calcola slot_end
  const [h, m] = input.slotStart.split(':').map(Number)
  const startMin = (h ?? 0) * 60 + (m ?? 0)
  const endMin = startMin + duration
  const nh = Math.floor(endMin / 60) % 24
  const nm = endMin % 60
  const slotEnd = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`

  // Anti-overbooking: conta partecipanti già prenotati in slot sovrapposti
  const { data: overlapping } = await supabase
    .from('service_slot_bookings')
    .select('participants, slot_start, slot_end')
    .eq('offer_id', input.offerId)
    .eq('slot_date', input.slotDate)
    .in('status', ['confirmed', 'completed'])

  const booked = (overlapping ?? [])
    .filter((b) => {
      const bs = b.slot_start.slice(0, 5)
      const be = b.slot_end.slice(0, 5)
      return bs < slotEnd && be > input.slotStart
    })
    .reduce((sum, b) => sum + (b.participants ?? 1), 0)

  if (booked + participants > capacity) {
    throw new Error(`Slot pieno: ${booked}/${capacity} posti già occupati`)
  }

  const { data: newBooking, error } = await supabase
    .from('service_slot_bookings')
    .insert({
      offer_id: input.offerId,
      reservation_id: input.reservationId ?? null,
      guest_id: input.guestId ?? null,
      slot_date: input.slotDate,
      slot_start: input.slotStart,
      slot_end: slotEnd,
      participants,
      status: 'confirmed',
      notes: input.notes ?? null,
    })
    .select('id')
    .single()

  if (error || !newBooking) {
    console.error('[Upselling] Errore prenotazione slot:', error)
    throw new Error('Impossibile prenotare lo slot')
  }

  revalidatePath('/services')
  return newBooking.id
}

export async function cancelSlotBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('service_slot_bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)

  if (error) {
    console.error('[Upselling] Errore cancellazione slot booking:', error)
    throw new Error('Impossibile cancellare la prenotazione')
  }

  revalidatePath('/services')
}

export async function completeSlotBooking(bookingId: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('service_slot_bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)

  if (error) {
    console.error('[Upselling] Errore completamento slot booking:', error)
    throw new Error('Impossibile completare la prenotazione')
  }

  revalidatePath('/services')
}
