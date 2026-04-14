'use server'

import { createServerSupabaseClient } from '@touracore/db/server'
import { checkAvailability, type AvailabilityResult } from '@touracore/hospitality/src/queries/availability'
import { buildStayOffer, type StayOfferResult } from '@touracore/hospitality/src/lib/rates/stay-pricing'
import type { Property, RoomType } from '@touracore/hospitality/src/types/database'
import type { PublicPetPolicy } from './pet-pricing'

interface ActionResult {
  success: boolean
  error?: string
  data?: unknown
}

// Shape pubblica property con pet_policy normalizzata — interface usata
// internamente dalle action, ma il client la importa da './types' per
// evitare di risalire al file 'use server' (cannot re-export types).
interface PublicPropertyRow {
  id: string
  slug: string
  name: string
  pet_policy: PublicPetPolicy
  [key: string]: unknown
}

// Normalizza pet_policy dai dati raw (JSONB)
function normalizePetPolicy(raw: unknown): PublicPetPolicy {
  const obj = (raw ?? {}) as Record<string, unknown>
  return {
    allowed: Boolean(obj.allowed),
    max_pets: typeof obj.max_pets === 'number' ? obj.max_pets : 0,
    fee_per_night: typeof obj.fee_per_night === 'number' ? obj.fee_per_night : 0,
    fee_per_stay: typeof obj.fee_per_stay === 'number' ? obj.fee_per_stay : 0,
    notes: typeof obj.notes === 'string' ? obj.notes : '',
  }
}

export async function getPropertyBySlugAction(slug: string): Promise<PublicPropertyRow | null> {
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!entity) return null

  // Carica pet_policy da accommodations collegata
  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('pet_policy')
    .eq('entity_id', entity.id)
    .maybeSingle()

  return {
    ...(entity as Record<string, unknown>),
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    pet_policy: normalizePetPolicy(accommodation?.pet_policy),
  }
}

export interface AvailabilityItem {
  roomType: RoomType
  totalRooms: number
  availableRooms: number
  offer: StayOfferResult | null
}

export async function searchAvailabilityAction(
  entityId: string,
  checkIn: string,
  checkOut: string,
  guests: number
): Promise<AvailabilityItem[]> {
  const results = await checkAvailability({ entityId, checkIn, checkOut, guests })

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
    )
  )

  return results.map((r: AvailabilityResult) => {
    const offer = buildStayOffer({
      checkIn,
      checkOut,
      nights,
      basePricePerNight: r.roomType.base_price,
      season: r.season,
      ratePrice: r.ratePrice,
    })

    return {
      roomType: r.roomType,
      totalRooms: r.totalRooms,
      availableRooms: r.availableRooms,
      offer,
    }
  })
}

export async function createPublicBookingAction(input: {
  entityId: string
  roomTypeId: string
  checkIn: string
  checkOut: string
  adults: number
  children: number
  petCount: number
  petDetails?: string
  guestName: string
  guestEmail: string
  guestPhone: string
  specialRequests?: string
  totalAmount: number
}): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()

  const availability = await checkAvailability({
    entityId: input.entityId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.adults + input.children,
  })

  const roomTypeAvail = availability.find((a) => a.roomType.id === input.roomTypeId)
  if (!roomTypeAvail || roomTypeAvail.availableRooms < 1) {
    return { success: false, error: 'La tipologia selezionata non è più disponibile per le date scelte.' }
  }

  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', input.entityId)
    .single()

  if (!entity) {
    return { success: false, error: 'Struttura non trovata.' }
  }

  // Verifica policy pet: carica accommodation e valida count <= max_pets
  const { data: accommodation } = await supabase
    .from('accommodations')
    .select('pet_policy')
    .eq('entity_id', input.entityId)
    .maybeSingle()

  const petPolicy = normalizePetPolicy(accommodation?.pet_policy)

  if (input.petCount > 0) {
    if (!petPolicy.allowed) {
      return { success: false, error: 'Questa struttura non accetta animali.' }
    }
    if (petPolicy.max_pets > 0 && input.petCount > petPolicy.max_pets) {
      return {
        success: false,
        error: `Massimo ${petPolicy.max_pets} animali consentiti.`,
      }
    }
  }

  const { data: guest, error: guestErr } = await supabase
    .from('guests')
    .insert({
      entity_id: input.entityId,
      first_name: input.guestName.split(' ')[0] || input.guestName,
      last_name: input.guestName.split(' ').slice(1).join(' ') || '',
      email: input.guestEmail,
      phone: input.guestPhone || null,
    })
    .select()
    .single()

  if (guestErr) {
    return { success: false, error: 'Errore nella creazione del profilo ospite.' }
  }

  const { data: booking, error: bookErr } = await supabase
    .from('bookings')
    .insert({
      tenant_id: entity.tenant_id,
      entity_id: input.entityId,
      guest_id: guest.id,
      vertical: 'hospitality',
      status: 'confirmed',
      guest_name: input.guestName,
      guest_email: input.guestEmail,
      guest_phone: input.guestPhone || null,
      check_in: input.checkIn,
      check_out: input.checkOut,
      total_amount: input.totalAmount,
      currency: 'EUR',
      notes: input.specialRequests || null,
      source: 'direct',
      pet_count: input.petCount,
      pet_details: input.petCount > 0
        ? { notes: input.petDetails ?? null, count: input.petCount }
        : null,
      vertical_data: {
        room_type_id: input.roomTypeId,
        room_type_name: roomTypeAvail.roomType.name,
        adults: input.adults,
        children: input.children,
        meal_plan: 'room_only',
      },
      confirmed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (bookErr) {
    return { success: false, error: 'Errore nella creazione della prenotazione.' }
  }

  return {
    success: true,
    data: {
      reservationCode: booking.id.slice(0, 8).toUpperCase(),
      bookingId: booking.id,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalAmount: booking.total_amount,
    },
  }
}
