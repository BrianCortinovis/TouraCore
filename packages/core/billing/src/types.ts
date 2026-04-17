export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type LedgerEntryType = 'booking_commission' | 'subscription_charge' | 'payout' | 'refund' | 'adjustment'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

export type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

export type EntityKind =
  | 'accommodation'
  | 'activity'
  | 'restaurant'
  | 'wellness'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

export type BillingModel = 'subscription' | 'commission' | 'hybrid' | 'free'
export type BillingScope = 'tenant' | 'agency' | 'global_default'
export type ModuleItemStatus = 'trialing' | 'active' | 'paused' | 'past_due' | 'canceled'
export type OverrideType = 'free' | 'discount_percent' | 'discount_flat' | 'extended_trial'
export type OverrideScope = 'super_admin' | 'agency'
export type CommissionAppliesTo = 'booking_total' | 'booking_net' | 'coperto' | 'rental' | 'upsell'

export interface Subscription {
  id: string
  tenant_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export interface ConnectAccount {
  id: string
  tenant_id: string
  stripe_account_id: string
  charges_enabled: boolean
  payouts_enabled: boolean
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export interface CommissionEntry {
  id: string
  tenant_id: string
  reservation_id: string | null
  type: LedgerEntryType
  amount: number
  currency: string
  stripe_payment_intent_id: string | null
  stripe_transfer_id: string | null
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  description: string | null
  created_at: string
  billing_profile_id: string | null
  module_code: ModuleCode | null
  commission_percent_applied: number | null
  base_amount_eur: number | null
  applies_to: CommissionAppliesTo | null
  agency_id: string | null
  platform_amount_eur: number | null
  agency_amount_eur: number | null
}

export interface Invoice {
  id: string
  tenant_id: string
  stripe_invoice_id: string | null
  number: string
  amount: number
  currency: string
  status: InvoiceStatus
  period_start: string | null
  period_end: string | null
  pdf_url: string | null
  created_at: string
}

export interface ModuleCatalogEntry {
  code: ModuleCode
  label: string
  description: string | null
  icon: string | null
  base_price_eur: number
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  entity_kind: EntityKind | null
  dependencies: ModuleCode[]
  trial_days: number
  pausable: boolean
  active: boolean
  order_idx: number
}

export interface BundleDiscount {
  id: string
  min_modules: number
  discount_percent: number
  active: boolean
}

export interface SubscriptionItem {
  id: string
  subscription_id: string
  tenant_id: string
  module_code: ModuleCode
  stripe_subscription_item_id: string | null
  quantity: number
  unit_amount_eur: number
  status: ModuleItemStatus
  trial_end: string | null
  paused_until: string | null
  current_period_start: string | null
  current_period_end: string | null
  created_at: string
  updated_at: string
}

export interface ModuleOverride {
  id: string
  tenant_id: string
  module_code: ModuleCode
  override_type: OverrideType
  override_value: number | null
  reason: string
  granted_by_user_id: string | null
  granted_by_scope: OverrideScope
  granted_by_agency_id: string | null
  valid_from: string
  valid_until: string | null
  active: boolean
  revoked_at: string | null
  revoked_by_user_id: string | null
  revoked_reason: string | null
  created_at: string
  updated_at: string
}

export interface BillingProfile {
  id: string
  scope: BillingScope
  scope_id: string | null
  module_code: ModuleCode | null
  billing_model: BillingModel
  subscription_price_eur: number | null
  subscription_interval: 'month' | 'year'
  commission_percent: number | null
  commission_fixed_eur: number
  commission_applies_to: CommissionAppliesTo[]
  commission_min_eur: number | null
  commission_cap_eur: number | null
  platform_commission_percent: number | null
  agency_commission_percent: number | null
  active: boolean
  valid_from: string
  valid_until: string | null
  created_by_user_id: string | null
  created_by_scope: 'super_admin' | 'agency' | 'system' | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface TenantModuleState {
  active: boolean
  source: 'subscription' | 'override_free' | 'legacy' | 'trial'
  since?: string
  trial_until?: string
}

export type TenantModules = Partial<Record<ModuleCode, TenantModuleState>>

// Legacy — kept only for backwards compatibility su pagine vecchie.
// Nuove UI devono usare getEffectiveModulePrice via RPC resolve_billing_profile.
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  trial: 0,
  starter: 29,
  professional: 79,
  enterprise: 199,
}

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  trial: 'Prova gratuita',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export const MODULE_LABELS: Record<ModuleCode, string> = {
  hospitality: 'Struttura ricettiva',
  restaurant: 'Ristorazione',
  wellness: 'Wellness/SPA',
  experiences: 'Esperienze/Tour',
  bike_rental: 'Bike/E-bike',
  moto_rental: 'Moto',
  ski_school: 'Scuola sci',
}

export const MODULE_TO_KIND: Record<ModuleCode, EntityKind> = {
  hospitality: 'accommodation',
  restaurant: 'restaurant',
  wellness: 'wellness',
  experiences: 'activity',
  bike_rental: 'bike_rental',
  moto_rental: 'moto_rental',
  ski_school: 'ski_school',
}

export const KIND_TO_MODULE: Record<EntityKind, ModuleCode> = {
  accommodation: 'hospitality',
  activity: 'experiences',
  restaurant: 'restaurant',
  wellness: 'wellness',
  bike_rental: 'bike_rental',
  moto_rental: 'moto_rental',
  ski_school: 'ski_school',
}

// Route verticali → module code
export const VERTICAL_TO_MODULE: Record<string, ModuleCode> = {
  stays: 'hospitality',
  dine: 'restaurant',
  wellness: 'wellness',
  experiences: 'experiences',
  activities: 'experiences',
  bike: 'bike_rental',
  moto: 'moto_rental',
  ski: 'ski_school',
}

export const MODULE_TO_VERTICAL: Record<ModuleCode, string> = {
  hospitality: 'stays',
  restaurant: 'dine',
  wellness: 'wellness',
  experiences: 'experiences',
  bike_rental: 'bike',
  moto_rental: 'moto',
  ski_school: 'ski',
}
