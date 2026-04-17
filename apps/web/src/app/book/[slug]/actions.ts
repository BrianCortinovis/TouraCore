'use server'

import { createServiceRoleClient } from '@touracore/db/server'
import { checkAvailability, type AvailabilityResult } from '@touracore/hospitality/src/queries/availability'
import { buildStayOffer, type StayOfferResult } from '@touracore/hospitality/src/lib/rates/stay-pricing'
import { generatePolicyText, type CancellationPolicyInput } from '@touracore/hospitality/src/compliance/cancellation-policy'
import type { RatePlan, RoomType, UpsellOffer } from '@touracore/hospitality/src/types/database'
import { calculatePetSupplement, type PublicPetPolicy } from './pet-pricing'

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
  default_currency?: string
  default_language?: string
  short_description?: string | null
  pet_policy: PublicPetPolicy
  [key: string]: unknown
}

export interface PublicRatePlan {
  id: string
  name: string
  code: string | null
  description: string | null
  meal_plan: RatePlan['meal_plan']
  rate_type: RatePlan['rate_type']
  cancellation_policy: CancellationPolicyInput
  sort_order: number
}

export interface PublicBookingUpsell {
  id: string
  name: string
  description: string | null
  price: number
  category: UpsellOffer['category']
  charge_mode: UpsellOffer['charge_mode']
  pricing_mode: UpsellOffer['pricing_mode']
  included_quantity: number
  max_quantity: number | null
  requires_request: boolean
  online_bookable: boolean
  bookable_with_slots: boolean
  slot_duration_minutes: number | null
  max_concurrent: number
  sort_order: number
}

export interface PublicBookingContext {
  property: PublicPropertyRow | null
  ratePlans: PublicRatePlan[]
  upsells: PublicBookingUpsell[]
  defaultRatePlanId: string | null
  cancellationPolicyText: string | null
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

function normalizeCancellationPolicy(raw: unknown): CancellationPolicyInput {
  const obj = (raw ?? {}) as Record<string, unknown>

  return {
    policy_type: obj.policy_type === 'moderate' ||
      obj.policy_type === 'strict' ||
      obj.policy_type === 'non_refundable' ||
      obj.policy_type === 'custom'
      ? obj.policy_type
      : 'free',
    free_cancellation_hours: typeof obj.free_cancellation_hours === 'number' ? obj.free_cancellation_hours : 24,
    penalty_first_night: Boolean(obj.penalty_first_night),
    penalty_percentage: typeof obj.penalty_percentage === 'number' ? obj.penalty_percentage : 0,
    penalty_fixed: typeof obj.penalty_fixed === 'number' ? obj.penalty_fixed : 0,
  }
}

function splitGuestName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return { firstName: '', lastName: '' }
  }

  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
  }
}

function normalizeCountry(value?: string) {
  return value?.trim() || null
}

function normalizeText(value?: string) {
  const trimmed = value?.trim()
  return trimmed?.length ? trimmed : null
}

async function getPublicRatePlans(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  entityId: string
): Promise<PublicRatePlan[]> {
  const { data, error } = await supabase
    .from('rate_plans')
    .select('id, name, code, description, meal_plan, rate_type, cancellation_policy, is_public, is_active, sort_order')
    .eq('entity_id', entityId)
    .eq('is_public', true)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[booking-context] rate plans load error', error)
    return []
  }

  return (data ?? []).map((plan) => ({
    id: plan.id,
    name: plan.name,
    code: plan.code,
    description: plan.description,
    meal_plan: plan.meal_plan,
    rate_type: plan.rate_type,
    cancellation_policy: normalizeCancellationPolicy(plan.cancellation_policy),
    sort_order: plan.sort_order ?? 0,
  }))
}

async function getPublicUpsells(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  entityId: string
): Promise<PublicBookingUpsell[]> {
  const { data, error } = await supabase
    .from('upsell_offers')
    .select('id, name, description, price, category, charge_mode, pricing_mode, included_quantity, max_quantity, requires_request, online_bookable, bookable_with_slots, slot_duration_minutes, max_concurrent, sort_order')
    .eq('entity_id', entityId)
    .eq('is_active', true)
    .eq('online_bookable', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('[booking-context] upsells load error', error)
    return []
  }

  return (data ?? []).map((offer) => ({
    id: offer.id,
    name: offer.name,
    description: offer.description,
    price: offer.price,
    category: offer.category,
    charge_mode: offer.charge_mode,
    pricing_mode: offer.pricing_mode,
    included_quantity: offer.included_quantity ?? 0,
    max_quantity: offer.max_quantity ?? null,
    requires_request: Boolean(offer.requires_request),
    online_bookable: Boolean(offer.online_bookable),
    bookable_with_slots: Boolean(offer.bookable_with_slots),
    slot_duration_minutes: offer.slot_duration_minutes ?? null,
    max_concurrent: offer.max_concurrent ?? 1,
    sort_order: offer.sort_order ?? 0,
  }))
}

