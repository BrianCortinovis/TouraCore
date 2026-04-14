export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Enums matching the database
export type PropertyType = 'hotel' | 'residence' | 'mixed' | 'b_and_b' | 'agriturismo' | 'apartment' | 'affittacamere'
export type FiscalRegime = 'ordinario' | 'forfettario' | 'cedolare_secca' | 'agriturismo_special'
export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing'
export type TenantRole = 'owner' | 'admin' | 'member'
export type RoomCategory = 'room' | 'apartment' | 'suite' | 'studio' | 'villa'
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance' | 'out_of_order'
export type RateType = 'standard' | 'non_refundable' | 'package' | 'long_stay' | 'early_booking' | 'last_minute'
export type MealPlan = 'room_only' | 'breakfast' | 'half_board' | 'full_board' | 'all_inclusive'
export type ReservationStatus = 'inquiry' | 'option' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show'
export type BookingSource = 'direct' | 'booking_com' | 'expedia' | 'airbnb' | 'google' | 'tripadvisor' | 'phone' | 'walk_in' | 'website' | 'email' | 'agency' | 'other'
export type DocumentType = 'id_card' | 'passport' | 'driving_license' | 'residence_permit'
export type InvoiceType = 'invoice' | 'credit_note' | 'receipt' | 'proforma' | 'corrispettivo'
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pos' | 'online' | 'check'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded' | 'overdue'
export type SdiStatus = 'draft' | 'ready' | 'sent' | 'delivered' | 'accepted' | 'rejected' | 'error'
export type HousekeepingTaskType = 'checkout_clean' | 'stay_clean' | 'deep_clean' | 'turndown' | 'maintenance' | 'inspection'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'inspected' | 'skipped'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export type StaffRole = 'owner' | 'manager' | 'receptionist' | 'housekeeper' | 'restaurant_staff' | 'accountant' | 'maintenance'
export type AlloggiatiStatus = 'pending' | 'generated' | 'sent' | 'confirmed' | 'error'
export type LegalDocumentType = 'saas_tos' | 'guest_booking_conditions' | 'cookie_policy' | 'privacy_policy' | 'dpa' | 'cancellation_policy'
export type CancellationPolicyType = 'free' | 'moderate' | 'strict' | 'non_refundable' | 'custom'
export type DPAStatus = 'draft' | 'sent' | 'signed' | 'active' | 'expired' | 'terminated'
export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical'
export type BreachStatus = 'detected' | 'investigating' | 'contained' | 'resolved' | 'notified_authority' | 'notified_subjects' | 'closed'
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'
export type FolioChargeType = 'room' | 'restaurant' | 'bar' | 'minibar' | 'extra_service' | 'tax' | 'discount' | 'payment' | 'adjustment'
export type MessageTrigger = 'booking_confirmed' | 'booking_cancelled' | 'pre_arrival' | 'check_in' | 'check_out' | 'post_stay' | 'birthday' | 'manual' | 'quote_sent' | 'payment_reminder'
export type RoomBlockType = 'owner_use' | 'friends' | 'maintenance' | 'renovation' | 'seasonal_close' | 'other'
export type MessageChannel = 'email' | 'whatsapp' | 'sms'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'opened' | 'failed' | 'bounced'
export type OtaPaymentType = 'ota_collect' | 'virtual_card' | 'pay_at_property' | 'split'
export type GatewayType = 'stripe' | 'paypal' | 'satispay' | 'bank_transfer'
export type PetType = 'dog' | 'cat' | 'other'
export type PetSize = 'small' | 'medium' | 'large'
export type StayDiscountType = 'percentage' | 'fixed'

export interface StayDiscountRule {
  min_nights: number
  discount_type: StayDiscountType
  discount_value: number
  label?: string
}

export interface PetDetail {
  type: PetType
  size: PetSize
  breed?: string
  name?: string
  notes?: string
}

export interface PetPolicy {
  max_pets?: number
  allowed_sizes?: PetSize[]
  allowed_types?: PetType[]
  fee_per_night?: number
  fee_per_stay?: number
  cleaning_fee?: number
  refundable_deposit?: number
  max_weight_kg?: number
  requires_documentation?: boolean
  requires_leash_common_areas?: boolean
  cannot_be_left_alone?: boolean
  allowed_in_pool_area?: boolean
  allowed_in_outdoor_areas?: boolean
  allowed_in_restaurant_area?: boolean
  pet_kit_included?: boolean
  pet_kit_fee?: number
  advance_notice_required?: boolean
  pet_rules_text?: string
}

