export { buildStayOffer, type StayOfferResult } from './stay-pricing'
export {
  evaluateStayRules,
  applyStayDiscounts,
  normalizeAllowedWeekdays,
  validateAllowedWeekdays,
  normalizeStayDiscounts,
  validateStayDiscounts,
  formatWeekdayList,
  formatStayDiscountLabel,
  stayDiscountsToJson,
  WEEKDAY_OPTIONS,
  type DiscountType,
  type StayDiscountRule,
  type AppliedStayDiscount,
  type StayEvaluationInput,
  type StayEvaluationResult,
  type StayPricingResult,
} from './stay-rules'
