import type { Json } from '../../types/database'

export const WEEKDAY_OPTIONS = [
  { value: 1, shortLabel: 'Lun', longLabel: 'Lunedi' },
  { value: 2, shortLabel: 'Mar', longLabel: 'Martedi' },
  { value: 3, shortLabel: 'Mer', longLabel: 'Mercoledi' },
  { value: 4, shortLabel: 'Gio', longLabel: 'Giovedi' },
  { value: 5, shortLabel: 'Ven', longLabel: 'Venerdi' },
  { value: 6, shortLabel: 'Sab', longLabel: 'Sabato' },
  { value: 0, shortLabel: 'Dom', longLabel: 'Domenica' },
] as const

export type DiscountType = 'percentage' | 'fixed'

export interface StayDiscountRule {
  min_nights: number
  discount_type: DiscountType
  discount_value: number
  label?: string
}

export interface AppliedStayDiscount extends StayDiscountRule {
  discount_amount: number
  effective_total: number
}

export interface StayEvaluationInput {
  checkIn: string
  checkOut: string
  nights: number
  minStay?: number | null
  maxStay?: number | null
  closedToArrival?: boolean | null
  closedToDeparture?: boolean | null
  allowedArrivalDays?: number[] | null
  allowedDepartureDays?: number[] | null
}

export interface StayEvaluationResult {
  allowed: boolean
  error?: string
}

export interface StayPricingResult {
  baseTotal: number
  effectiveTotal: number
  effectivePricePerNight: number
  appliedDiscount: AppliedStayDiscount | null
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

export function normalizeAllowedWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => {
          if (typeof item === 'number') return item
          if (typeof item === 'string' && item.trim() !== '') return parseInt(item, 10)
          return Number.NaN
        })
        .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6)
    )
  )
}

export function validateAllowedWeekdays(value: unknown, label: string) {
  const normalized = normalizeAllowedWeekdays(value)
  if (Array.isArray(value) && normalized.length !== value.length) {
    throw new Error(`${label}: seleziona solo giorni validi.`)
  }
  return normalized
}

export function normalizeStayDiscounts(value: unknown): StayDiscountRule[] {
  if (!Array.isArray(value)) return []

  const discounts: StayDiscountRule[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object') continue

    const record = item as Record<string, unknown>
    const minNights = typeof record.min_nights === 'number'
      ? record.min_nights
      : typeof record.min_nights === 'string'
        ? parseInt(record.min_nights, 10)
        : Number.NaN
    const discountType = record.discount_type === 'fixed' ? 'fixed' : record.discount_type === 'percentage' ? 'percentage' : null
    const discountValue = typeof record.discount_value === 'number'
      ? record.discount_value
      : typeof record.discount_value === 'string'
        ? parseFloat(record.discount_value)
        : Number.NaN
    const label = typeof record.label === 'string' ? record.label.trim() : ''

    if (!Number.isInteger(minNights) || minNights < 2 || !discountType || Number.isNaN(discountValue)) {
      continue
    }

    discounts.push({
      min_nights: minNights,
      discount_type: discountType,
      discount_value: discountValue,
      label: label || undefined,
    })
  }

  return discounts.sort((a, b) => a.min_nights - b.min_nights)
}

export function validateStayDiscounts(value: unknown) {
  const discounts = normalizeStayDiscounts(value)
  if (!Array.isArray(value)) {
    if (value == null) return discounts
    throw new Error('Gli sconti soggiorno non sono validi.')
  }

  if (discounts.length !== value.length) {
    throw new Error('Compila correttamente tutti gli sconti soggiorno.')
  }

  let lastMinNights = 0
  for (const discount of discounts) {
    if (discount.min_nights <= lastMinNights) {
      throw new Error('Gli sconti soggiorno devono essere ordinati per durata crescente senza duplicati.')
    }
    if (discount.discount_type === 'percentage' && (discount.discount_value <= 0 || discount.discount_value >= 100)) {
      throw new Error('Gli sconti percentuali devono essere compresi tra 0 e 100.')
    }
    if (discount.discount_type === 'fixed' && discount.discount_value <= 0) {
      throw new Error('Gli sconti fissi devono essere superiori a 0.')
    }
    lastMinNights = discount.min_nights
  }

  return discounts
}

