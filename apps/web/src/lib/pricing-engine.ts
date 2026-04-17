import 'server-only'
import { createServiceRoleClient } from '@touracore/db/server'

/**
 * Dynamic pricing engine: calcola suggested_price per (entity, room_type, date) basato su:
 * - Occupancy attuale (avg ultimi 30gg + booking next 30gg)
 * - Lead time (days until check_in)
 * - Day of week
 * - Pricing rules attive
 *
 * Genera entries in pricing_suggestions per ogni combinazione future-30gg.
 */

export interface PricingContext {
  entityId: string
  roomTypeId: string
  ratePlanId: string
  serviceDate: string
  currentPrice: number
  occupancyPct: number
  leadTimeDays: number
  dayOfWeek: number
  isWeekend: boolean
}

export interface PricingRule {
  id: string
  rule_type: string
  config: Record<string, unknown>
  adjustment_type: 'percent' | 'fixed'
  adjustment_value: number
  priority: number
  applies_to_room_types: string[]
}

export function computeSuggestedPrice(ctx: PricingContext, rules: PricingRule[]): { price: number; reason: string; confidencePct: number } {
  let price = ctx.currentPrice
  const reasons: string[] = []
  let totalConfidence = 70

  // Sort rules by priority desc
  const sorted = [...rules].sort((a, b) => b.priority - a.priority)

  for (const rule of sorted) {
    // Filter by room type
    if (rule.applies_to_room_types.length > 0 && !rule.applies_to_room_types.includes(ctx.roomTypeId)) continue

    let applies = false

    if (rule.rule_type === 'occupancy_based') {
      const threshold = (rule.config.thresholdPct as number) ?? 70
      const direction = (rule.config.direction as 'above' | 'below') ?? 'above'
      if (direction === 'above' && ctx.occupancyPct >= threshold) applies = true
      if (direction === 'below' && ctx.occupancyPct < threshold) applies = true
    }

    if (rule.rule_type === 'lead_time') {
      const minDays = (rule.config.minDays as number) ?? 0
      const maxDays = (rule.config.maxDays as number) ?? 999
      if (ctx.leadTimeDays >= minDays && ctx.leadTimeDays <= maxDays) applies = true
    }

    if (rule.rule_type === 'day_of_week') {
      const days = (rule.config.days as number[]) ?? []
      if (days.includes(ctx.dayOfWeek)) applies = true
    }

    if (rule.rule_type === 'last_minute' && ctx.leadTimeDays <= 3) applies = true
    if (rule.rule_type === 'early_bird' && ctx.leadTimeDays >= 60) applies = true

    if (applies) {
      const delta = rule.adjustment_type === 'percent'
        ? price * (rule.adjustment_value / 100)
        : rule.adjustment_value
      price += delta
      reasons.push(`${rule.rule_type}${delta >= 0 ? '+' : ''}${delta.toFixed(0)}€`)
      totalConfidence = Math.min(95, totalConfidence + 5)
    }
  }

  // Default rules baseline (always apply if no custom rules)
  if (rules.length === 0) {
    if (ctx.isWeekend) {
      price *= 1.15
      reasons.push('weekend +15%')
    }
    if (ctx.leadTimeDays <= 3 && ctx.occupancyPct < 50) {
      price *= 0.85
      reasons.push('last-minute discount -15%')
    }
    if (ctx.occupancyPct > 85) {
      price *= 1.20
      reasons.push('high occupancy +20%')
    }
  }

  return {
    price: Math.round(price * 100) / 100,
    reason: reasons.length > 0 ? reasons.join(', ') : 'no adjustment',
    confidencePct: totalConfidence,
  }
}

export async function generateSuggestionsForEntity(entityId: string, daysAhead: number = 30): Promise<number> {
  const admin = await createServiceRoleClient()

  const { data: rules } = await admin
    .from('pricing_rules')
    .select('id, rule_type, config, adjustment_type, adjustment_value, priority, applies_to_room_types')
    .eq('entity_id', entityId)
    .eq('active', true)

  const { data: roomTypes } = await admin
    .from('room_types')
    .select('id')
    .eq('entity_id', entityId)
    .eq('is_active', true)

  if (!roomTypes || roomTypes.length === 0) return 0

  const today = new Date()
  let generated = 0

  for (const rt of roomTypes) {
    // Carica current rates avg
    const { data: currentRates } = await admin
      .from('rates')
      .select('price, rate_plan_id')
      .eq('room_type_id', rt.id)
      .gte('date', today.toISOString().slice(0, 10))
      .limit(1)

    const currentPrice = Number(currentRates?.[0]?.price ?? 100)
    const ratePlanId = (currentRates?.[0]?.rate_plan_id as string) ?? null

    // Calc occupancy proxy: count reservations next 30gg / available
    const { count: bookingsCount } = await admin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('room_type_id', rt.id)
      .gte('check_in', today.toISOString().slice(0, 10))
      .lte('check_in', new Date(today.getTime() + daysAhead * 86400_000).toISOString().slice(0, 10))
      .in('status', ['confirmed', 'checked_in'])

    const occupancyPct = Math.min(100, ((bookingsCount ?? 0) / Math.max(daysAhead, 1)) * 100)

    for (let day = 0; day < daysAhead; day++) {
      const date = new Date(today.getTime() + day * 86400_000)
      const dateStr = date.toISOString().slice(0, 10)

      const result = computeSuggestedPrice({
        entityId,
        roomTypeId: rt.id as string,
        ratePlanId: ratePlanId ?? '',
        serviceDate: dateStr,
        currentPrice,
        occupancyPct,
        leadTimeDays: day,
        dayOfWeek: date.getDay(),
        isWeekend: date.getDay() === 0 || date.getDay() === 5 || date.getDay() === 6,
      }, (rules ?? []) as PricingRule[])

      await admin.from('pricing_suggestions').upsert({
        entity_id: entityId,
        room_type_id: rt.id,
        rate_plan_id: ratePlanId,
        service_date: dateStr,
        current_price: currentPrice,
        suggested_price: result.price,
        confidence_pct: result.confidencePct,
        reason: result.reason,
        applied: false,
      }, { onConflict: 'entity_id,room_type_id,rate_plan_id,service_date' })
      generated++
    }
  }

  return generated
}
