export type SubscriptionPlan = 'trial' | 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
export type LedgerEntryType = 'booking_commission' | 'subscription_charge' | 'payout' | 'refund' | 'adjustment'
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'

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
