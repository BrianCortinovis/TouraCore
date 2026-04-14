'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import { syncRatesForOrg } from '../stubs/integrations/channel-manager'
import type { RateType, MealPlan, Json } from '../types/database'
import {
  stayDiscountsToJson,
  validateAllowedWeekdays,
  validateStayDiscounts,
} from '../lib/rates/stay-rules'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateRatePlanData {
  entity_id: string
  name: string
  code?: string | null
  rate_type?: RateType
  meal_plan?: MealPlan
  description?: string | null
  cancellation_policy?: Json
  is_derived?: boolean
  parent_rate_plan_id?: string | null
  derivation_rule?: Json | null
  is_public?: boolean
  is_active?: boolean
  sort_order?: number
}

export interface UpdateRatePlanData {
  name?: string
  code?: string | null
  rate_type?: RateType
  meal_plan?: MealPlan
  description?: string | null
  cancellation_policy?: Json
  is_derived?: boolean
  parent_rate_plan_id?: string | null
  derivation_rule?: Json | null
  is_public?: boolean
  is_active?: boolean
  sort_order?: number
}

export interface CreateSeasonData {
  entity_id: string
  name: string
  color?: string
  date_from: string
  date_to: string
  price_modifier?: number
  min_stay?: number
  max_stay?: number | null
  allowed_arrival_days?: number[]
  allowed_departure_days?: number[]
  stay_discounts?: Json
}

export interface UpdateSeasonData {
  name?: string
  color?: string
  date_from?: string
  date_to?: string
  price_modifier?: number
  min_stay?: number
  max_stay?: number | null
  allowed_arrival_days?: number[]
  allowed_departure_days?: number[]
  stay_discounts?: Json
}

export interface SetRatePriceData {
  price_per_night: number
  price_single_use?: number | null
  extra_adult?: number
  extra_child?: number
  min_stay?: number
  max_stay?: number | null
  closed_to_arrival?: boolean
  closed_to_departure?: boolean
  stop_sell?: boolean
  allowed_arrival_days?: number[] | null
  allowed_departure_days?: number[] | null
  stay_discounts?: Json | null
}

// ---------------------------------------------------------------------------
// Rate Plan Actions
// ---------------------------------------------------------------------------

/**
 * Create a new rate plan.
 */
