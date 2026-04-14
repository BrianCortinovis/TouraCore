import {
  applyStayDiscounts,
  evaluateStayRules,
  normalizeAllowedWeekdays,
  normalizeStayDiscounts,
  type AppliedStayDiscount,
} from './stay-rules'
import type { Season, RatePrice } from '../../types/database'

type SeasonRules = Pick<Season, 'min_stay' | 'max_stay' | 'allowed_arrival_days' | 'allowed_departure_days' | 'stay_discounts'>
type RatePriceRules = Pick<RatePrice, 'price_per_night' | 'min_stay' | 'max_stay' | 'closed_to_arrival' | 'closed_to_departure' | 'stop_sell' | 'allowed_arrival_days' | 'allowed_departure_days' | 'stay_discounts'>

export interface StayOfferResult {
  allowed: boolean
  error?: string
  basePricePerNight: number
  effectivePricePerNight: number
  baseTotalPrice: number
  totalPrice: number
  minStay: number | null
  maxStay: number | null
  allowedArrivalDays: number[]
  allowedDepartureDays: number[]
  appliedDiscount: AppliedStayDiscount | null
}

export function buildStayOffer(params: {
  checkIn: string
  checkOut: string
  nights: number
  basePricePerNight: number
  season?: SeasonRules | null
  ratePrice?: RatePriceRules | null
}): StayOfferResult {
  const { checkIn, checkOut, nights, season, ratePrice } = params
  const basePricePerNight = Number(ratePrice?.price_per_night ?? params.basePricePerNight) || 0
  const minStay = ratePrice?.min_stay ?? season?.min_stay ?? null
  const maxStay = ratePrice?.max_stay ?? season?.max_stay ?? null
  const allowedArrivalDays = normalizeAllowedWeekdays(
    ratePrice?.allowed_arrival_days ?? season?.allowed_arrival_days ?? []
  )
  const allowedDepartureDays = normalizeAllowedWeekdays(
    ratePrice?.allowed_departure_days ?? season?.allowed_departure_days ?? []
  )

  if (ratePrice?.stop_sell) {
    return {
      allowed: false,
      error: 'Vendita chiusa per il periodo selezionato.',
      basePricePerNight,
      effectivePricePerNight: basePricePerNight,
      baseTotalPrice: basePricePerNight * nights,
      totalPrice: basePricePerNight * nights,
      minStay,
      maxStay,
      allowedArrivalDays,
      allowedDepartureDays,
      appliedDiscount: null,
    }
  }

  const validation = evaluateStayRules({
    checkIn,
    checkOut,
    nights,
    minStay,
    maxStay,
    closedToArrival: ratePrice?.closed_to_arrival ?? false,
    closedToDeparture: ratePrice?.closed_to_departure ?? false,
    allowedArrivalDays,
    allowedDepartureDays,
  })

  const pricing = applyStayDiscounts(
    basePricePerNight,
    nights,
    normalizeStayDiscounts(ratePrice?.stay_discounts ?? season?.stay_discounts ?? [])
  )

  return {
    allowed: validation.allowed,
    error: validation.error,
    basePricePerNight,
    effectivePricePerNight: pricing.effectivePricePerNight,
    baseTotalPrice: pricing.baseTotal,
    totalPrice: pricing.effectiveTotal,
    minStay,
    maxStay,
    allowedArrivalDays,
    allowedDepartureDays,
    appliedDiscount: pricing.appliedDiscount,
  }
}
