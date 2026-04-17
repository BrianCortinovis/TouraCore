import 'server-only'
import { createServiceRoleClient } from '@touracore/db/server'
import { computePrice, type PricingRule } from '@touracore/pricing'

/**
 * Hospitality pricing engine wrapper.
 * Carica rules da pricing_rules + calcola via @touracore/pricing core.
 */

export async function generateSuggestionsForEntity(entityId: string, daysAhead: number = 30): Promise<number> {
  const admin = await createServiceRoleClient()

  const { data: rulesRaw } = await admin
    .from('pricing_rules')
    .select('id, rule_type, name, config, adjustment_type, adjustment_value, priority, applies_to_room_types, valid_from, valid_to')
    .eq('entity_id', entityId)
    .eq('active', true)

  const rules: PricingRule[] = (rulesRaw ?? []).map((r) => ({
    id: r.id as string,
    ruleType: r.rule_type as PricingRule['ruleType'],
    name: r.name as string,
    appliesTo: ['room', 'any'],
    resourceFilter: (r.applies_to_room_types as string[]) ?? [],
    config: r.config as Record<string, unknown>,
    adjustmentType: r.adjustment_type as 'percent' | 'fixed',
    adjustmentValue: Number(r.adjustment_value),
    priority: r.priority as number,
    active: true,
    validFrom: r.valid_from as string | undefined,
    validTo: r.valid_to as string | undefined,
  }))

  const { data: roomTypes } = await admin
    .from('room_types')
    .select('id')
    .eq('entity_id', entityId)
    .eq('is_active', true)

  if (!roomTypes || roomTypes.length === 0) return 0

  const today = new Date()
  let generated = 0

  for (const rt of roomTypes) {
    const { data: currentRates } = await admin
      .from('rates')
      .select('price, rate_plan_id')
      .eq('room_type_id', rt.id)
      .gte('date', today.toISOString().slice(0, 10))
      .limit(1)

    const currentPrice = Number(currentRates?.[0]?.price ?? 100)
    const ratePlanId = (currentRates?.[0]?.rate_plan_id as string) ?? null

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

      const result = computePrice({
        serviceDate: dateStr,
        basePrice: currentPrice,
        appliesTo: 'room',
        resourceId: rt.id as string,
        occupancyPct,
        leadTimeDays: day,
      }, rules)

      await admin.from('pricing_suggestions').upsert({
        entity_id: entityId,
        room_type_id: rt.id,
        rate_plan_id: ratePlanId,
        service_date: dateStr,
        current_price: currentPrice,
        suggested_price: result.finalPrice,
        confidence_pct: result.confidencePct,
        reason: result.reason,
        applied: false,
      }, { onConflict: 'entity_id,room_type_id,rate_plan_id,service_date' })
      generated++
    }
  }

  return generated
}

/**
 * Restaurant pricing engine: cover/table/item-based.
 * Genera suggestions per service_date × table o cover dynamic pricing.
 */
export async function generateRestaurantSuggestions(restaurantId: string, daysAhead: number = 30): Promise<number> {
  const admin = await createServiceRoleClient()

  const { data: rulesRaw } = await admin
    .from('restaurant_pricing_rules')
    .select('id, rule_type, name, config, adjustment_type, adjustment_value, priority, applies_to, applies_to_table_ids, applies_to_menu_item_ids, valid_from, valid_to')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)

  const rules: PricingRule[] = (rulesRaw ?? []).map((r) => ({
    id: r.id as string,
    ruleType: r.rule_type as PricingRule['ruleType'],
    name: r.name as string,
    appliesTo: [r.applies_to as PricingRule['appliesTo'][number]],
    resourceFilter: r.applies_to === 'table'
      ? (r.applies_to_table_ids as string[]) ?? []
      : r.applies_to === 'item'
        ? (r.applies_to_menu_item_ids as string[]) ?? []
        : [],
    config: r.config as Record<string, unknown>,
    adjustmentType: r.adjustment_type as 'percent' | 'fixed',
    adjustmentValue: Number(r.adjustment_value),
    priority: r.priority as number,
    active: true,
    validFrom: r.valid_from as string | undefined,
    validTo: r.valid_to as string | undefined,
  }))

  // Carica restaurant config per cover_charge base
  const { data: rest } = await admin
    .from('restaurants')
    .select('tax_config')
    .eq('id', restaurantId)
    .single()

  const baseCoverCharge = Number((rest?.tax_config as { cover_charge?: number })?.cover_charge ?? 2)

  const today = new Date()
  let generated = 0

  for (let day = 0; day < daysAhead; day++) {
    const date = new Date(today.getTime() + day * 86400_000)
    const dateStr = date.toISOString().slice(0, 10)

    // Compute cover suggestion for tipica time slot 20:00
    const result = computePrice({
      serviceDate: dateStr,
      basePrice: baseCoverCharge,
      appliesTo: 'cover',
      leadTimeDays: day,
      timeOfDay: '20:00',
    }, rules)

    await admin.from('restaurant_pricing_suggestions').upsert({
      restaurant_id: restaurantId,
      applies_to: 'cover',
      resource_id: null,
      service_date: dateStr,
      time_slot: '20:00:00',
      current_price: baseCoverCharge,
      suggested_price: result.finalPrice,
      confidence_pct: result.confidencePct,
      reason: result.reason,
      applied: false,
    }, { onConflict: 'restaurant_id,applies_to,resource_id,service_date,time_slot' })
    generated++
  }

  return generated
}
