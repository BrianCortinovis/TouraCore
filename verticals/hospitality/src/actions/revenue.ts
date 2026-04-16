'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@touracore/db'
import { getCurrentOrg } from '../queries/auth'
import { addDays, format, getDay } from 'date-fns'
import type { PricingRuleType, Json } from '../types/database'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreatePricingRuleData {
  name: string
  rule_type: PricingRuleType
  conditions: Json
  adjustment_type: 'percentage' | 'fixed'
  adjustment_value: number
  priority: number
  is_active?: boolean
  room_type_id?: string | null
  rate_plan_id?: string | null
  valid_from?: string | null
  valid_to?: string | null
}

export interface UpdatePricingRuleData {
  name?: string
  rule_type?: PricingRuleType
  conditions?: Json
  adjustment_type?: 'percentage' | 'fixed'
  adjustment_value?: number
  priority?: number
  is_active?: boolean
  room_type_id?: string | null
  rate_plan_id?: string | null
  valid_from?: string | null
  valid_to?: string | null
}

// ---------------------------------------------------------------------------
// Pricing Rule CRUD
// ---------------------------------------------------------------------------

export async function createPricingRule(data: CreatePricingRuleData) {
  if (!data.name) throw new Error('name is required')
  if (!data.rule_type) throw new Error('rule_type is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  if (!property) throw new Error('Property not found')

  const { data: rule, error } = await supabase
    .from('pricing_rules')
    .insert({
      entity_id: property.id,
      name: data.name,
      rule_type: data.rule_type,
      conditions: data.conditions ?? {},
      adjustment_type: data.adjustment_type,
      adjustment_value: data.adjustment_value,
      priority: data.priority ?? 0,
      is_active: data.is_active ?? true,
      room_type_id: data.room_type_id ?? null,
      rate_plan_id: data.rate_plan_id ?? null,
      valid_from: data.valid_from ?? null,
      valid_to: data.valid_to ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create pricing rule: ${error.message}`)

  revalidatePath('/revenue')
  revalidatePath('/revenue/rules')
  return rule
}

export async function updatePricingRule(id: string, data: UpdatePricingRuleData) {
  if (!id) throw new Error('Pricing rule id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Property not found')

  const { data: rule, error } = await supabase
    .from('pricing_rules')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('entity_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update pricing rule: ${error.message}`)

  revalidatePath('/revenue')
  revalidatePath('/revenue/rules')
  return rule
}

export async function togglePricingRule(id: string) {
  if (!id) throw new Error('Pricing rule id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Property not found')

  // Get current state
  const { data: current, error: fetchError } = await supabase
    .from('pricing_rules')
    .select('is_active')
    .eq('id', id)
    .eq('entity_id', orgId)
    .single()

  if (fetchError || !current) throw new Error('Pricing rule not found')

  const { data: rule, error } = await supabase
    .from('pricing_rules')
    .update({
      is_active: !current.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('entity_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to toggle pricing rule: ${error.message}`)

  revalidatePath('/revenue')
  revalidatePath('/revenue/rules')
  return rule
}

export async function deletePricingRule(id: string) {
  if (!id) throw new Error('Pricing rule id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Property not found')

  const { error } = await supabase
    .from('pricing_rules')
    .delete()
    .eq('id', id)
    .eq('entity_id', orgId)

  if (error) throw new Error(`Failed to delete pricing rule: ${error.message}`)

  revalidatePath('/revenue')
  revalidatePath('/revenue/rules')
  return { success: true }
}

// ---------------------------------------------------------------------------
// Price Suggestions
// ---------------------------------------------------------------------------

export async function acceptSuggestion(id: string) {
  if (!id) throw new Error('Suggestion id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Property not found')

  const { data: suggestion, error } = await supabase
    .from('price_suggestions')
    .update({ status: 'accepted' })
    .eq('id', id)
    .eq('entity_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to accept suggestion: ${error.message}`)

  revalidatePath('/revenue')
  return suggestion
}

export async function rejectSuggestion(id: string) {
  if (!id) throw new Error('Suggestion id is required')

  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  const orgId = property?.id
  if (!orgId) throw new Error('Property not found')

  const { data: suggestion, error } = await supabase
    .from('price_suggestions')
    .update({ status: 'rejected' })
    .eq('id', id)
    .eq('entity_id', orgId)
    .select()
    .single()

  if (error) throw new Error(`Failed to reject suggestion: ${error.message}`)

  revalidatePath('/revenue')
  return suggestion
}

// ---------------------------------------------------------------------------
// Calculate Suggestions - Core Logic
// ---------------------------------------------------------------------------

export async function calculateSuggestions() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  if (!property) throw new Error('Property not found')
  const orgId = property.id

  // 1. Get all active pricing rules ordered by priority
  const { data: rules, error: rulesError } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('entity_id', orgId)
    .eq('is_active', true)
    .order('priority', { ascending: true })

  if (rulesError) throw new Error(`Failed to fetch pricing rules: ${rulesError.message}`)
  if (!rules || rules.length === 0) {
    return { success: true, message: 'Nessuna regola attiva trovata', count: 0 }
  }

  // 2. Get all room types
  const { data: roomTypes, error: rtError } = await supabase
    .from('room_types')
    .select('*')
    .eq('entity_id', orgId)
    .eq('is_active', true)

  if (rtError) throw new Error(`Failed to fetch room types: ${rtError.message}`)
  if (!roomTypes || roomTypes.length === 0) {
    return { success: true, message: 'Nessun tipo camera trovato', count: 0 }
  }

  // 3. Get total rooms per room type
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id, room_type_id')
    .eq('entity_id', orgId)
    .eq('is_active', true)

  if (roomsError) throw new Error(`Failed to fetch rooms: ${roomsError.message}`)

  const roomsByType: Record<string, number> = {}
  for (const room of rooms ?? []) {
    roomsByType[room.room_type_id] = (roomsByType[room.room_type_id] || 0) + 1
  }

  // 4. Get all reservations in the next 30 days
  const today = new Date()
  const endDate = addDays(today, 30)

  const { data: reservations, error: resError } = await supabase
    .from('reservations')
    .select('check_in, check_out, room_type_id')
    .eq('entity_id', orgId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('check_in', format(endDate, 'yyyy-MM-dd'))
    .gte('check_out', format(today, 'yyyy-MM-dd'))

  if (resError) throw new Error(`Failed to fetch reservations: ${resError.message}`)

  // 5. Get base prices from rate_prices and seasons
  const suggestions: {
    entity_id: string
    date: string
    room_type_id: string
    current_price: number
    suggested_price: number
    reason: string
    occupancy_forecast: number
    rules_applied: Json
    status: 'pending'
  }[] = []

  for (let i = 0; i < 30; i++) {
    const date = addDays(today, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayOfWeek = getDay(date) // 0=Sunday, 6=Saturday
    const daysUntil = i

    for (const roomType of roomTypes) {
      const totalRoomsForType = roomsByType[roomType.id] || 0
      if (totalRoomsForType === 0) continue

      // Calculate occupancy for this date and room type
      let occupiedCount = 0
      for (const res of reservations ?? []) {
        if (
          res.room_type_id === roomType.id &&
          res.check_in <= dateStr &&
          res.check_out > dateStr
        ) {
          occupiedCount++
        }
      }
      const occupancyPct = Math.round((Math.min(occupiedCount, totalRoomsForType) / totalRoomsForType) * 100)

      // Get base price for this date
      let basePrice = roomType.base_price

      // Check rate_prices covering this date
      const { data: ratePrices } = await supabase
        .from('rate_prices')
        .select('price_per_night')
        .eq('room_type_id', roomType.id)
        .lte('date_from', dateStr)
        .gte('date_to', dateStr)
        .limit(1)

      if (ratePrices && ratePrices.length > 0) {
        basePrice = ratePrices[0]!.price_per_night
      } else {
        // Check season modifier
        const { data: seasons } = await supabase
          .from('seasons')
          .select('price_modifier')
          .eq('entity_id', orgId)
          .lte('date_from', dateStr)
          .gte('date_to', dateStr)
          .limit(1)

        if (seasons && seasons.length > 0) {
          basePrice = Math.round(roomType.base_price * seasons[0]!.price_modifier)
        }
      }

      // Apply matching rules in priority order
      let adjustedPrice = basePrice
      const appliedRules: { name: string; type: string; adjustment: string }[] = []
      const reasons: string[] = []

      for (const rule of rules) {
        // Check if rule applies to this room type
        if (rule.room_type_id && rule.room_type_id !== roomType.id) continue

        // Check rule validity period
        if (rule.valid_from && dateStr < rule.valid_from) continue
        if (rule.valid_to && dateStr > rule.valid_to) continue

        const conditions = rule.conditions as Record<string, unknown>
        let matches = false

        switch (rule.rule_type) {
          case 'occupancy_based': {
            const minOcc = (conditions.min_occupancy as number) ?? 0
            const maxOcc = (conditions.max_occupancy as number) ?? 100
            matches = occupancyPct >= minOcc && occupancyPct <= maxOcc
            if (matches) {
              reasons.push(`Occupancy ${occupancyPct}% (soglia ${minOcc}-${maxOcc}%)`)
            }
            break
          }
          case 'day_of_week': {
            const targetDays = (conditions.days as number[]) ?? []
            matches = targetDays.includes(dayOfWeek)
            if (matches) {
              const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
              reasons.push(`Giorno: ${dayNames[dayOfWeek]}`)
            }
            break
          }
          case 'advance_booking': {
            const minDays = (conditions.min_days_advance as number) ?? 0
            const maxDays = (conditions.max_days_advance as number) ?? 365
            matches = daysUntil >= minDays && daysUntil <= maxDays
            if (matches) {
              reasons.push(`Anticipo ${daysUntil} giorni (soglia ${minDays}-${maxDays}gg)`)
            }
            break
          }
          case 'last_minute': {
            const withinDays = (conditions.within_days as number) ?? 3
            matches = daysUntil <= withinDays
            if (matches) {
              reasons.push(`Last minute (entro ${withinDays}gg)`)
            }
            break
          }
          case 'length_of_stay': {
            // This rule type checks average booking length for this date
            // We approximate by checking if there are long-stay bookings
            const minNights = (conditions.min_nights as number) ?? 3
            let hasLongStay = false
            for (const res of reservations ?? []) {
              if (
                res.room_type_id === roomType.id &&
                res.check_in <= dateStr &&
                res.check_out > dateStr
              ) {
                const ci = new Date(res.check_in)
                const co = new Date(res.check_out)
                const nights = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24))
                if (nights >= minNights) hasLongStay = true
              }
            }
            matches = hasLongStay
            if (matches) {
              reasons.push(`Soggiorno lungo (>=${minNights} notti)`)
            }
            break
          }
          case 'demand_surge': {
            const surgeThreshold = (conditions.occupancy_threshold as number) ?? 85
            matches = occupancyPct >= surgeThreshold
            if (matches) {
              reasons.push(`Picco domanda (occupancy ${occupancyPct}% >= ${surgeThreshold}%)`)
            }
            break
          }
        }

        if (matches) {
          // Apply adjustment
          if (rule.adjustment_type === 'percentage') {
            adjustedPrice = Math.round(adjustedPrice * (1 + rule.adjustment_value / 100))
          } else {
            adjustedPrice = Math.round(adjustedPrice + rule.adjustment_value)
          }

          appliedRules.push({
            name: rule.name,
            type: rule.rule_type,
            adjustment: rule.adjustment_type === 'percentage'
              ? `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_value}%`
              : `${rule.adjustment_value > 0 ? '+' : ''}${rule.adjustment_value} EUR`,
          })
        }
      }

      // Only create suggestion if price changed
      if (adjustedPrice !== basePrice && appliedRules.length > 0) {
        suggestions.push({
          entity_id: orgId,
          date: dateStr,
          room_type_id: roomType.id,
          current_price: basePrice,
          suggested_price: Math.max(adjustedPrice, 0), // Never go negative
          reason: reasons.join(' | '),
          occupancy_forecast: occupancyPct,
          rules_applied: appliedRules as unknown as Json,
          status: 'pending',
        })
      }
    }
  }

  // 6. Upsert suggestions (delete old pending ones first, then insert new)
  const { error: deleteError } = await supabase
    .from('price_suggestions')
    .delete()
    .eq('entity_id', orgId)
    .eq('status', 'pending')

  if (deleteError) throw new Error(`Failed to clear old suggestions: ${deleteError.message}`)

  if (suggestions.length > 0) {
    // Insert in batches of 100
    for (let i = 0; i < suggestions.length; i += 100) {
      const batch = suggestions.slice(i, i + 100)
      const { error: insertError } = await supabase
        .from('price_suggestions')
        .insert(batch)

      if (insertError) throw new Error(`Failed to insert suggestions: ${insertError.message}`)
    }
  }

  revalidatePath('/revenue')
  return { success: true, message: `${suggestions.length} suggerimenti generati`, count: suggestions.length }
}

// ---------------------------------------------------------------------------
// Snapshot Daily Stats
// ---------------------------------------------------------------------------

export async function snapshotDailyStats() {
  const supabase = await createServerSupabaseClient()
  const { property } = await getCurrentOrg()
  if (!property) throw new Error('Property not found')
  const orgId = property.id
  const today = format(new Date(), 'yyyy-MM-dd')

  // Get total rooms
  const { data: rooms, error: roomsError } = await supabase
    .from('rooms')
    .select('id')
    .eq('entity_id', orgId)
    .eq('is_active', true)

  if (roomsError) throw new Error(`Failed to fetch rooms: ${roomsError.message}`)
  const totalRooms = rooms?.length ?? 0

  // Count occupied rooms today
  const { data: activeRes, error: resError } = await supabase
    .from('reservations')
    .select('id, total_amount')
    .eq('entity_id', orgId)
    .in('status', ['confirmed', 'checked_in'])
    .lte('check_in', today)
    .gt('check_out', today)

  if (resError) throw new Error(`Failed to fetch reservations: ${resError.message}`)
  const occupiedRooms = activeRes?.length ?? 0
  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0

  // Revenue for today
  const revenue = (activeRes ?? []).reduce((sum, r) => sum + (r.total_amount ?? 0), 0)
  const adr = occupiedRooms > 0 ? Math.round((revenue / occupiedRooms) * 100) / 100 : 0
  const revpar = totalRooms > 0 ? Math.round((revenue / totalRooms) * 100) / 100 : 0

  // Count new bookings today
  const { count: bookingsReceived } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', orgId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`)

  // Count cancellations today
  const { count: cancellations } = await supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', orgId)
    .eq('status', 'cancelled')
    .gte('cancelled_at', `${today}T00:00:00`)
    .lte('cancelled_at', `${today}T23:59:59`)

  // Upsert daily stats
  const { data: existing } = await supabase
    .from('daily_stats')
    .select('id')
    .eq('entity_id', orgId)
    .eq('date', today)
    .maybeSingle()

  const statsPayload = {
    total_rooms: totalRooms,
    occupied_rooms: occupiedRooms,
    occupancy_pct: occupancyPct,
    revenue,
    adr,
    revpar,
    bookings_received: bookingsReceived ?? 0,
    cancellations: cancellations ?? 0,
  }

  if (existing) {
    const { error } = await supabase
      .from('daily_stats')
      .update(statsPayload)
      .eq('id', existing.id)

    if (error) throw new Error(`Failed to update daily stats: ${error.message}`)
  } else {
    const { error } = await supabase
      .from('daily_stats')
      .insert({
        entity_id: orgId,
        date: today,
        ...statsPayload,
      })

    if (error) throw new Error(`Failed to insert daily stats: ${error.message}`)
  }

  revalidatePath('/revenue')
  return { success: true, stats: { ...statsPayload, date: today } }
}