export async function createRatePlan(data: CreateRatePlanData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.name) throw new Error('name is required')

  const supabase = await createServerSupabaseClient()

  const { data: ratePlan, error } = await supabase
    .from('rate_plans')
    .insert({
      entity_id: data.entity_id,
      name: data.name,
      code: data.code ?? null,
      rate_type: data.rate_type ?? 'standard',
      meal_plan: data.meal_plan ?? 'room_only',
      description: data.description ?? null,
      cancellation_policy: data.cancellation_policy ?? {},
      is_derived: data.is_derived ?? false,
      parent_rate_plan_id: data.parent_rate_plan_id ?? null,
      derivation_rule: data.derivation_rule ?? null,
      is_public: data.is_public ?? true,
      is_active: data.is_active ?? true,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create rate plan: ${error.message}`)

  revalidatePath('/rates')
  return ratePlan
}

/**
 * Partially update a rate plan.
 */
export async function updateRatePlan(id: string, data: UpdateRatePlanData) {
  if (!id) throw new Error('Rate plan id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  let query = supabase
    .from('rate_plans')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: ratePlan, error } = await query.select().single()

  if (error) throw new Error(`Failed to update rate plan: ${error.message}`)

  revalidatePath('/rates')
  return ratePlan
}

/**
 * Toggle the is_active flag on a rate plan.
 */
export async function toggleRatePlan(id: string, isActive: boolean) {
  if (!id) throw new Error('Rate plan id is required')
  if (typeof isActive !== 'boolean') throw new Error('isActive must be a boolean')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  let query = supabase
    .from('rate_plans')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: ratePlan, error } = await query.select().single()

  if (error) throw new Error(`Failed to toggle rate plan: ${error.message}`)

  revalidatePath('/rates')
  return ratePlan
}

// ---------------------------------------------------------------------------
// Season Actions
// ---------------------------------------------------------------------------

/**
 * Create a new season.
 */
export async function createSeason(data: CreateSeasonData) {
  if (!data.entity_id) throw new Error('entity_id is required')
  if (!data.name) throw new Error('name is required')
  if (!data.date_from) throw new Error('date_from is required')
  if (!data.date_to) throw new Error('date_to is required')
  if (data.max_stay != null && data.max_stay < 1) throw new Error('max_stay deve essere almeno 1')
  if (data.max_stay != null && (data.min_stay ?? 1) > data.max_stay) {
    throw new Error('Il soggiorno massimo deve essere uguale o superiore al minimo')
  }
  const allowedArrivalDays = validateAllowedWeekdays(data.allowed_arrival_days ?? [], 'Giorni di arrivo')
  const allowedDepartureDays = validateAllowedWeekdays(data.allowed_departure_days ?? [], 'Giorni di partenza')
  const stayDiscounts = validateStayDiscounts(data.stay_discounts ?? [])

  const supabase = await createServerSupabaseClient()

  const { data: season, error } = await supabase
    .from('seasons')
    .insert({
      entity_id: data.entity_id,
      name: data.name,
      color: data.color ?? '#3b82f6',
      date_from: data.date_from,
      date_to: data.date_to,
      price_modifier: data.price_modifier ?? 1.0,
      min_stay: data.min_stay ?? 1,
      max_stay: data.max_stay ?? null,
      allowed_arrival_days: allowedArrivalDays,
      allowed_departure_days: allowedDepartureDays,
      stay_discounts: stayDiscountsToJson(stayDiscounts),
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create season: ${error.message}`)

  revalidatePath('/rates')
  return season
}

/**
 * Partially update a season.
 */
export async function updateSeason(id: string, data: UpdateSeasonData) {
  if (!id) throw new Error('Season id is required')
  if (data.max_stay != null && data.max_stay < 1) throw new Error('max_stay deve essere almeno 1')
  if (data.max_stay != null && data.min_stay != null && data.min_stay > data.max_stay) {
    throw new Error('Il soggiorno massimo deve essere uguale o superiore al minimo')
  }
  const payload = { ...data } as Record<string, unknown>

  if (Object.prototype.hasOwnProperty.call(data, 'allowed_arrival_days')) {
    payload.allowed_arrival_days = validateAllowedWeekdays(data.allowed_arrival_days ?? [], 'Giorni di arrivo')
  }

  if (Object.prototype.hasOwnProperty.call(data, 'allowed_departure_days')) {
    payload.allowed_departure_days = validateAllowedWeekdays(data.allowed_departure_days ?? [], 'Giorni di partenza')
  }

  if (Object.prototype.hasOwnProperty.call(data, 'stay_discounts')) {
    payload.stay_discounts = stayDiscountsToJson(validateStayDiscounts(data.stay_discounts ?? []))
  }

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  // seasons table does not have an updated_at column
  let query = supabase
    .from('seasons')
    .update(payload)
    .eq('id', id)

  if (orgId) query = query.eq('entity_id', orgId)

  const { data: season, error } = await query.select().single()

  if (error) throw new Error(`Failed to update season: ${error.message}`)

  revalidatePath('/rates')
  return season
}

// ---------------------------------------------------------------------------
// Rate Price Actions
// ---------------------------------------------------------------------------

/**
 * Set (upsert) a rate price for a given rate plan, room type, and season.
 *
 * The season provides the date_from/date_to window. If a rate_price already
 * exists for the same (rate_plan_id, room_type_id, date_from, date_to)
 * combination, it is updated. Otherwise a new record is created.
 */
