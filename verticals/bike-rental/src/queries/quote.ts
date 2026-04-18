import { computePrice, type PricingRule as CorePricingRule } from '@touracore/pricing'
import { listBikeTypes, listAddons, listPricingRules } from './catalog'
import type { BikeTypeRow, BikeRentalAddonRow } from '../types/database'
import { INSURANCE_TIER_META } from '../constants'
import type { InsuranceTier } from '../types/database'

export interface QuoteLineItem {
  bikeTypeId: string
  bikeTypeKey: string
  quantity: number
  riderHeight?: number
  riderAge?: number
}

export interface QuoteAddonItem {
  addonKey: string
  quantity?: number
}

export interface QuoteRequest {
  bikeRentalId: string
  rentalStart: string // ISO timestamptz
  rentalEnd: string
  items: QuoteLineItem[]
  addons?: QuoteAddonItem[]
  insuranceTier?: InsuranceTier
  pickupLocationId?: string
  returnLocationId?: string
  deliveryAddress?: string
  deliveryKm?: number
  oneWayKm?: number
  demandLevel?: number // 0-100 for surge
  promoCode?: string
  taxRatePct?: number // default 22 IT
  usePublicClient?: boolean
}

export interface QuoteLineResult {
  bikeTypeId: string
  bikeTypeKey: string
  displayName: string
  quantity: number
  baseUnitRate: number
  adjustedUnitRate: number
  lineTotal: number
  appliedRuleNames: string[]
}

export interface QuoteResult {
  durationHours: number
  isMultiDay: boolean
  lines: QuoteLineResult[]
  subtotal: number
  addonsLines: Array<{ addonKey: string; label: string; quantity: number; unitPrice: number; lineTotal: number }>
  addonsTotal: number
  insuranceAmount: number
  insuranceTier: InsuranceTier
  deliveryFee: number
  oneWayFee: number
  depositAmount: number
  discount: number
  taxableAmount: number
  taxAmount: number
  totalAmount: number
  currency: string
  appliedRulesSummary: string[]
}

/**
 * Compute quote for bike rental booking.
 * Uses @touracore/pricing computePrice for rules (seasonal, peak, surge, duration_tier, group_size, etc).
 */
export async function computeQuote(req: QuoteRequest): Promise<QuoteResult> {
  const startMs = new Date(req.rentalStart).getTime()
  const endMs = new Date(req.rentalEnd).getTime()
  const durationHours = Math.max(0.5, Math.round(((endMs - startMs) / 3_600_000) * 100) / 100)
  const isMultiDay = durationHours >= 24
  const serviceDate = req.rentalStart.slice(0, 10)
  const serviceTime = req.rentalStart.slice(11, 16)

  // Fetch catalog in parallel
  const [types, addons, rules] = await Promise.all([
    listBikeTypes({ bikeRentalId: req.bikeRentalId, activeOnly: true, usePublicClient: req.usePublicClient }),
    listAddons({ bikeRentalId: req.bikeRentalId, activeOnly: true, usePublicClient: req.usePublicClient }),
    listPricingRules({ bikeRentalId: req.bikeRentalId, activeOnly: true, usePublicClient: req.usePublicClient }),
  ])

  const typeById = new Map(types.map((t) => [t.id, t]))
  const addonByKey = new Map(addons.map((a) => [a.addon_key, a]))

  // Convert DB rules → @touracore/pricing CorePricingRule
  const coreRules: CorePricingRule[] = rules.map((r) => ({
    id: r.id,
    ruleType: r.rule_type as CorePricingRule['ruleType'],
    name: r.rule_name,
    appliesTo: (r.applies_to as CorePricingRule['appliesTo']) ?? ['bike'],
    config: (r.config as Record<string, unknown>) ?? {},
    adjustmentType: r.adjustment_type,
    adjustmentValue: Number(r.adjustment_value),
    priority: r.priority,
    active: r.active,
    validFrom: r.valid_from ?? undefined,
    validTo: r.valid_to ?? undefined,
  }))

  const totalRiders = req.items.reduce((sum, i) => sum + i.quantity, 0)
  const appliedRuleNamesAgg = new Set<string>()

  // Per-line pricing
  const lines: QuoteLineResult[] = []
  let subtotal = 0
  for (const item of req.items) {
    const type = typeById.get(item.bikeTypeId)
    if (!type) continue
    const baseRate = pickBaseRate(type, durationHours)
    const core = computePrice(
      {
        serviceDate,
        basePrice: baseRate,
        appliesTo: 'bike',
        resourceId: item.bikeTypeId,
        durationHours,
        groupSize: totalRiders,
        timeOfDay: serviceTime,
        demandLevel: req.demandLevel,
      },
      coreRules.filter((r) => !isFeeRule(r.ruleType)), // fees handled separately below
    )
    const adjustedUnit = core.finalPrice
    const lineTotal = Math.round(adjustedUnit * item.quantity * 100) / 100
    subtotal += lineTotal
    core.appliedRules.forEach((ar) => appliedRuleNamesAgg.add(ar.ruleName))

    lines.push({
      bikeTypeId: item.bikeTypeId,
      bikeTypeKey: type.type_key,
      displayName: type.display_name,
      quantity: item.quantity,
      baseUnitRate: baseRate,
      adjustedUnitRate: adjustedUnit,
      lineTotal,
      appliedRuleNames: core.appliedRules.map((r) => r.ruleName),
    })
  }

  // Add-ons
  const days = Math.max(1, Math.ceil(durationHours / 24))
  const addonsLines: QuoteResult['addonsLines'] = []
  let addonsTotal = 0
  for (const req_addon of req.addons ?? []) {
    const addon = addonByKey.get(req_addon.addonKey)
    if (!addon) continue
    const qty = req_addon.quantity ?? 1
    const unitMultiplier = addonMultiplier(addon, { durationHours, days, bikeCount: totalRiders })
    const unitPrice = Math.round(addon.unit_price * unitMultiplier * 100) / 100
    const lineTotal = Math.round(unitPrice * qty * 100) / 100
    addonsTotal += lineTotal
    addonsLines.push({
      addonKey: addon.addon_key,
      label: addon.display_name,
      quantity: qty,
      unitPrice,
      lineTotal,
    })
  }

  // Insurance (add-on speciale basato su tier enum)
  const insuranceTier: InsuranceTier = req.insuranceTier ?? 'none'
  const insuranceDaily = INSURANCE_TIER_META[insuranceTier].dailyPrice
  const insuranceAmount = Math.round(insuranceDaily * days * totalRiders * 100) / 100

  // One-way + delivery via CoreRules di tipo fee (applicate su 0 base per ottenere fee totale)
  const oneWayFee = computeFeeRule({
    rules: coreRules,
    ruleType: 'one_way_fee',
    isOneWay: Boolean(req.oneWayKm && req.oneWayKm > 0),
    distanceKm: req.oneWayKm ?? 0,
    serviceDate,
  })
  const deliveryFee = computeFeeRule({
    rules: coreRules,
    ruleType: 'delivery_fee',
    isDelivery: Boolean(req.deliveryKm && req.deliveryKm > 0),
    distanceKm: req.deliveryKm ?? 0,
    serviceDate,
  })

  // Deposit (sum per type deposit × quantity)
  let depositAmount = 0
  for (const item of req.items) {
    const type = typeById.get(item.bikeTypeId)
    if (!type) continue
    depositAmount += Number(type.deposit_amount) * item.quantity
  }

  // Discount (promo) — stub per M040, implement full in M043
  const discount = 0

  const taxableAmount = subtotal + addonsTotal + insuranceAmount + oneWayFee + deliveryFee - discount
  const taxRate = (req.taxRatePct ?? 22) / 100
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100

  return {
    durationHours,
    isMultiDay,
    lines,
    subtotal: Math.round(subtotal * 100) / 100,
    addonsLines,
    addonsTotal: Math.round(addonsTotal * 100) / 100,
    insuranceAmount,
    insuranceTier,
    deliveryFee,
    oneWayFee,
    depositAmount: Math.round(depositAmount * 100) / 100,
    discount,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount,
    totalAmount,
    currency: 'EUR',
    appliedRulesSummary: Array.from(appliedRuleNamesAgg),
  }
}

