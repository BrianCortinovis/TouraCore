/**
 * @touracore/pricing — Engine pricing condiviso cross-vertical.
 *
 * Calcola suggested_price per qualsiasi resource (room/table/bike/slot/etc)
 * applicando rules dichiarative.
 *
 * Use case:
 * - Hospitality: rooms × dates → suggested rate
 * - Restaurant: covers × time-slots → dynamic cover charge
 * - Bike: bikes × hours → seasonal pricing
 */

export type AppliesTo = 'room' | 'table' | 'cover' | 'item' | 'bike' | 'slot' | 'service' | 'any'

export type RuleType =
  | 'occupancy_based'
  | 'lead_time'
  | 'day_of_week'
  | 'season'
  | 'event'
  | 'last_minute'
  | 'early_bird'
  | 'time_of_day'
  | 'group_size'
  | 'duration_tier'
  | 'surge'
  | 'one_way_fee'
  | 'delivery_fee'

export type AdjustmentType = 'percent' | 'fixed'

export interface PricingContext {
  serviceDate: string  // YYYY-MM-DD
  basePrice: number
  appliesTo: AppliesTo
  resourceId?: string  // room_type_id, table_id, bike_id, etc
  occupancyPct?: number  // 0-100, for occupancy_based rules
  leadTimeDays?: number  // days until service
  groupSize?: number  // for group_size rules (covers, party, etc)
  timeOfDay?: string  // HH:mm
  dayOfWeek?: number  // 0-6
  isWeekend?: boolean
  // Bike rental specific
  durationHours?: number  // for duration_tier rules
  demandLevel?: number  // 0-100, current booking density for surge
  distanceKm?: number  // for one_way_fee / delivery_fee calculation
  isOneWay?: boolean
  isDelivery?: boolean
  metadata?: Record<string, unknown>
}

export interface PricingRule {
  id: string
  ruleType: RuleType
  name: string
  appliesTo: AppliesTo[]
  resourceFilter?: string[]  // optional list of resource_id
  config: Record<string, unknown>
  adjustmentType: AdjustmentType
  adjustmentValue: number
  priority: number
  active: boolean
  validFrom?: string
  validTo?: string
}

export interface PricingResult {
  basePrice: number
  finalPrice: number
  delta: number
  deltaPct: number
  appliedRules: Array<{ ruleId: string; ruleName: string; delta: number }>
  reason: string
  confidencePct: number
}

/**
 * Core pricing computation: prendi context + rules → ritorna prezzo finale.
 * Pure function, zero side effects, zero DB.
 */
