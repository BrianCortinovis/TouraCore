// DB row types aligned with migrations 00104-00108
// Keep in sync with schema: experience_entities, experience_products, experience_variants, experience_schedules, experience_timeslots

export type BookingMode = 'timeslot_capacity' | 'timeslot_private' | 'asset_rental'

export type ExperienceCategory =
  | 'snow_sport'
  | 'water_sport'
  | 'adventure_park'
  | 'escape_room'
  | 'guided_tour'
  | 'tasting'
  | 'karting'
  | 'laser_tag'
  | 'rental_gear'
  | 'workshop'
  | 'wellness_experience'
  | 'other'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme'

export type VariantKind =
  | 'adult'
  | 'child'
  | 'infant'
  | 'senior'
  | 'family'
  | 'group'
  | 'private'
  | 'student'
  | 'resident'
  | 'other'

export type TimeslotStatus = 'open' | 'full' | 'blocked' | 'cancelled'

export type ProductStatus = 'draft' | 'active' | 'archived'

export interface ExperienceEntity {
  id: string
  tenant_id: string
  category: ExperienceCategory
  address: string | null
  city: string | null
  zip: string | null
  country: string
  latitude: number | null
  longitude: number | null
  opening_hours: Record<string, string[]>
  languages: string[]
  age_min_default: number | null
  age_max_default: number | null
  height_min_cm_default: number | null
  difficulty_default: Difficulty | null
  cancellation_policy: Record<string, unknown>
  waiver_policy: Record<string, unknown>
  deposit_policy: Record<string, unknown>
  pickup_config: Record<string, unknown>
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ExperienceProduct {
  id: string
  entity_id: string
  tenant_id: string
  slug: string
  name: string
  description_md: string | null
  booking_mode: BookingMode
  duration_minutes: number
  capacity_default: number | null
  age_min: number | null
  age_max: number | null
  height_min_cm: number | null
  difficulty: Difficulty | null
  languages: string[]
  price_base_cents: number
  currency: string
  vat_rate: number
  images: string[]
  highlights: string[]
  includes: string[]
  excludes: string[]
  requirements: string | null
  meeting_point: string | null
  waiver_required: boolean
  deposit_required_cents: number
  cutoff_minutes: number
  status: ProductStatus
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ExperienceVariant {
  id: string
  product_id: string
  tenant_id: string
  code: string
  label: string
  kind: VariantKind
  price_cents: number
  price_diff_cents: number
  min_qty: number
  max_qty: number | null
  age_min: number | null
  age_max: number | null
  includes_capacity: number
  display_order: number
  active: boolean
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface WeeklyRuleSlot {
  start: string
  capacity: number
}

export interface WeeklyRule {
  dow: 0 | 1 | 2 | 3 | 4 | 5 | 6
  slots: WeeklyRuleSlot[]
}

export interface ScheduleException {
  date: string
  slots?: WeeklyRuleSlot[]
  closed?: boolean
}

export interface ScheduleBlackout {
  from: string
  to: string
  reason?: string
}

export interface ExperienceSchedule {
  id: string
  product_id: string
  tenant_id: string
  name: string
  weekly_rules: WeeklyRule[]
  exceptions: ScheduleException[]
  blackouts: ScheduleBlackout[]
  valid_from: string
  valid_to: string | null
  timezone: string
  active: boolean
  last_generated_at: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ExperienceTimeslot {
  id: string
  product_id: string
  schedule_id: string | null
  tenant_id: string
  start_at: string
  end_at: string
  capacity_total: number
  capacity_booked: number
  capacity_held: number
  status: TimeslotStatus
  price_override_cents: number | null
  resource_assignment: Record<string, unknown>
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}