// =============================================================================
// Helpers
// =============================================================================

function pickBaseRate(type: BikeTypeRow, hours: number): number {
  if (hours >= 168 && type.weekly_rate) return Number(type.weekly_rate)
  if (hours >= 24 && type.daily_rate) {
    const days = Math.ceil(hours / 24)
    return Number(type.daily_rate) * days
  }
  if (hours >= 4 && type.half_day_rate && hours <= 6) return Number(type.half_day_rate)
  if (hours >= 8 && type.daily_rate) return Number(type.daily_rate)
  if (type.hourly_rate) return Math.round(Number(type.hourly_rate) * hours * 100) / 100
  if (type.daily_rate) return Math.round((Number(type.daily_rate) / 8) * hours * 100) / 100
  return 0
}

function addonMultiplier(
  addon: BikeRentalAddonRow,
  ctx: { durationHours: number; days: number; bikeCount: number },
): number {
  switch (addon.pricing_mode) {
    case 'per_rental':
      return 1
    case 'per_day':
      return ctx.days
    case 'per_hour':
      return ctx.durationHours
    case 'per_bike':
      return ctx.bikeCount
    case 'percent_of_total':
      return 1
    default:
      return 1
  }
}

function isFeeRule(t: string): boolean {
  return t === 'one_way_fee' || t === 'delivery_fee'
}

function computeFeeRule(args: {
  rules: CorePricingRule[]
  ruleType: 'one_way_fee' | 'delivery_fee'
  isOneWay?: boolean
  isDelivery?: boolean
  distanceKm: number
  serviceDate: string
}): number {
  const rule = args.rules.find((r) => r.ruleType === args.ruleType && r.active)
  if (!rule) return 0
  if (args.ruleType === 'one_way_fee' && !args.isOneWay) return 0
  if (args.ruleType === 'delivery_fee' && !args.isDelivery) return 0
  const cfg = rule.config as Record<string, number>
  const baseFee = cfg.baseFee ?? 0
  const perKm = cfg.perKm ?? 0
  const maxKm = cfg.maxKm ?? Infinity
  const distance = Math.min(args.distanceKm, maxKm)
  return Math.round((baseFee + perKm * distance) * 100) / 100
}