export function computePrice(ctx: PricingContext, rules: PricingRule[]): PricingResult {
  const today = new Date(ctx.serviceDate + 'T00:00:00')
  const dayOfWeek = ctx.dayOfWeek ?? today.getDay()
  const isWeekend = ctx.isWeekend ?? (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6)

  let price = ctx.basePrice
  const appliedRules: PricingResult['appliedRules'] = []
  let confidence = 70

  // Filter rules: appliesTo + resourceFilter + valid date + active
  const applicableRules = rules
    .filter((r) => r.active)
    .filter((r) => r.appliesTo.includes(ctx.appliesTo) || r.appliesTo.includes('any'))
    .filter((r) => !r.resourceFilter || r.resourceFilter.length === 0 || (ctx.resourceId && r.resourceFilter.includes(ctx.resourceId)))
    .filter((r) => !r.validFrom || ctx.serviceDate >= r.validFrom)
    .filter((r) => !r.validTo || ctx.serviceDate <= r.validTo)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of applicableRules) {
    let applies = false

    switch (rule.ruleType) {
      case 'occupancy_based': {
        const threshold = (rule.config.thresholdPct as number) ?? 70
        const direction = (rule.config.direction as 'above' | 'below') ?? 'above'
        if (ctx.occupancyPct !== undefined) {
          if (direction === 'above' && ctx.occupancyPct >= threshold) applies = true
          if (direction === 'below' && ctx.occupancyPct < threshold) applies = true
        }
        break
      }
      case 'lead_time': {
        const minDays = (rule.config.minDays as number) ?? 0
        const maxDays = (rule.config.maxDays as number) ?? 999
        if (ctx.leadTimeDays !== undefined && ctx.leadTimeDays >= minDays && ctx.leadTimeDays <= maxDays) {
          applies = true
        }
        break
      }
      case 'day_of_week': {
        const days = (rule.config.days as number[]) ?? []
        if (days.includes(dayOfWeek)) applies = true
        break
      }
      case 'last_minute':
        if ((ctx.leadTimeDays ?? 999) <= 3) applies = true
        break
      case 'early_bird':
        if ((ctx.leadTimeDays ?? 0) >= 60) applies = true
        break
      case 'time_of_day': {
        const startTime = rule.config.startTime as string
        const endTime = rule.config.endTime as string
        if (ctx.timeOfDay && startTime && endTime && ctx.timeOfDay >= startTime && ctx.timeOfDay <= endTime) {
          applies = true
        }
        break
      }
      case 'group_size': {
        const minSize = (rule.config.minSize as number) ?? 0
        const maxSize = (rule.config.maxSize as number) ?? 999
        if (ctx.groupSize !== undefined && ctx.groupSize >= minSize && ctx.groupSize <= maxSize) {
          applies = true
        }
        break
      }
      case 'season': {
        const startDate = rule.config.startDate as string
        const endDate = rule.config.endDate as string
        if (startDate && endDate && ctx.serviceDate >= startDate && ctx.serviceDate <= endDate) {
          applies = true
        }
        break
      }
      case 'event': {
        const eventDates = (rule.config.dates as string[]) ?? []
        if (eventDates.includes(ctx.serviceDate)) applies = true
        break
      }
      case 'duration_tier': {
        // config: { minHours, maxHours } — adjustment applied if durationHours in range
        const minHours = (rule.config.minHours as number) ?? 0
        const maxHours = (rule.config.maxHours as number) ?? 99999
        if (ctx.durationHours !== undefined && ctx.durationHours >= minHours && ctx.durationHours <= maxHours) {
          applies = true
        }
        break
      }
      case 'surge': {
        // config: { thresholdPct } — applies when demandLevel >= threshold
        const threshold = (rule.config.thresholdPct as number) ?? 70
        if ((ctx.demandLevel ?? 0) >= threshold) applies = true
        break
      }
      case 'one_way_fee': {
        // config: { baseFee, perKm } — applies flat/km when isOneWay
        if (ctx.isOneWay) {
          const baseFee = (rule.config.baseFee as number) ?? 0
          const perKm = (rule.config.perKm as number) ?? 0
          const distance = ctx.distanceKm ?? 0
          const fee = baseFee + perKm * distance
          price += fee
          appliedRules.push({ ruleId: rule.id, ruleName: rule.name, delta: Math.round(fee * 100) / 100 })
          confidence = Math.min(95, confidence + 5)
          continue
        }
        break
      }
      case 'delivery_fee': {
        // config: { baseFee, perKm, maxKm } — applies when isDelivery
        if (ctx.isDelivery) {
          const baseFee = (rule.config.baseFee as number) ?? 0
          const perKm = (rule.config.perKm as number) ?? 0
          const maxKm = (rule.config.maxKm as number) ?? Infinity
          const distance = Math.min(ctx.distanceKm ?? 0, maxKm)
          const fee = baseFee + perKm * distance
          price += fee
          appliedRules.push({ ruleId: rule.id, ruleName: rule.name, delta: Math.round(fee * 100) / 100 })
          confidence = Math.min(95, confidence + 5)
          continue
        }
        break
      }
    }

    if (applies) {
      const delta = rule.adjustmentType === 'percent'
        ? price * (rule.adjustmentValue / 100)
        : rule.adjustmentValue
      price += delta
      appliedRules.push({ ruleId: rule.id, ruleName: rule.name, delta: Math.round(delta * 100) / 100 })
      confidence = Math.min(95, confidence + 5)
    }
  }

  // Default baseline rules quando nessuna rule custom
  if (rules.length === 0) {
    if (isWeekend) {
      const delta = ctx.basePrice * 0.15
      price += delta
      appliedRules.push({ ruleId: 'baseline-weekend', ruleName: 'Weekend +15%', delta })
    }
    if ((ctx.leadTimeDays ?? 999) <= 3 && (ctx.occupancyPct ?? 0) < 50) {
      const delta = ctx.basePrice * -0.15
      price += delta
      appliedRules.push({ ruleId: 'baseline-lastmin', ruleName: 'Last-minute -15%', delta })
    }
    if ((ctx.occupancyPct ?? 0) > 85) {
      const delta = ctx.basePrice * 0.20
      price += delta
      appliedRules.push({ ruleId: 'baseline-highocc', ruleName: 'High occupancy +20%', delta })
    }
  }

  const finalPrice = Math.max(0, Math.round(price * 100) / 100)
  const totalDelta = finalPrice - ctx.basePrice
  const deltaPct = ctx.basePrice > 0 ? (totalDelta / ctx.basePrice) * 100 : 0

  return {
    basePrice: ctx.basePrice,
    finalPrice,
    delta: Math.round(totalDelta * 100) / 100,
    deltaPct: Math.round(deltaPct * 100) / 100,
    appliedRules,
    reason: appliedRules.length > 0 ? appliedRules.map((r) => r.ruleName).join(', ') : 'no adjustment',
    confidencePct: confidence,
  }
}

