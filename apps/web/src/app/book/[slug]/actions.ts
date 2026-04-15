'use server'

import { createServiceRoleClient } from '@touracore/db/server'
import { checkAvailability, type AvailabilityResult } from '@touracore/hospitality/src/queries/availability'
import { buildStayOffer, type StayOfferResult } from '@touracore/hospitality/src/lib/rates/stay-pricing'
import type { RoomType } from '@touracore/hospitality/src/types/database'
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
  const supabase = await createServiceRoleClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
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
  const supabase = await createServiceRoleClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id')
    .eq('id', input.entityId)
    .eq('is_active', true)
    .maybeSingle()

  if (!entity) {
    return { success: false, error: 'Struttura non trovata.' }
  }

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

  // Usiamo il service role client per bypassare RLS: questa è una action pubblica
  // chiamata da un ospite non autenticato, non ha entità su get_user_entity_ids().
  const serviceClient = await createServiceRoleClient()

  // Upsert guest: se esiste già con email+entity lo riusiamo
  const { data: existingGuest } = await serviceClient
    .from('guests')
    .select('id')
    .eq('entity_id', input.entityId)
    .eq('email', input.guestEmail)
    .maybeSingle()

  let guestId: string
  if (existingGuest) {
    guestId = existingGuest.id
  } else {
    const { data: newGuest, error: guestErr } = await serviceClient
      .from('guests')
      .insert({
        entity_id: input.entityId,
        first_name: input.guestName.split(' ')[0] || input.guestName,
        last_name: input.guestName.split(' ').slice(1).join(' ') || '',
        email: input.guestEmail,
        phone: input.guestPhone || null,
      })
      .select('id')
      .single()

    if (guestErr || !newGuest) {
      console.error('[createPublicBooking] guest insert error', guestErr)
      return { success: false, error: 'Errore nella creazione del profilo ospite.' }
    }
    guestId = newGuest.id
  }

  // Genera reservation_code via funzione DB (RES-YYYY-NNNNN)
  const { data: codeResult, error: codeErr } = await serviceClient.rpc(
    'generate_reservation_code',
    { org_id: input.entityId },
  )

  if (codeErr || !codeResult) {
    console.error('[createPublicBooking] reservation_code rpc error', codeErr)
    return { success: false, error: 'Errore generazione codice prenotazione.' }
  }

  const reservationCode = codeResult as string

  const petDetailsJson =
    input.petCount > 0
      ? [{ notes: input.petDetails ?? null, count: input.petCount }]
      : []

  const { data: reservation, error: resErr } = await serviceClient
    .from('reservations')
    .insert({
      entity_id: input.entityId,
      reservation_code: reservationCode,
      guest_id: guestId,
      room_type_id: input.roomTypeId,
      check_in: input.checkIn,
      check_out: input.checkOut,
      status: 'confirmed',
      source: 'website',
      adults: input.adults,
      children: input.children,
      infants: 0,
      pet_count: input.petCount,
      pet_details: petDetailsJson,
      meal_plan: 'room_only',
      total_amount: input.totalAmount,
      paid_amount: 0,
      currency: 'EUR',
      special_requests: input.specialRequests || null,
    })
    .select('id, reservation_code, check_in, check_out, total_amount')
    .single()

  if (resErr || !reservation) {
    console.error('[createPublicBooking] reservation insert error', resErr)
    return { success: false, error: 'Errore nella creazione della prenotazione.' }
  }

  return {
    success: true,
    data: {
      reservationCode: reservation.reservation_code,
      reservationId: reservation.id,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      totalAmount: reservation.total_amount,
    },
  }
}
