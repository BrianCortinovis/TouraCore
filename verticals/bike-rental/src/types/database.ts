export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// =============================================================================
// Enums matching DB constraints
// =============================================================================
export type BikeType =
  | 'road'
  | 'gravel'
  | 'mtb'
  | 'e_mtb'
  | 'e_city'
  | 'e_cargo'
  | 'e_folding'
  | 'hybrid'
  | 'folding'
  | 'kids'
  | 'tandem'
  | 'handbike'
  | 'cargo'
  | 'city'

export type BikeStatus =
  | 'available'
  | 'rented'
  | 'maintenance'
  | 'damaged'
  | 'charging'
  | 'retired'
  | 'lost'

export type ConditionGrade = 'A' | 'B' | 'C' | 'D'

export type BikeRentalReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'active'
  | 'returned'
  | 'cancelled'
  | 'no_show'
  | 'late'
  | 'completed'

export type InsuranceTier = 'none' | 'basic' | 'standard' | 'premium'
export type RiderExperience = 'beginner' | 'intermediate' | 'expert' | 'pro'
export type DocumentType = 'passport' | 'id_card' | 'driver_license' | 'other'
export type BookingSource = 'direct' | 'widget' | 'portal' | 'walk_in' | string // channel_* future

// =============================================================================
// Row types
// =============================================================================
export interface BikeRentalRow {
  id: string
  tenant_id: string
  bike_types: BikeType[]
  capacity_total: number
  avg_rental_hours: number
  parent_entity_id: string | null
  address: string | null
  city: string | null
  zip: string | null
  country: string
  latitude: number | null
  longitude: number | null
  opening_hours: Json
  buffer_minutes: number
  deposit_policy: Json
  cancellation_policy: Json
  late_fee_policy: Json
  insurance_config: Json
  rental_agreement_md: string | null
  agreement_version: number
  delivery_config: Json
  one_way_config: Json
  settings: Json
  created_at: string
  updated_at: string
}

export interface BikeLocationRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  name: string
  address: string | null
  city: string | null
  zip: string | null
  country: string
  latitude: number | null
  longitude: number | null
  opening_hours: Json
  is_pickup: boolean
  is_return: boolean
  capacity: number | null
  display_order: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface BikeRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  location_id: string | null
  name: string
  bike_type: BikeType
  brand: string | null
  model: string | null
  model_year: number | null
  serial_number: string | null
  frame_size: string | null
  wheel_size: string | null
  color: string | null
  purchase_price: number | null
  purchase_date: string | null
  insurance_value: number | null
  is_electric: boolean
  battery_capacity_wh: number | null
  battery_cycles: number
  battery_health_pct: number
  last_charge_pct: number | null
  last_charged_at: string | null
  motor_brand: string | null
  status: BikeStatus
  condition_grade: ConditionGrade
  total_km: number
  last_maintenance_at: string | null
  next_maintenance_at: string | null
  maintenance_notes: string | null
  gps_device_id: string | null
  photos: string[]
  qr_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BikeRentalReservationRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  reference_code: string
  guest_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  guest_document_type: DocumentType | null
  guest_document_number: string | null
  guest_height_cm: number | null
  guest_weight_kg: number | null
  guest_experience: RiderExperience | null
  rental_start: string
  rental_end: string
  actual_pickup_at: string | null
  actual_return_at: string | null
  duration_hours: number
  pickup_location_id: string | null
  return_location_id: string | null
  is_one_way: boolean
  delivery_address: string | null
  delivery_km: number | null
  subtotal: number
  addons_total: number
  delivery_fee: number
  one_way_fee: number
  discount: number
  tax_amount: number
  total_amount: number
  paid_amount: number
  currency: string
  deposit_amount: number
  deposit_payment_intent: string | null
  deposit_released_at: string | null
  deposit_captured_amount: number
  insurance_tier: InsuranceTier | null
  status: BikeRentalReservationStatus
  agreement_signed_at: string | null
  agreement_signature_data: Json | null
  damage_report: Json | null
  damage_cost_total: number
  late_fee: number
  insurance_claim_id: string | null
  source: string
  channel_booking_ref: string | null
  notes_internal: string | null
  created_at: string
  updated_at: string
}

export interface BikeRentalReservationItemRow {
  id: string
  reservation_id: string
  tenant_id: string
  bike_id: string | null
  bike_type: BikeType
  frame_size: string | null
  rider_name: string | null
  rider_height_cm: number | null
  rider_age: number | null
  rider_experience: RiderExperience | null
  base_price: number
  discount: number
  line_total: number
  pickup_photos: string[]
  return_photos: string[]
  pickup_battery_pct: number | null
  return_battery_pct: number | null
  pickup_km: number | null
  return_km: number | null
  condition_at_pickup: ConditionGrade | null
  condition_at_return: ConditionGrade | null
  damage_noted: boolean
  created_at: string
}

export interface BikeRentalReservationAddonRow {
  id: string
  reservation_id: string
  tenant_id: string
  addon_key: string
  addon_label: string | null
  quantity: number
  unit_price: number
  line_total: number
  created_at: string
}

// =============================================================================
// Pricing catalog (00097)
// =============================================================================
export interface BikeTypeRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  type_key: BikeType
  display_name: string
  description: string | null
  photo: string | null
  hourly_rate: number | null
  half_day_rate: number | null
  daily_rate: number | null
  weekly_rate: number | null
  deposit_amount: number
  age_min: number | null
  age_max: number | null
  height_min: number | null
  height_max: number | null
  active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type AddonPricingMode =
  | 'per_rental'
  | 'per_day'
  | 'per_hour'
  | 'per_bike'
  | 'percent_of_total'

export type AddonCategory = 'safety' | 'comfort' | 'navigation' | 'insurance' | 'transport'

export interface BikeRentalAddonRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  addon_key: string
  display_name: string
  description: string | null
  category: AddonCategory | null
  pricing_mode: AddonPricingMode
  unit_price: number
  mandatory_for: string[]
  stock_total: number | null
  active: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export type BikePricingRuleType =
  | 'season'
  | 'day_of_week'
  | 'time_of_day'
  | 'duration_tier'
  | 'group_size'
  | 'surge'
  | 'early_bird'
  | 'last_minute'
  | 'one_way_fee'
  | 'delivery_fee'
  | 'event'
  | 'occupancy_based'

export interface BikePricingRuleRow {
  id: string
  bike_rental_id: string
  tenant_id: string
  rule_name: string
  rule_type: BikePricingRuleType
  applies_to: string[]
  config: Json
  adjustment_type: 'percent' | 'fixed'
  adjustment_value: number
  priority: number
  active: boolean
  valid_from: string | null
  valid_to: string | null
  created_at: string
  updated_at: string
}