export async function setRatePrice(
  ratePlanId: string,
  roomTypeId: string,
  seasonId: string,
  prices: SetRatePriceData,
  opts?: { skipChannelSync?: boolean }
) {
  if (!ratePlanId) throw new Error('ratePlanId is required')
  if (!roomTypeId) throw new Error('roomTypeId is required')
  if (!seasonId) throw new Error('seasonId is required')
  if (prices.price_per_night == null) throw new Error('price_per_night is required')
  if (prices.max_stay != null && prices.max_stay < 1) throw new Error('max_stay deve essere almeno 1')
  if ((prices.min_stay ?? 1) > (prices.max_stay ?? Number.MAX_SAFE_INTEGER)) {
    throw new Error('Il soggiorno massimo deve essere uguale o superiore al minimo')
  }
  const allowedArrivalDays = prices.allowed_arrival_days == null
    ? null
    : validateAllowedWeekdays(prices.allowed_arrival_days, 'Giorni di arrivo')
  const allowedDepartureDays = prices.allowed_departure_days == null
    ? null
    : validateAllowedWeekdays(prices.allowed_departure_days, 'Giorni di partenza')
  const stayDiscounts = prices.stay_discounts == null
    ? null
    : validateStayDiscounts(prices.stay_discounts)

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) {
    throw new Error('Unauthorized')
  }

  const { data: season, error: seasonError } = await supabase
    .from('seasons')
    .select('entity_id, date_from, date_to, min_stay, max_stay, allowed_arrival_days, allowed_departure_days, stay_discounts')
    .eq('id', seasonId)
    .eq('entity_id', orgId)
    .single()

  if (seasonError || !season) {
    throw new Error(`Season not found: ${seasonError?.message ?? 'unknown error'}`)
  }

  const { data: ratePlan, error: ratePlanError } = await supabase
    .from('rate_plans')
    .select('id')
    .eq('id', ratePlanId)
    .eq('entity_id', orgId)
    .single()

  if (ratePlanError || !ratePlan) {
    throw new Error(`Rate plan not found: ${ratePlanError?.message ?? 'unknown error'}`)
  }

  const { data: roomType, error: roomTypeError } = await supabase
    .from('room_types')
    .select('id')
    .eq('id', roomTypeId)
    .eq('entity_id', orgId)
    .single()

  if (roomTypeError || !roomType) {
    throw new Error(`Room type not found: ${roomTypeError?.message ?? 'unknown error'}`)
  }

  const { data: existing, error: findError } = await supabase
    .from('rate_prices')
    .select('id')
    .eq('rate_plan_id', ratePlanId)
    .eq('room_type_id', roomTypeId)
    .eq('date_from', season.date_from)
    .eq('date_to', season.date_to)
    .maybeSingle()

  if (findError) throw new Error(`Failed to look up existing rate price: ${findError.message}`)

  const pricePayload = {
    price_per_night: prices.price_per_night,
    price_single_use: prices.price_single_use ?? null,
    extra_adult: prices.extra_adult ?? 0,
    extra_child: prices.extra_child ?? 0,
    min_stay: prices.min_stay ?? season.min_stay ?? 1,
    max_stay: prices.max_stay ?? season.max_stay ?? null,
    closed_to_arrival: prices.closed_to_arrival ?? false,
    closed_to_departure: prices.closed_to_departure ?? false,
    stop_sell: prices.stop_sell ?? false,
    allowed_arrival_days: allowedArrivalDays ?? season.allowed_arrival_days ?? [],
    allowed_departure_days: allowedDepartureDays ?? season.allowed_departure_days ?? [],
    stay_discounts: stayDiscounts == null
      ? (season.stay_discounts ?? [])
      : stayDiscountsToJson(stayDiscounts),
    updated_at: new Date().toISOString(),
  }

  let ratePrice

  if (existing) {
    const { data, error } = await supabase
      .from('rate_prices')
      .update(pricePayload)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw new Error(`Failed to update rate price: ${error.message}`)
    ratePrice = data
  } else {
    const { data, error } = await supabase
      .from('rate_prices')
      .insert({
        rate_plan_id: ratePlanId,
        room_type_id: roomTypeId,
        date_from: season.date_from,
        date_to: season.date_to,
        ...pricePayload,
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create rate price: ${error.message}`)
    ratePrice = data
  }

  if (!opts?.skipChannelSync) {
    syncRatesForOrg(season.entity_id, { ratePlanId }).catch((err) =>
      console.error('[Rates] Errore sync rates post-save:', err)
    )
  }

  revalidatePath('/rates')
  return ratePrice
}

// ---------------------------------------------------------------------------
// Delete Actions
// ---------------------------------------------------------------------------

/**
 * Delete a rate plan and all its associated rate prices.
 */
export async function deleteRatePlan(id: string) {
  if (!id) throw new Error('Rate plan id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  // Delete associated rate_prices first
  const { error: pricesError } = await supabase
    .from('rate_prices')
    .delete()
    .eq('rate_plan_id', id)

  if (pricesError) throw new Error(`Failed to delete rate prices: ${pricesError.message}`)

  let deleteQuery = supabase
    .from('rate_plans')
    .delete()
    .eq('id', id)

  if (orgId) deleteQuery = deleteQuery.eq('entity_id', orgId)

  const { error } = await deleteQuery

  if (error) throw new Error(`Failed to delete rate plan: ${error.message}`)

  revalidatePath('/rates')
  return { success: true }
}

/**
 * Delete a season and all associated rate prices within its date range.
 */
export async function deleteSeason(id: string) {
  if (!id) throw new Error('Season id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  // Get the season to know date range
  let seasonQuery = supabase
    .from('seasons')
    .select('date_from, date_to')
    .eq('id', id)

  if (orgId) seasonQuery = seasonQuery.eq('entity_id', orgId)

  const { data: season, error: seasonError } = await seasonQuery.single()

  if (seasonError || !season) throw new Error(`Season not found: ${seasonError?.message ?? 'unknown'}`)

  const { data: roomTypes, error: roomTypesError } = await supabase
    .from('room_types')
    .select('id')
    .eq('entity_id', orgId)

  if (roomTypesError) {
    throw new Error(`Failed to fetch room types: ${roomTypesError.message}`)
  }

  const roomTypeIds = (roomTypes ?? []).map((roomType) => roomType.id)

  let pricesDeleteQuery = supabase
    .from('rate_prices')
    .delete()
    .eq('date_from', season.date_from)
    .eq('date_to', season.date_to)

  if (roomTypeIds.length > 0) {
    pricesDeleteQuery = pricesDeleteQuery.in('room_type_id', roomTypeIds)
  }

  const { error: pricesError } = await pricesDeleteQuery

  if (pricesError) throw new Error(`Failed to delete rate prices: ${pricesError.message}`)

  let deleteQuery = supabase
    .from('seasons')
    .delete()
    .eq('id', id)

  if (orgId) deleteQuery = deleteQuery.eq('entity_id', orgId)

  const { error } = await deleteQuery

  if (error) throw new Error(`Failed to delete season: ${error.message}`)

  revalidatePath('/rates')
  return { success: true }
}

export async function syncRatesToOctorate(ratePlanId: string) {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id

  if (!orgId) {
    throw new Error('Unauthorized')
  }

  const { data: ratePlan, error } = await supabase
    .from('rate_plans')
    .select('id, entity_id')
    .eq('id', ratePlanId)
    .eq('entity_id', orgId)
    .single()

  if (error || !ratePlan) {
    throw new Error(`Failed to fetch rate plan: ${error?.message ?? 'unknown error'}`)
  }

  const result = await syncRatesForOrg(ratePlan.entity_id, { ratePlanId })
  if (!result) {
    return { success: false, message: 'Octorate non configurato per questa struttura' }
  }

  return {
    success: result.success,
    message: result.success
      ? `${result.synced_count} tariffe sincronizzate`
      : (result.errors?.join(', ') || 'Errore sync Octorate'),
  }
}