export interface Database {
  public: {
    Tables: {
      platform_settings: {
        Row: PlatformSetting
        Insert: Omit<PlatformSetting, 'updated_at'>
        Update: Partial<Omit<PlatformSetting, 'key'>>
      }
      tenant_accounts: {
        Row: TenantAccount
        Insert: Omit<TenantAccount, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TenantAccount, 'id'>>
      }
      tenant_memberships: {
        Row: TenantMembership
        Insert: Omit<TenantMembership, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<TenantMembership, 'id'>>
      }
      properties: {
        Row: Property
        Insert: Omit<Property, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Property, 'id'>>
      }
      staff_members: {
        Row: StaffMember
        Insert: Omit<StaffMember, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<StaffMember, 'id'>>
      }
      room_types: {
        Row: RoomType
        Insert: Omit<RoomType, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RoomType, 'id'>>
      }
      rooms: {
        Row: Room
        Insert: Omit<Room, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Room, 'id'>>
      }
      rate_plans: {
        Row: RatePlan
        Insert: Omit<RatePlan, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RatePlan, 'id'>>
      }
      seasons: {
        Row: Season
        Insert: Omit<Season, 'id' | 'created_at'>
        Update: Partial<Omit<Season, 'id'>>
      }
      rate_prices: {
        Row: RatePrice
        Insert: Omit<RatePrice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RatePrice, 'id'>>
      }
      guests: {
        Row: Guest
        Insert: Omit<Guest, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Guest, 'id'>>
      }
      reservations: {
        Row: Reservation
        Insert: Omit<Reservation, 'id' | 'created_at' | 'updated_at' | 'balance'>
        Update: Partial<Omit<Reservation, 'id' | 'balance'>>
      }
      folio_charges: {
        Row: FolioCharge
        Insert: Omit<FolioCharge, 'id' | 'created_at'>
        Update: Partial<Omit<FolioCharge, 'id'>>
      }
      police_registrations: {
        Row: PoliceRegistration
        Insert: Omit<PoliceRegistration, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PoliceRegistration, 'id'>>
      }
      istat_reports: {
        Row: IstatReport
        Insert: Omit<IstatReport, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<IstatReport, 'id'>>
      }
      tourist_tax_records: {
        Row: TouristTaxRecord
        Insert: Omit<TouristTaxRecord, 'id' | 'created_at'>
        Update: Partial<Omit<TouristTaxRecord, 'id'>>
      }
      invoices: {
        Row: Invoice
        Insert: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Invoice, 'id'>>
      }
      invoice_items: {
        Row: InvoiceItem
        Insert: Omit<InvoiceItem, 'id'>
        Update: Partial<Omit<InvoiceItem, 'id'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'>
        Update: Partial<Omit<Payment, 'id'>>
      }
      housekeeping_tasks: {
        Row: HousekeepingTask
        Insert: Omit<HousekeepingTask, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<HousekeepingTask, 'id'>>
      }
      restaurant_services: {
        Row: RestaurantService
        Insert: Omit<RestaurantService, 'id' | 'created_at'>
        Update: Partial<Omit<RestaurantService, 'id'>>
      }
      restaurant_tables: {
        Row: RestaurantTable
        Insert: Omit<RestaurantTable, 'id'>
        Update: Partial<Omit<RestaurantTable, 'id'>>
      }
      menu_items: {
        Row: MenuItem
        Insert: Omit<MenuItem, 'id' | 'created_at'>
        Update: Partial<Omit<MenuItem, 'id'>>
      }
      restaurant_orders: {
        Row: RestaurantOrder
        Insert: Omit<RestaurantOrder, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RestaurantOrder, 'id'>>
      }
      extra_services: {
        Row: ExtraService
        Insert: Omit<ExtraService, 'id' | 'created_at'>
        Update: Partial<Omit<ExtraService, 'id'>>
      }
      quotes: {
        Row: Quote
        Insert: Omit<Quote, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Quote, 'id'>>
      }
      message_templates: {
        Row: MessageTemplate
        Insert: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MessageTemplate, 'id'>>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Omit<AuditLog, 'id' | 'created_at'>
        Update: never
      }
      channel_connections: {
        Row: ChannelConnection
        Insert: Omit<ChannelConnection, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ChannelConnection, 'id'>>
      }
      channel_room_mappings: {
        Row: ChannelRoomMapping
        Insert: Omit<ChannelRoomMapping, 'id'>
        Update: Partial<Omit<ChannelRoomMapping, 'id'>>
      }
      channel_sync_logs: {
        Row: ChannelSyncLog
        Insert: Omit<ChannelSyncLog, 'id' | 'synced_at'>
        Update: never
      }
      cookie_consents: {
        Row: CookieConsent
        Insert: Omit<CookieConsent, 'id' | 'created_at'>
        Update: Partial<Omit<CookieConsent, 'id'>>
      }
      legal_documents: {
        Row: LegalDocument
        Insert: Omit<LegalDocument, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<LegalDocument, 'id'>>
      }
      legal_acceptances: {
        Row: LegalAcceptance
        Insert: Omit<LegalAcceptance, 'id'>
        Update: never
      }
      cancellation_policies: {
        Row: CancellationPolicy
        Insert: Omit<CancellationPolicy, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<CancellationPolicy, 'id'>>
      }
      processing_activities: {
        Row: ProcessingActivity
        Insert: Omit<ProcessingActivity, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProcessingActivity, 'id'>>
      }
      data_processing_agreements: {
        Row: DataProcessingAgreement
        Insert: Omit<DataProcessingAgreement, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DataProcessingAgreement, 'id'>>
      }
      aml_cash_records: {
        Row: AmlCashRecord
        Insert: Omit<AmlCashRecord, 'id' | 'created_at'>
        Update: Partial<Omit<AmlCashRecord, 'id'>>
      }
      data_breaches: {
        Row: DataBreach
        Insert: Omit<DataBreach, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<DataBreach, 'id'>>
      }
      data_breach_timeline: {
        Row: DataBreachTimeline
        Insert: Omit<DataBreachTimeline, 'id'>
        Update: never
      }
      channel_commissions: {
        Row: ChannelCommission
        Insert: Omit<ChannelCommission, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ChannelCommission, 'id'>>
      }
      room_blocks: {
        Row: RoomBlock
        Insert: Omit<RoomBlock, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RoomBlock, 'id'>>
      }
      self_checkin_configs: {
        Row: SelfCheckinConfig
        Insert: Omit<SelfCheckinConfig, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SelfCheckinConfig, 'id'>>
      }
      rental_contracts: {
        Row: RentalContract
        Insert: Omit<RentalContract, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<RentalContract, 'id'>>
      }
      utility_costs: {
        Row: UtilityCost
        Insert: Omit<UtilityCost, 'id' | 'created_at'>
        Update: Partial<Omit<UtilityCost, 'id'>>
      }
      security_deposits: {
        Row: SecurityDeposit
        Insert: Omit<SecurityDeposit, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<SecurityDeposit, 'id'>>
      }
      property_guidelines: {
        Row: PropertyGuideline
        Insert: Omit<PropertyGuideline, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<PropertyGuideline, 'id'>>
      }
    }
    Views: {
      v_daily_operations: {
        Row: DailyOperations
      }
      v_room_availability: {
        Row: RoomAvailability
      }
      v_reservation_financials: {
        Row: ReservationFinancial
      }
    }
    Functions: {
      get_user_entity_ids: { Returns: string[] }
      get_user_tenant_ids: { Returns: string[] }
      generate_reservation_code: { Args: { org_id: string }; Returns: string }
      generate_invoice_number: { Args: { org_id: string }; Returns: string }
    }
  }
}