export async function getPublicBookingContextAction(slug: string): Promise<PublicBookingContext> {
  const supabase = await createServiceRoleClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name, short_description, is_active, accommodation:accommodations(default_currency, default_language, pet_policy)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!entity) {
    return {
      property: null,
      ratePlans: [],
      upsells: [],
      defaultRatePlanId: null,
      cancellationPolicyText: null,
    }
  }

  const accRaw = (entity as unknown as { accommodation?: Record<string, unknown> | Array<Record<string, unknown>> | null }).accommodation
  const acc = Array.isArray(accRaw) ? (accRaw[0] ?? null) : accRaw
  const property = {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    default_currency: (acc?.default_currency as string | null) ?? 'EUR',
    default_language: (acc?.default_language as string | null) ?? 'it',
    short_description: entity.short_description,
    pet_policy: normalizePetPolicy(acc?.pet_policy),
  } satisfies PublicPropertyRow

  const [ratePlans, upsells] = await Promise.all([
    getPublicRatePlans(supabase, entity.id),
    getPublicUpsells(supabase, entity.id),
  ])

  const firstPublicRatePlan = ratePlans[0] ?? null
  const cancellationPolicyText = firstPublicRatePlan
    ? generatePolicyText(firstPublicRatePlan.cancellation_policy, ((acc?.default_language as string | undefined) ?? 'it') as 'it' | 'en' | 'de')
    : null

  return {
    property,
    ratePlans,
    upsells,
    defaultRatePlanId: firstPublicRatePlan?.id ?? null,
    cancellationPolicyText,
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
  guests: number,
  ratePlanId?: string
): Promise<AvailabilityItem[]> {
  const results = await checkAvailability({ entityId, checkIn, checkOut, guests, ratePlanId })

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
  ratePlanId?: string | null
  checkIn: string
  checkOut: string
  adults: number
  children: number
  infants?: number
  petCount: number
  petDetails?: string
  guestName: string
  guestEmail: string
  guestPhone: string
  nationality?: string
  documentType?: string
  documentNumber?: string
  documentIssuedBy?: string
  documentIssuedDate?: string
  documentExpiryDate?: string
  documentCountry?: string
  address?: string
  city?: string
  province?: string
  zip?: string
  country?: string
  fiscalCode?: string
  companyName?: string
  companyVat?: string
  companySdi?: string
  companyPec?: string
  preferences?: string
  childrenAges?: string
  privacyConsent: boolean
  marketingConsent?: boolean
  selectedUpsells?: Array<{ offerId: string; quantity: number }>
  specialRequests?: string
}): Promise<ActionResult> {
  const supabase = await createServiceRoleClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id, accommodation:accommodations(default_currency)')
    .eq('id', input.entityId)
    .eq('is_active', true)
    .maybeSingle()

  if (!entity) {
    return { success: false, error: 'Struttura non trovata.' }
  }

  const entityAcc = Array.isArray((entity as { accommodation?: unknown }).accommodation)
    ? ((entity as { accommodation: Array<{ default_currency?: string }> }).accommodation[0] ?? null)
    : (entity as { accommodation?: { default_currency?: string } | null }).accommodation
  const entityCurrency = entityAcc?.default_currency ?? 'EUR'

  const availability = await checkAvailability({
    entityId: input.entityId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.adults + input.children,
    ratePlanId: input.ratePlanId ?? undefined,
  })

  const roomTypeAvail = availability.find((a) => a.roomType.id === input.roomTypeId)
  if (!roomTypeAvail || roomTypeAvail.availableRooms < 1) {
    return { success: false, error: 'La tipologia selezionata non è più disponibile per le date scelte.' }
  }

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(input.checkOut).getTime() - new Date(input.checkIn).getTime()) / (1000 * 60 * 60 * 24)
    )
  )
  const bookingOffer = buildStayOffer({
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    basePricePerNight: roomTypeAvail.roomType.base_price,
    season: roomTypeAvail.season,
    ratePrice: roomTypeAvail.ratePrice,
  })

  if (!bookingOffer.allowed) {
    return { success: false, error: bookingOffer.error || 'Tariffa non disponibile per le date selezionate.' }
  }

  const roomTotal = bookingOffer.totalPrice

  const { data: ratePlan } = input.ratePlanId
    ? await supabase
        .from('rate_plans')
        .select('id, name, meal_plan, cancellation_policy, is_public, is_active')
        .eq('entity_id', input.entityId)
        .eq('id', input.ratePlanId)
        .eq('is_public', true)
        .eq('is_active', true)
        .maybeSingle()
    : await supabase
        .from('rate_plans')
        .select('id, name, meal_plan, cancellation_policy, is_public, is_active')
        .eq('entity_id', input.entityId)
        .eq('is_public', true)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle()

  if (!ratePlan) {
    return { success: false, error: 'Tariffa pubblica non disponibile per questa struttura.' }
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

  const selectedUpsellIds = (input.selectedUpsells ?? [])
    .map((item) => ({
      offerId: item.offerId,
      quantity: Math.max(1, Math.floor(item.quantity || 1)),
    }))
    .filter((item) => Boolean(item.offerId))

  let upsellTotal = 0
  let upsellOrdersToInsert: Array<Record<string, unknown>> = []

  if (selectedUpsellIds.length > 0) {
    const offerIds = Array.from(new Set(selectedUpsellIds.map((item) => item.offerId)))
    const { data: offers, error: offersErr } = await supabase
      .from('upsell_offers')
      .select('id, name, price, is_active, online_bookable, requires_request, max_quantity')
      .eq('entity_id', input.entityId)
      .in('id', offerIds)

    if (offersErr || !offers) {
      console.error('[createPublicBooking] upsell offers load error', offersErr)
      return { success: false, error: 'Errore nel caricamento degli extra selezionati.' }
    }

    const offerById = new Map(offers.map((offer) => [offer.id, offer]))
    for (const selection of selectedUpsellIds) {
      const offer = offerById.get(selection.offerId)
      if (!offer || !offer.is_active || !offer.online_bookable) {
        return { success: false, error: 'Uno degli extra selezionati non è più disponibile.' }
      }
      const quantity = offer.max_quantity != null ? Math.min(selection.quantity, offer.max_quantity) : selection.quantity
      const totalPrice = Number(offer.price) * quantity
      upsellTotal += totalPrice
      upsellOrdersToInsert.push({
        entity_id: input.entityId,
        reservation_id: '',
        offer_id: offer.id,
        guest_id: '',
        quantity,
        unit_price: Number(offer.price),
        total_price: totalPrice,
        requested_date: input.checkIn,
        notes: null,
        status: offer.requires_request ? 'pending' : 'confirmed',
        source: 'guest_portal',
      })
    }
  }

  // Usiamo il service role client per bypassare RLS: questa è una action pubblica
  // chiamata da un ospite non autenticato, non ha entità su get_user_entity_ids().
  const serviceClient = await createServiceRoleClient()

  const { firstName, lastName } = splitGuestName(input.guestName)
  const childrenAges = (input.childrenAges ?? '')
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value >= 0)
  const preferences = {
    ...(input.preferences ? { notes: input.preferences } : {}),
    ...(childrenAges.length > 0 ? { children_ages: childrenAges } : {}),
    ...(input.nationality ? { nationality: input.nationality } : {}),
  }

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
    const { error: guestUpdateError } = await serviceClient
      .from('guests')
      .update({
        first_name: firstName || input.guestName,
        last_name: lastName || '',
        email: input.guestEmail,
        phone: input.guestPhone || null,
        nationality: normalizeCountry(input.nationality),
        document_type: normalizeText(input.documentType),
        document_number: normalizeText(input.documentNumber),
        document_issued_by: normalizeText(input.documentIssuedBy),
        document_issued_date: normalizeText(input.documentIssuedDate),
        document_expiry_date: normalizeText(input.documentExpiryDate),
        document_country: normalizeText(input.documentCountry),
        address: normalizeText(input.address),
        city: normalizeText(input.city),
        province: normalizeText(input.province),
        zip: normalizeText(input.zip),
        country: normalizeText(input.country),
        fiscal_code: normalizeText(input.fiscalCode),
        company_name: normalizeText(input.companyName),
        company_vat: normalizeText(input.companyVat),
        company_sdi: normalizeText(input.companySdi),
        company_pec: normalizeText(input.companyPec),
        preferences,
        privacy_consent: input.privacyConsent,
        privacy_consent_date: input.privacyConsent ? new Date().toISOString() : null,
        marketing_consent: Boolean(input.marketingConsent),
        marketing_consent_date: input.marketingConsent ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingGuest.id)

    if (guestUpdateError) {
      console.error('[createPublicBooking] guest update error', guestUpdateError)
      return { success: false, error: 'Errore nell\'aggiornamento del profilo ospite.' }
    }
  } else {
    const { data: newGuest, error: guestErr } = await serviceClient
      .from('guests')
      .insert({
        entity_id: input.entityId,
        first_name: firstName || input.guestName,
        last_name: lastName || '',
        email: input.guestEmail,
        phone: input.guestPhone || null,
        nationality: normalizeCountry(input.nationality),
        document_type: normalizeText(input.documentType),
        document_number: normalizeText(input.documentNumber),
        document_issued_by: normalizeText(input.documentIssuedBy),
        document_issued_date: normalizeText(input.documentIssuedDate),
        document_expiry_date: normalizeText(input.documentExpiryDate),
        document_country: normalizeText(input.documentCountry),
        address: normalizeText(input.address),
        city: normalizeText(input.city),
        province: normalizeText(input.province),
        zip: normalizeText(input.zip),
        country: normalizeText(input.country),
        fiscal_code: normalizeText(input.fiscalCode),
        company_name: normalizeText(input.companyName),
        company_vat: normalizeText(input.companyVat),
        company_sdi: normalizeText(input.companySdi),
        company_pec: normalizeText(input.companyPec),
        preferences,
        privacy_consent: input.privacyConsent,
        privacy_consent_date: input.privacyConsent ? new Date().toISOString() : null,
        marketing_consent: Boolean(input.marketingConsent),
        marketing_consent_date: input.marketingConsent ? new Date().toISOString() : null,
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
  const petSupplement = calculatePetSupplement(petPolicy, input.petCount, nights)

  const specialRequests = [
    normalizeText(input.specialRequests),
    input.childrenAges ? `Età bambini: ${input.childrenAges}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  const bookingTotal = Math.max(0, roomTotal + petSupplement + upsellTotal)

  const { data: reservation, error: resErr } = await serviceClient
    .from('reservations')
    .insert({
      entity_id: input.entityId,
      reservation_code: reservationCode,
      guest_id: guestId,
      room_type_id: input.roomTypeId,
      rate_plan_id: ratePlan.id,
      check_in: input.checkIn,
      check_out: input.checkOut,
      status: 'confirmed',
      source: 'website',
      adults: input.adults,
      children: input.children,
      infants: input.infants ?? 0,
      pet_count: input.petCount,
      pet_details: petDetailsJson,
      meal_plan: ratePlan.meal_plan,
      total_amount: bookingTotal,
      paid_amount: 0,
      currency: entityCurrency,
      special_requests: specialRequests || null,
    })
    .select('id, reservation_code, check_in, check_out, total_amount')
    .single()

  if (resErr || !reservation) {
    console.error('[createPublicBooking] reservation insert error', resErr)
    return { success: false, error: 'Errore nella creazione della prenotazione.' }
  }

  if (upsellOrdersToInsert.length > 0) {
    const ordersWithReservation = upsellOrdersToInsert.map((order) => ({
      ...order,
      reservation_id: reservation.id,
      guest_id: guestId,
    }))

    const { error: upsellInsertError } = await serviceClient
      .from('upsell_orders')
      .insert(ordersWithReservation)

    if (upsellInsertError) {
      console.error('[createPublicBooking] upsell orders insert error', upsellInsertError)
    }
  }

  return {
    success: true,
    data: {
      reservationCode: reservation.reservation_code,
      reservationId: reservation.id,
      checkIn: reservation.check_in,
      checkOut: reservation.check_out,
      totalAmount: reservation.total_amount,
      currency: entityCurrency,
      ratePlanId: ratePlan.id,
      upsellTotal,
    },
  }
}
