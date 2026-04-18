import type { ExperienceProduct, ExperienceVariant, ExperienceTimeslot } from '../types/database'

export interface QuoteInput {
  product: ExperienceProduct
  variants: Array<{ variant: ExperienceVariant; quantity: number }>
  addons?: Array<{ price_cents: number; quantity: number; price_per: 'booking' | 'guest' | 'hour' | 'unit' }>
  timeslot?: ExperienceTimeslot | null
  pickupSurchargeCents?: number
  durationHours?: number
  voucherDiscountCents?: number
  groupDiscountThreshold?: number
  groupDiscountPct?: number
  lastMinuteThresholdHours?: number
  lastMinuteDiscountPct?: number
  nowIso?: string
}

export interface QuoteOutput {
  subtotal_cents: number
  addons_cents: number
  pickup_cents: number
  group_discount_cents: number
  last_minute_discount_cents: number
  voucher_discount_cents: number
  discount_cents: number
  tax_cents: number
  total_cents: number
  guests_count: number
  currency: string
  breakdown: Array<{ code: string; label: string; quantity: number; unit_cents: number; line_total_cents: number }>
}

export function computeQuote(input: QuoteInput): QuoteOutput {
  const { product, variants } = input
  const currency = product.currency || 'EUR'
  const breakdown: QuoteOutput['breakdown'] = []

  const basePriceCents = input.timeslot?.price_override_cents ?? product.price_base_cents

  let subtotal = 0
  let guestsCount = 0

  for (const { variant, quantity } of variants) {
    if (quantity <= 0) continue
    const unit = basePriceCents + variant.price_diff_cents
    const line = unit * quantity
    subtotal += line
    guestsCount += quantity * variant.includes_capacity
    breakdown.push({
      code: variant.code,
      label: variant.label,
      quantity,
      unit_cents: unit,
      line_total_cents: line,
    })
  }

  let addonsCents = 0
  const durationHours = input.durationHours ?? product.duration_minutes / 60
  for (const a of input.addons ?? []) {
    let line = 0
    switch (a.price_per) {
      case 'booking': line = a.price_cents * a.quantity; break
      case 'guest': line = a.price_cents * a.quantity * guestsCount; break
      case 'hour': line = a.price_cents * a.quantity * Math.ceil(durationHours); break
      case 'unit': line = a.price_cents * a.quantity; break
    }
    addonsCents += line
  }

  const pickupCents = input.pickupSurchargeCents ?? 0

  let groupDiscountCents = 0
  if (input.groupDiscountThreshold && input.groupDiscountPct && guestsCount >= input.groupDiscountThreshold) {
    groupDiscountCents = Math.floor(subtotal * (input.groupDiscountPct / 100))
  }

  let lastMinuteDiscountCents = 0
  if (input.lastMinuteThresholdHours && input.lastMinuteDiscountPct && input.timeslot && input.nowIso) {
    const hoursUntil = (new Date(input.timeslot.start_at).getTime() - new Date(input.nowIso).getTime()) / (1000 * 60 * 60)
    if (hoursUntil > 0 && hoursUntil <= input.lastMinuteThresholdHours) {
      lastMinuteDiscountCents = Math.floor((subtotal - groupDiscountCents) * (input.lastMinuteDiscountPct / 100))
    }
  }

  const voucherDiscountCents = input.voucherDiscountCents ?? 0
  const discountCents = groupDiscountCents + lastMinuteDiscountCents + voucherDiscountCents

  const taxableCents = subtotal + addonsCents + pickupCents - discountCents
  const taxCents = Math.floor(taxableCents * (product.vat_rate / 100) / (1 + product.vat_rate / 100))
  const totalCents = Math.max(0, taxableCents)

  return {
    subtotal_cents: subtotal,
    addons_cents: addonsCents,
    pickup_cents: pickupCents,
    group_discount_cents: groupDiscountCents,
    last_minute_discount_cents: lastMinuteDiscountCents,
    voucher_discount_cents: voucherDiscountCents,
    discount_cents: discountCents,
    tax_cents: taxCents,
    total_cents: totalCents,
    guests_count: guestsCount,
    currency,
    breakdown,
  }
}
