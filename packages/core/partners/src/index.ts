export type PartnerKind =
  | 'hotel'
  | 'tour_operator'
  | 'travel_agent'
  | 'influencer'
  | 'ota'
  | 'affiliate'
  | 'corporate'
  | 'other'

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'terminated'

export type PartnerLinkChannel = 'url' | 'embed' | 'api' | 'social' | 'email' | 'print' | 'other'

export type CommissionStatus = 'pending' | 'earned' | 'approved' | 'paid' | 'reversed' | 'disputed'

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled'

export type PartnerVertical = 'hospitality' | 'restaurant' | 'bike_rental' | 'experiences' | 'wellness'

export type ReservationTable =
  | 'reservations'
  | 'restaurant_reservations'
  | 'bike_rental_reservations'
  | 'reservation_bundles'

export interface PartnerRow {
  id: string
  tenant_id: string
  slug: string
  name: string
  kind: PartnerKind
  status: PartnerStatus
  contact_email: string
  contact_phone: string | null
  contact_person: string | null
  company_name: string | null
  company_website: string | null
  company_vat_number: string | null
  country: string | null
  user_id: string | null
  commission_pct_default: number
  commission_per_vertical: Record<string, number>
  payout_method: 'stripe_connect' | 'bank_transfer' | 'manual' | null
  payout_schedule: 'weekly' | 'monthly' | 'quarterly' | 'on_demand'
  stripe_account_id: string | null
  bank_iban: string | null
  bank_holder: string | null
  bank_bic: string | null
  minimum_payout_amount: number
  accepted_terms_at: string | null
  accepted_terms_version: string | null
  notes_internal: string | null
  metadata: Record<string, unknown>
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface PartnerLinkRow {
  id: string
  partner_id: string
  tenant_id: string
  code: string
  label: string | null
  channel: PartnerLinkChannel | null
  target_entity_id: string | null
  target_url: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  commission_pct_override: number | null
  associated_credit_instrument_id: string | null
  click_count: number
  conversion_count: number
  last_click_at: string | null
  last_conversion_at: string | null
  active: boolean
  valid_from: string | null
  valid_until: string | null
  created_at: string
  updated_at: string
}

export interface PartnerCommissionRow {
  id: string
  partner_id: string
  tenant_id: string
  partner_link_id: string | null
  source_type: 'url' | 'embed' | 'api'
  reservation_id: string
  reservation_table: ReservationTable
  vertical: PartnerVertical
  booking_amount: number
  commission_pct: number
  commission_amount: number
  currency: string
  status: CommissionStatus
  earned_at: string | null
  approved_at: string | null
  approved_by_user_id: string | null
  paid_at: string | null
  payout_id: string | null
  reversed_at: string | null
  reversed_reason: string | null
  idempotency_key: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface PartnerPayoutRow {
  id: string
  partner_id: string
  tenant_id: string
  period_start: string | null
  period_end: string | null
  total_amount: number
  commission_count: number
  currency: string
  method: 'stripe_connect' | 'bank_transfer' | 'manual'
  status: PayoutStatus
  stripe_transfer_id: string | null
  bank_reference: string | null
  initiated_at: string | null
  completed_at: string | null
  failed_at: string | null
  failure_reason: string | null
  receipt_url: string | null
  created_at: string
  updated_at: string
}

export interface PartnerApiKeyRow {
  id: string
  partner_id: string
  tenant_id: string
  key_id: string
  secret_hash: string
  secret_last4: string
  name: string
  scope: string[]
  environment: 'live' | 'sandbox'
  rate_limit_per_minute: number
  ip_allowlist: string[]
  active: boolean
  last_used_at: string | null
  last_used_ip: string | null
  expires_at: string | null
  revoked_at: string | null
  revoked_reason: string | null
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}