// Row types
export interface TenantAccount {
  id: string
  name: string
  legal_name: string | null
  billing_email: string | null
  billing_phone: string | null
  vat_number: string | null
  fiscal_code: string | null
  settings: Json
  created_at: string
  updated_at: string
}

export interface TenantMembership {
  id: string
  tenant_id: string
  user_id: string
  role: TenantRole
  is_active: boolean
  permissions: Json
  created_at: string
  updated_at: string
  tenant?: TenantAccount
}

export interface Property {
  id: string
  tenant_id: string | null
  name: string
  slug: string | null
  description: string | null
  type: PropertyType
  legal_name: string | null
  vat_number: string | null
  fiscal_code: string | null
  rea_number: string | null
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
  default_check_in_time: string
  default_check_out_time: string
  default_currency: string
  default_language: string
  default_vat_rate: number
  timezone: string
  tourist_tax_enabled: boolean
  tourist_tax_config: Json
  alloggiati_username: string | null
  alloggiati_password_encrypted: string | null
  alloggiati_structure_code: string | null
  istat_structure_code: string | null
  istat_region: string | null
  sdi_code: string
  invoice_prefix: string
  invoice_next_number: number
  receipt_prefix: string
  receipt_next_number: number
  subscription_plan: SubscriptionPlan
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  primary_color: string
  secondary_color: string
  cin_code: string | null
  cin_expiry: string | null
  cedolare_secca_enabled: boolean
  cedolare_secca_rate: number
  fiscal_regime: FiscalRegime
  has_vat: boolean
  is_imprenditoriale: boolean
  max_units: number | null
  ateco_code: string | null
  scia_number: string | null
  scia_date: string | null
  insurance_policy_number: string | null
  insurance_expiry: string | null
  pets_allowed: boolean
  pet_policy: Json
  settings: Json
  is_active: boolean
  short_description: string | null
  latitude: number | null
  longitude: number | null
  region: string | null
  amenities: Json
  created_at: string
  updated_at: string
  tenant?: TenantAccount | null
}

export type Organization = Property

export interface PlatformSetting {
  key: string
  value: Json
  updated_at: string
  updated_by: string | null
}