export function formatWeekdayList(days: number[]): string {
  const normalized = normalizeAllowedWeekdays(days)
  if (normalized.length === 0) return 'Libero'
  return WEEKDAY_OPTIONS
    .filter((option) => normalized.includes(option.value))
    .map((option) => option.shortLabel)
    .join(', ')
}

export function formatStayDiscountLabel(discount: StayDiscountRule): string {
  const base = discount.label?.trim()
  if (base) return base
  return discount.discount_type === 'percentage'
    ? `${discount.discount_value}% da ${discount.min_nights} notti`
    : `${discount.discount_value} EUR da ${discount.min_nights} notti`
}

export function evaluateStayRules(input: StayEvaluationInput): StayEvaluationResult {
  const arrivalDays = normalizeAllowedWeekdays(input.allowedArrivalDays)
  const departureDays = normalizeAllowedWeekdays(input.allowedDepartureDays)
  const checkInDay = new Date(`${input.checkIn}T00:00:00`).getDay()
  const checkOutDay = new Date(`${input.checkOut}T00:00:00`).getDay()

  if (input.closedToArrival) {
    return { allowed: false, error: 'Arrivo non consentito per la data selezionata.' }
  }

  if (input.closedToDeparture) {
    return { allowed: false, error: 'Partenza non consentita per la data selezionata.' }
  }

  if (input.minStay && input.nights < input.minStay) {
    return { allowed: false, error: `Soggiorno minimo richiesto: ${input.minStay} notti.` }
  }

  if (input.maxStay && input.nights > input.maxStay) {
    return { allowed: false, error: `Soggiorno massimo consentito: ${input.maxStay} notti.` }
  }

  if (arrivalDays.length > 0 && !arrivalDays.includes(checkInDay)) {
    return {
      allowed: false,
      error: `Arrivo consentito solo in questi giorni: ${formatWeekdayList(arrivalDays)}.`,
    }
  }

  if (departureDays.length > 0 && !departureDays.includes(checkOutDay)) {
    return {
      allowed: false,
      error: `Partenza consentita solo in questi giorni: ${formatWeekdayList(departureDays)}.`,
    }
  }

  return { allowed: true }
}

export function applyStayDiscounts(
  basePricePerNight: number,
  nights: number,
  discounts: StayDiscountRule[] | null | undefined
): StayPricingResult {
  const normalizedDiscounts = normalizeStayDiscounts(discounts)
  const baseTotal = roundCurrency(basePricePerNight * nights)
  let appliedDiscount: AppliedStayDiscount | null = null

  for (const discount of normalizedDiscounts) {
    if (nights < discount.min_nights) continue
    const discountAmount = discount.discount_type === 'percentage'
      ? roundCurrency(baseTotal * (discount.discount_value / 100))
      : roundCurrency(discount.discount_value)
    const effectiveTotal = roundCurrency(Math.max(baseTotal - discountAmount, 0))

    appliedDiscount = {
      ...discount,
      discount_amount: discountAmount,
      effective_total: effectiveTotal,
    }
  }

  const effectiveTotal = appliedDiscount?.effective_total ?? baseTotal

  return {
    baseTotal,
    effectiveTotal,
    effectivePricePerNight: nights > 0 ? roundCurrency(effectiveTotal / nights) : 0,
    appliedDiscount,
  }
}

export function stayDiscountsToJson(value: StayDiscountRule[]): Json {
  return value.map((discount) => ({
    min_nights: discount.min_nights,
    discount_type: discount.discount_type,
    discount_value: discount.discount_value,
    ...(discount.label ? { label: discount.label } : {}),
  }))
}
