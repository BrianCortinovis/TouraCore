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
