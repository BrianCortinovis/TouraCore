import type { PropertyType, FiscalRegime, SciaStatus } from './property-types'

export interface PetPolicy {
  allowed: boolean
  max_pets?: number
  fee_per_night?: number
  fee_per_stay?: number
  notes?: string
}

export interface CancellationPolicy {
  type: 'flexible' | 'moderate' | 'strict' | 'non_refundable' | 'custom'
  days_before: number
  penalty_percent: number
  description?: string
}

export interface Accommodation {
  entity_id: string
  property_type: PropertyType | null
  is_imprenditoriale: boolean
  legal_name: string | null
  vat_number: string | null
  fiscal_code: string | null
  rea_number: string | null
  legal_details: Record<string, unknown>
  amenities: string[]
  address: string | null
  city: string | null
  province: string | null
  zip: string | null
  country: string
  email: string | null
  phone: string | null
  pec: string | null
  website: string | null
  logo_url: string | null
  latitude: number | null
  longitude: number | null
  region: string | null
  default_check_in_time: string
  default_check_out_time: string
  default_currency: string
  default_language: string
  default_vat_rate: number
  timezone: string
  settings: Record<string, unknown>

  // Compliance IT (migration 00031)
  fiscal_regime: FiscalRegime | null
  has_vat: boolean
  cedolare_secca_enabled: boolean
  cedolare_secca_rate: number
  ritenuta_ota_enabled: boolean
  ritenuta_ota_rate: number
  cin_code: string | null
  cin_expiry: string | null
  scia_number: string | null
  scia_status: SciaStatus | null
  scia_expiry: string | null
  alloggiati_username: string | null
  alloggiati_password_encrypted: string | null
  istat_structure_code: string | null
  sdi_code: string
  invoice_prefix: string | null
  invoice_next_number: number
  star_rating: number | null
  pet_policy: PetPolicy
  cancellation_policy: CancellationPolicy
  payment_methods: string[]
}
