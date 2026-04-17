export interface SdkProperty {
  id: string
  slug: string
  name: string
  short_description: string | null
  default_currency: string
  default_language: 'it' | 'en' | 'de'
  pet_policy: {
    allowed: boolean
    max_pets: number
    fee_per_night: number
    fee_per_stay: number
    notes: string
  }
}

export interface SdkRatePlan {
  id: string
  name: string
  code: string | null
  description: string | null
  meal_plan: 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
  rate_type: string
  sort_order: number
}

export interface SdkUpsell {
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

export interface SdkTheme {
  accent_color: string
  bg_color: string
  text_color: string
  muted_color: string
  border_radius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  font_family: 'system' | 'serif' | 'display' | 'custom'
  logo_url?: string
  hero_image_url?: string
  show_powered_by: boolean
}