export interface StaffMember {
  id: string
  entity_id: string
  user_id: string
  role: StaffRole
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  permissions: Json
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface RoomType {
  id: string
  entity_id: string
  name: string
  code: string | null
  category: RoomCategory
  description: string | null
  base_occupancy: number
  max_occupancy: number
  max_children: number
  base_price: number
  size_sqm: number | null
  amenities: Json
  photos: string[]
  bed_configuration: string | null
  floor_range: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  entity_id: string
  room_type_id: string
  room_number: string
  name: string | null
  floor: number | null
  building: string | null
  status: RoomStatus
  is_active: boolean
  notes: string | null
  features: Json
  created_at: string
  updated_at: string
  // Joined
  room_type?: RoomType
}

export interface RatePlan {
  id: string
  entity_id: string
  name: string
  code: string | null
  rate_type: RateType
  meal_plan: MealPlan
  description: string | null
  cancellation_policy: Json
  is_derived: boolean
  parent_rate_plan_id: string | null
  derivation_rule: Json | null
  is_public: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Season {
  id: string
  entity_id: string
  name: string
  color: string
  date_from: string
  date_to: string
  price_modifier: number
  min_stay: number
  max_stay: number | null
  allowed_arrival_days: number[]
  allowed_departure_days: number[]
  stay_discounts: StayDiscountRule[]
  created_at: string
}

export interface RatePrice {
  id: string
  rate_plan_id: string
  room_type_id: string
  date_from: string
  date_to: string
  price_per_night: number
  price_single_use: number | null
  extra_adult: number
  extra_child: number
  min_stay: number
  max_stay: number | null
  closed_to_arrival: boolean
  closed_to_departure: boolean
  stop_sell: boolean
  allowed_arrival_days: number[] | null
  allowed_departure_days: number[] | null
  stay_discounts: StayDiscountRule[] | null
  created_at: string
  updated_at: string
}

export interface Guest {
  id: string
  entity_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  mobile: string | null
  date_of_birth: string | null
  gender: string | null
  document_type: DocumentType | null
  document_number: string | null
  document_issued_by: string | null
  document_issued_date: string | null
  document_expiry_date: string | null
  document_country: string | null
  document_scan_url: string | null
  address: string | null
  city: string | null
  province: string | null
  zip: string | null
  country: string | null
  nationality: string | null
  citizenship: string | null
  fiscal_code: string | null
  birth_place: string | null
  birth_province: string | null
  birth_country: string | null
  company_name: string | null
  company_vat: string | null
  company_sdi: string | null
  company_pec: string | null
  preferences: Json
  tags: string[]
  internal_notes: string | null
  total_stays: number
  total_nights: number
  total_revenue: number
  last_stay_date: string | null
  privacy_consent: boolean
  privacy_consent_date: string | null
  marketing_consent: boolean
  marketing_consent_date: string | null
  loyalty_level: string | null
  loyalty_points: number
  created_at: string
  updated_at: string
}

export interface Reservation {
  id: string
  entity_id: string
  reservation_code: string
  guest_id: string
  room_id: string | null
  room_type_id: string
  rate_plan_id: string | null
  check_in: string
  check_out: string
  actual_check_in: string | null
  actual_check_out: string | null
  status: ReservationStatus
  source: BookingSource
  adults: number
  children: number
  infants: number
  pet_count: number
  pet_details: Json
  meal_plan: MealPlan
  total_amount: number
  paid_amount: number
  balance: number
  currency: string
  commission_amount: number
  commission_rate: number
  channel_reservation_id: string | null
  channel_confirmation_code: string | null
  channel_name: string | null
  ota_payment_type: OtaPaymentType | null
  ota_prepaid_amount: number
  ota_net_remittance: number
  special_requests: string | null
  internal_notes: string | null
  group_id: string | null
  group_name: string | null
  created_by: string | null
  last_modified_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  // Joined
  guest?: Guest
  room?: Room
  room_type?: RoomType
  rate_plan?: RatePlan
}

export interface FolioCharge {
  id: string
  entity_id: string
  reservation_id: string
  charge_type: FolioChargeType
  description: string
  charge_date: string
  quantity: number
  unit_price: number
  vat_rate: number
  total: number
  is_paid: boolean
  invoice_id: string | null
  reference_id: string | null
  reference_type: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface PoliceRegistration {
  id: string
  entity_id: string
  reservation_id: string
  guest_id: string
  registration_date: string
  accommodation_type: string
  last_name: string
  first_name: string
  gender: string | null
  date_of_birth: string
  birth_place: string
  birth_province: string | null
  birth_country: string
  citizenship: string
  document_type: string
  document_number: string
  document_issued_by: string | null
  is_primary: boolean
  group_leader_id: string | null
  alloggiati_status: AlloggiatiStatus
  file_content: string | null
  sent_at: string | null
  response_message: string | null
  error_details: string | null
  created_at: string
  updated_at: string
}

export interface IstatReport {
  id: string
  entity_id: string
  month: number
  year: number
  arrivals_italian: number
  arrivals_foreign: number
  presences_italian: number
  presences_foreign: number
  breakdown: Json
  is_sent: boolean
  sent_at: string | null
  sent_by: string | null
  response: string | null
  created_at: string
  updated_at: string
}

export interface TouristTaxRecord {
  id: string
  entity_id: string
  reservation_id: string
  guest_id: string
  tax_date: string
  nights: number
  guests_count: number
  rate_per_person: number
  total_amount: number
  is_exempt: boolean
  exemption_reason: string | null
  is_collected: boolean
  collected_at: string | null
  payment_method: PaymentMethod | null
  created_at: string
}

export interface Invoice {
  id: string
  entity_id: string
  reservation_id: string | null
  guest_id: string | null
  invoice_type: InvoiceType
  invoice_number: string
  invoice_date: string
  due_date: string | null
  customer_name: string
  customer_vat: string | null
  customer_fiscal_code: string | null
  customer_address: string | null
  customer_city: string | null
  customer_province: string | null
  customer_zip: string | null
  customer_country: string
  customer_sdi_code: string | null
  customer_pec: string | null
  subtotal: number
  total_vat: number
  total: number
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus
  payment_terms: string | null
  sdi_status: SdiStatus
  sdi_identifier: string | null
  xml_content: string | null
  xml_signed_url: string | null
  pdf_url: string | null
  original_invoice_id: string | null
  notes: string | null
  internal_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  vat_amount: number
  total: number
  sort_order: number
}

export interface Payment {
  id: string
  entity_id: string
  reservation_id: string | null
  invoice_id: string | null
  guest_id: string | null
  amount: number
  currency: string
  payment_date: string
  payment_method: PaymentMethod
  stripe_payment_id: string | null
  stripe_charge_id: string | null
  gateway_type: string | null
  gateway_payment_id: string | null
  gateway_metadata: Record<string, Json>
  description: string | null
  reference_number: string | null
  notes: string | null
  is_refund: boolean
  original_payment_id: string | null
  created_by: string | null
  created_at: string
}

export interface HousekeepingTask {
  id: string
  entity_id: string
  room_id: string
  task_date: string
  task_type: HousekeepingTaskType
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  checklist: Json
  notes: string | null
  maintenance_issue: string | null
  photos: string[]
  started_at: string | null
  completed_at: string | null
  inspected_by: string | null
  inspected_at: string | null
  inspection_notes: string | null
  created_at: string
  updated_at: string
  // Joined
  room?: Room
  assigned_staff?: StaffMember
}

export interface RestaurantService {
  id: string
  entity_id: string
  name: string
  type: string
  is_active: boolean
  settings: Json
  created_at: string
}

export interface RestaurantTable {
  id: string
  entity_id: string
  restaurant_service_id: string
  table_number: string
  seats: number
  area: string | null
  shape: string
  position_x: number
  position_y: number
  is_active: boolean
}

export interface MenuItem {
  id: string
  category_id: string
  entity_id: string
  name: string
  description: string | null
  price: number
  cost: number | null
  allergens: string[]
  dietary_tags: string[]
  photo_url: string | null
  is_available: boolean
  sort_order: number
  created_at: string
}

export interface RestaurantOrder {
  id: string
  entity_id: string
  restaurant_service_id: string
  reservation_id: string | null
  guest_id: string | null
  table_id: string | null
  order_number: string
  order_date: string
  order_time: string
  covers: number
  status: string
  charge_to_room: boolean
  subtotal: number
  vat_amount: number
  total: number
  notes: string | null
  created_by: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}

export interface ExtraService {
  id: string
  entity_id: string
  name: string
  description: string | null
  price: number
  price_type: string
  vat_rate: number
  category: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface Quote {
  id: string
  entity_id: string
  quote_number: string
  guest_id: string | null
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  status: QuoteStatus
  check_in: string | null
  check_out: string | null
  adults: number
  children: number
  options: Json
  message: string | null
  terms: string | null
  valid_until: string | null
  total_min: number | null
  total_max: number | null
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_option: number | null
  converted_reservation_id: string | null
  follow_up_count: number
  last_follow_up_at: string | null
  next_follow_up_at: string | null
  pdf_url: string | null
  token: string | null
  photos: Json
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface MessageTemplate {
  id: string
  entity_id: string
  name: string
  trigger: MessageTrigger
  channel: MessageChannel
  subject: string | null
  body_html: string | null
  body_text: string | null
  variables: string[]
  send_days_offset: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_data: Json | null
  new_data: Json | null
  ip_address: string | null
  user_agent: string | null
  session_id: string | null
  login_timestamp: string | null
  logout_timestamp: string | null
  is_admin_access: boolean
  access_type: string | null
  created_at: string
}

// --- Legal Compliance Types ---

export interface CookieConsent {
  id: string
  session_id: string
  entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  consent_given_at: string
  consent_withdrawn_at: string | null
  preferences: Json
  consent_version: string
  created_at: string
}

export interface LegalDocument {
  id: string
  entity_id: string | null
  document_type: LegalDocumentType
  version: string
  locale: string
  title: string
  content_html: string
  content_plain: string | null
  is_active: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LegalAcceptance {
  id: string
  legal_document_id: string
  guest_id: string | null
  staff_member_id: string | null
  entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  accepted_at: string
}

export interface CancellationPolicy {
  id: string
  entity_id: string
  name: string
  policy_type: CancellationPolicyType
  description: string | null
  free_cancellation_hours: number
  penalty_first_night: boolean
  penalty_percentage: number
  penalty_fixed: number
  right_of_withdrawal_days: number
  withdrawal_excluded: boolean
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProcessingActivity {
  id: string
  entity_id: string
  activity_name: string
  purpose: string
  legal_basis: string
  data_categories: string[]
  data_subjects: string[]
  recipients: string[]
  retention_period: string
  retention_period_days: number | null
  security_measures: string | null
  international_transfers: string | null
  dpia_required: boolean
  dpia_completed_at: string | null
  is_active: boolean
  last_reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  updated_at: string
}

export interface DataProcessingAgreement {
  id: string
  entity_id: string
  controller_name: string
  processor_name: string
  processor_role: string
  status: DPAStatus
  effective_date: string | null
  expiry_date: string | null
  processing_purposes: string
  data_categories: string[]
  data_subjects: string[]
  security_measures: string | null
  sub_processors: Json
  document_url: string | null
  legal_document_id: string | null
  signed_at: string | null
  signed_by_controller: string | null
  signed_by_processor: string | null
  created_at: string
  updated_at: string
}

export interface AmlCashRecord {
  id: string
  entity_id: string
  payment_id: string | null
  reservation_id: string | null
  guest_id: string
  amount: number
  currency: string
  transaction_date: string
  is_threshold_exceeded: boolean
  cumulative_cash_amount: number
  guest_name: string
  guest_document_type: string | null
  guest_document_number: string | null
  guest_fiscal_code: string | null
  guest_nationality: string | null
  verified_by: string | null
  verified_at: string | null
  verification_notes: string | null
  reported_to_uif: boolean
  report_date: string | null
  report_reference: string | null
  created_at: string
}

export interface DataBreach {
  id: string
  entity_id: string
  breach_reference: string
  detected_at: string
  detected_by: string | null
  detection_method: string | null
  title: string
  description: string
  severity: BreachSeverity
  status: BreachStatus
  breach_type: string[]
  data_categories_affected: string[]
  number_of_records_affected: number | null
  number_of_subjects_affected: number | null
  likely_consequences: string | null
  measures_taken: string | null
  measures_planned: string | null
  authority_notification_required: boolean
  authority_notification_deadline: string | null
  authority_notified_at: string | null
  authority_reference: string | null
  subject_notification_required: boolean
  subjects_notified_at: string | null
  subject_notification_method: string | null
  resolved_at: string | null
  resolution_notes: string | null
  root_cause: string | null
  lessons_learned: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DataBreachTimeline {
  id: string
  breach_id: string
  action: string
  description: string | null
  performed_by: string | null
  performed_at: string
}

export interface ChannelConnection {
  id: string
  entity_id: string
  channel_name: string
  is_active: boolean
  credentials: Json
  property_id_external: string | null
  settings: Json
  last_sync_at: string | null
  last_sync_status: string | null
  created_at: string
  updated_at: string
}

export interface ChannelRoomMapping {
  id: string
  channel_connection_id: string
  room_type_id: string
  rate_plan_id: string | null
  external_room_id: string
  external_rate_id: string | null
  is_active: boolean
}

export interface ChannelSyncLog {
  id: string
  entity_id: string
  channel_connection_id: string
  sync_type: string
  direction: string
  status: string
  details: Json
  error_message: string | null
  synced_at: string
}

// View types
export interface DailyOperations {
  entity_id: string
  arrivals_today: number
  departures_today: number
  in_house: number
  total_active: number
}

export interface RoomAvailability {
  entity_id: string
  room_id: string
  room_number: string
  floor: number | null
  room_status: RoomStatus
  room_type_name: string
  category: RoomCategory
  current_reservation_id: string | null
  current_guest_id: string | null
  current_guest_name: string | null
  check_in: string | null
  check_out: string | null
  reservation_status: ReservationStatus | null
}

// --- Channel Commission ---

export interface ChannelCommission {
  id: string
  entity_id: string
  channel: BookingSource
  commission_rate: number
  notes: string | null
  created_at: string
  updated_at: string
}

// --- Room Blocks ---

export interface RoomBlock {
  id: string
  entity_id: string
  room_id: string
  block_type: RoomBlockType
  date_from: string
  date_to: string
  reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  room?: Room
}

// --- Reservation Financial Summary (from v_reservation_financials view) ---

export interface ReservationFinancial {
  reservation_id: string
  entity_id: string
  reservation_code: string
  guest_id: string
  source: BookingSource
  status: ReservationStatus
  check_in: string
  check_out: string
  gross_amount: number
  commission_amount: number
  commission_rate: number
  tourist_tax_amount: number
  net_rental_income: number
  cedolare_secca_amount: number
  iva_amount: number
  ritenuta_ota_amount: number
  fiscal_regime: FiscalRegime
  property_type: PropertyType
  has_vat: boolean
  is_imprenditoriale: boolean
  net_income: number
  ota_payment_type: OtaPaymentType | null
  ota_prepaid_amount: number
  ota_net_remittance: number
  channel_name: string | null
  effective_receivable: number
  is_direct: boolean
  paid_amount: number
  balance: number
  created_at: string
  updated_at: string
}

// --- Aggregated financial types ---

export interface FinancialSummary {
  total_gross: number
  total_commissions: number
  total_tourist_tax: number
  total_cedolare_secca: number
  total_iva: number
  total_ritenuta_ota: number
  total_net_income: number
  total_paid: number
  total_balance: number
  reservation_count: number
}

export interface ChannelFinancialBreakdown {
  channel: BookingSource
  gross_amount: number
  commission_amount: number
  reservation_count: number
  avg_commission_rate: number
}

export interface MonthlyFinancialSummary {
  month: string
  gross_amount: number
  commission_amount: number
  tourist_tax_amount: number
  cedolare_secca_amount: number
  iva_amount: number
  ritenuta_ota_amount: number
  net_income: number
  reservation_count: number
}

// --- Self Check-in ---

export type AccessType = 'keybox' | 'smart_lock' | 'code_panel' | 'key_handoff'

export interface SelfCheckinConfig {
  id: string
  entity_id: string
  room_id: string
  access_type: AccessType
  access_code: string | null
  wifi_network: string | null
  wifi_password: string | null
  checkin_instructions: string | null
  checkout_instructions: string | null
  house_rules: string | null
  smart_lock_provider: string | null
  smart_lock_device_id: string | null
  auto_send: boolean
  send_hours_before: number
  created_at: string
  updated_at: string
  // Joined
  room?: Room
}

// --- Rental Contracts ---

export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'cancelled'

export interface RentalContract {
  id: string
  entity_id: string
  reservation_id: string | null
  guest_id: string | null
  contract_number: string
  contract_date: string
  start_date: string
  end_date: string
  rental_amount: number
  security_deposit_amount: number
  terms_and_conditions: string | null
  special_conditions: string | null
  signed_at: string | null
  signed_by_guest: string | null
  pdf_url: string | null
  ade_registration_number: string | null
  ade_registered_at: string | null
  status: ContractStatus
  created_at: string
  updated_at: string
  // Joined
  guest?: Guest
  reservation?: Reservation
}

// --- Utility Costs ---

export type UtilityType = 'electricity' | 'gas' | 'water' | 'internet' | 'heating' | 'condominium' | 'waste' | 'other'

export interface UtilityCost {
  id: string
  entity_id: string
  utility_type: UtilityType
  period_from: string
  period_to: string
  amount: number
  provider: string | null
  invoice_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// --- Security Deposits ---

export type DepositStatus = 'pending' | 'collected' | 'partially_returned' | 'returned' | 'forfeited'
export type DepositCollectionMethod = 'cash' | 'card_preauth' | 'bank_transfer' | 'stripe' | 'other'

export interface SecurityDeposit {
  id: string
  entity_id: string
  reservation_id: string
  amount: number
  collection_method: DepositCollectionMethod
  collected_at: string | null
  returned_at: string | null
  returned_amount: number | null
  deduction_amount: number
  deduction_reason: string | null
  status: DepositStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  reservation?: Reservation
}

// --- Property Guidelines ---

export type GuidelineType = 'house_rules' | 'area_guide' | 'restaurants' | 'transport' | 'emergency' | 'faq' | 'custom'

export interface PropertyGuideline {
  id: string
  entity_id: string
  room_id: string | null
  guideline_type: GuidelineType
  title: string
  content: string
  locale: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// --- Online Check-in ---

export type CheckinTokenStatus = 'pending' | 'started' | 'completed' | 'expired'

export interface CheckinToken {
  id: string
  entity_id: string
  reservation_id: string
  token: string
  status: CheckinTokenStatus
  guest_data: Json
  document_front_url: string | null
  document_back_url: string | null
  privacy_signed: boolean
  privacy_signed_at: string | null
  arrival_time: string | null
  special_requests: string | null
  completed_at: string | null
  expires_at: string
  created_at: string
  // Joined
  reservation?: Reservation
}

// --- Revenue Management ---

export type PricingRuleType = 'occupancy_based' | 'day_of_week' | 'advance_booking' | 'last_minute' | 'length_of_stay' | 'demand_surge'
export type PriceSuggestionStatus = 'pending' | 'accepted' | 'rejected' | 'auto_applied'

export interface PricingRule {
  id: string
  entity_id: string
  name: string
  rule_type: PricingRuleType
  conditions: Json
  adjustment_type: 'percentage' | 'fixed'
  adjustment_value: number
  priority: number
  is_active: boolean
  room_type_id: string | null
  rate_plan_id: string | null
  valid_from: string | null
  valid_to: string | null
  created_at: string
  updated_at: string
  // Joined
  room_type?: RoomType
  rate_plan?: RatePlan
}

export interface PriceSuggestion {
  id: string
  entity_id: string
  date: string
  room_type_id: string
  current_price: number | null
  suggested_price: number | null
  reason: string | null
  occupancy_forecast: number | null
  rules_applied: Json
  status: PriceSuggestionStatus
  created_at: string
  // Joined
  room_type?: RoomType
}

export interface DailyStats {
  id: string
  entity_id: string
  date: string
  total_rooms: number
  occupied_rooms: number
  occupancy_pct: number
  revenue: number
  adr: number
  revpar: number
  bookings_received: number
  cancellations: number
  created_at: string
}

// --- Messaging Automation ---

export type AutomationTrigger = 'booking_confirmed' | 'pre_arrival_7d' | 'pre_arrival_3d' | 'pre_arrival_1d' | 'checkin_day' | 'during_stay_1d' | 'checkout_day' | 'post_checkout_1d' | 'post_checkout_3d' | 'post_checkout_7d'

export interface MessageAutomation {
  id: string
  entity_id: string
  name: string
  trigger_event: AutomationTrigger
  channel: 'email' | 'whatsapp'
  template_id: string | null
  whatsapp_template_name: string | null
  is_active: boolean
  conditions: Json
  created_at: string
  updated_at: string
  // Joined
  template?: MessageTemplate
}

export interface WhatsAppConversation {
  id: string
  entity_id: string
  guest_id: string | null
  reservation_id: string | null
  phone: string
  guest_name: string | null
  last_message_at: string | null
  unread_count: number
  status: 'active' | 'archived'
  created_at: string
  // Joined
  guest?: Guest
  reservation?: Reservation
  messages?: WhatsAppMessage[]
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  content: string
  media_url: string | null
  media_type: string | null
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  external_id: string | null
  sent_at: string
}

// --- Upselling ---

export type UpsellCategory = 'room_upgrade' | 'experience' | 'transfer' | 'food_beverage' | 'spa_wellness' | 'early_checkin' | 'late_checkout' | 'parking' | 'linen' | 'laundry' | 'kitchen' | 'bike' | 'baby_kit' | 'pet_kit' | 'other'
export type ChargeMode = 'free' | 'paid'
export type PricingMode = 'per_stay' | 'per_night' | 'per_guest' | 'per_item' | 'per_hour' | 'per_day'
export type UpsellOrderStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface UpsellOffer {
  id: string
  entity_id: string
  name: string
  description: string | null
  photo_url: string | null
  price: number
  category: UpsellCategory
  charge_mode: ChargeMode
  pricing_mode: PricingMode
  included_quantity: number
  max_quantity: number | null
  is_active: boolean
  available_days: string[]
  max_per_day: number | null
  requires_request: boolean
  online_bookable: boolean
  advance_notice_hours: number
  sort_order: number
  created_at: string
  updated_at: string
}

export interface UpsellOrder {
  id: string
  entity_id: string
  reservation_id: string
  offer_id: string
  guest_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  requested_date: string | null
  notes: string | null
  status: UpsellOrderStatus
  source: 'guest_portal' | 'reception' | 'email' | 'whatsapp'
  created_at: string
  updated_at: string
  // Joined
  offer?: UpsellOffer
  reservation?: Reservation
  guest?: Guest
}

// ---------------------------------------------------------------------------
// Partner API
// ---------------------------------------------------------------------------

export type PartnerPermission =
  | 'read:availability'
  | 'read:rates'
  | 'write:reservation_request'
  | 'write:reservation'
  | 'read:own_reservations'

export type PartnerRequestStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface PartnerApiKey {
  id: string
  entity_id: string
  partner_name: string
  contact_email: string | null
  contact_phone: string | null
  api_key_hash: string
  api_key_prefix: string
  permissions: PartnerPermission[]
  commission_rate: number
  is_active: boolean
  allowed_room_types: string[]
  allowed_rate_plans: string[]
  max_requests_per_hour: number
  notes: string | null
  last_used_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PartnerReservationRequest {
  id: string
  entity_id: string
  partner_id: string
  reservation_id: string | null
  status: PartnerRequestStatus
  room_type_id: string | null
  rate_plan_id: string | null
  check_in: string
  check_out: string
  adults: number
  children: number
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  notes: string | null
  total_amount: number | null
  commission_amount: number | null
  responded_at: string | null
  created_at: string
  // Joined
  partner?: PartnerApiKey
  reservation?: Reservation
  room_type?: RoomType
}