/**
 * Calcola prezzo per range date (es. soggiorno multi-night, prenotazione multi-day).
 * Ritorna array PricingResult per data + total.
 */
export function computePriceRange(
  ctxBase: Omit<PricingContext, 'serviceDate'>,
  startDate: string,
  endDate: string,
  rules: PricingRule[],
): { perDate: PricingResult[]; totalBase: number; totalFinal: number; totalDelta: number } {
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const days: PricingResult[] = []
  let totalBase = 0
  let totalFinal = 0

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const result = computePrice({ ...ctxBase, serviceDate: dateStr }, rules)
    days.push(result)
    totalBase += result.basePrice
    totalFinal += result.finalPrice
  }

  return {
    perDate: days,
    totalBase: Math.round(totalBase * 100) / 100,
    totalFinal: Math.round(totalFinal * 100) / 100,
    totalDelta: Math.round((totalFinal - totalBase) * 100) / 100,
  }
}

/**
 * Validazione promo code (per restaurants): verify code valid, max_uses, validity range.
 * Ritorna sconto applicabile o null.
 */
export function validatePromoCode(
  code: string,
  promos: Array<{
    code: string | null
    promoType: string
    valuePct: number | null
    valueAmount: number | null
    validFrom: string
    validTo: string
    maxUses: number | null
    usesCount: number
    active: boolean
  }>,
  serviceDate: string,
): { valid: boolean; discountType?: 'percent' | 'fixed'; discountValue?: number; reason?: string } {
  const promo = promos.find((p) => p.code?.toUpperCase() === code.toUpperCase() && p.active)
  if (!promo) return { valid: false, reason: 'Codice non trovato' }

  if (serviceDate < promo.validFrom) return { valid: false, reason: 'Promo non ancora attiva' }
  if (serviceDate > promo.validTo) return { valid: false, reason: 'Promo scaduta' }
  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) {
    return { valid: false, reason: 'Promo esaurita' }
  }

  if (promo.valuePct !== null) return { valid: true, discountType: 'percent', discountValue: promo.valuePct }
  if (promo.valueAmount !== null) return { valid: true, discountType: 'fixed', discountValue: promo.valueAmount }
  return { valid: false, reason: 'Promo senza valore' }
}
