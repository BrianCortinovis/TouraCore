/**
 * Core types per booking engine — condivisi da tutti i 3 template + SDK.
 * Snapshot pubblico: niente server-only code qui.
 */

export type BookingTemplate = 'minimal' | 'luxury' | 'mobile'
export type BookingLocale = 'it' | 'en' | 'de'
export type BookingStep = 'search' | 'results' | 'extras' | 'form' | 'payment' | 'confirmation'

export interface BookingTheme {
  accent_color: string
  bg_color: string
  text_color: string
  muted_color: string
  border_radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  font_family: 'system' | 'serif' | 'display' | 'custom'
  font_family_custom?: string
  logo_url?: string
  hero_image_url?: string
  hero_overlay_opacity: number
  show_powered_by: boolean
  custom_css?: string
}

export const DEFAULT_THEME: BookingTheme = {
  accent_color: '#2563eb',
  bg_color: '#ffffff',
  text_color: '#0f172a',
  muted_color: '#64748b',
  border_radius: 'md',
  font_family: 'system',
  hero_overlay_opacity: 0.35,
  show_powered_by: true,
}

export interface BookingProperty {
  id: string
  slug: string
  name: string
  short_description?: string | null
  default_currency: string
  default_language: BookingLocale
  pet_policy: {
    allowed: boolean
    max_pets: number
    fee_per_night: number
    fee_per_stay: number
    notes: string
  }
  hero_image_url?: string
}

export interface BookingRatePlan {
  id: string
  name: string
  code: string | null
  description: string | null
  meal_plan: 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
  rate_type: string
  sort_order: number
  cancellation_policy_text?: string | null
}

export interface BookingUpsell {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  charge_mode: 'free' | 'paid'
  pricing_mode: 'per_stay' | 'per_night' | 'per_guest' | 'per_item' | 'per_hour' | 'per_day'
  max_quantity: number | null
  sort_order: number
}

export interface BookingAvailabilityItem {
  roomTypeId: string
  roomTypeName: string
  description: string | null
  baseOccupancy: number
  maxOccupancy: number
  photos: string[]
  amenities: string[]
  sizeSqm: number | null
  bedConfiguration: string | null
  availableRooms: number
  totalRooms: number
  pricePerNight: number
  totalPrice: number
  nights: number
  currency: string
}

export interface BookingSelection {
  roomTypeId: string | null
  ratePlanId: string | null
  checkIn: string
  checkOut: string
  adults: number
  children: number
  infants: number
  petCount: number
  upsells: Record<string, number>
}

export interface BookingGuest {
  firstName: string
  lastName: string
  email: string
  phone: string
  nationality?: string
  country?: string
  specialRequests?: string
  privacyConsent: boolean
  marketingConsent: boolean
  /** Se true + struttura abilita tassa + policy ≠ onsite_only, la tassa soggiorno viene
   *  aggiunta al totale Stripe e marcata pagata online. Default false. */
  payTouristTaxOnline?: boolean
}

export interface BookingConfirmation {
  reservationCode: string
  checkIn: string
  checkOut: string
  totalAmount: number
  currency: string
  paymentSessionUrl?: string
}

export interface BookingTouristTaxConfig {
  enabled: boolean
  /** 'online_only' | 'onsite_only' | 'guest_choice' */
  paymentPolicy: 'online_only' | 'onsite_only' | 'guest_choice'
  /** €/persona/notte adulto (per preview). Stima server-side autoritativa in checkout. */
  adultRatePerNight: number
  childRatePerNight: number
  maxTaxableNights: number
}

export interface BookingContext {
  property: BookingProperty
  ratePlans: BookingRatePlan[]
  upsells: BookingUpsell[]
  defaultRatePlanId: string | null
  cancellationPolicyText: string | null
  theme: BookingTheme
  template: BookingTemplate
  touristTax?: BookingTouristTaxConfig
}
