export type CreditKind = 'gift_card' | 'voucher' | 'promo_code' | 'store_credit'

export type CreditStatus =
  | 'active'
  | 'redeemed'
  | 'expired'
  | 'cancelled'
  | 'suspended'
  | 'pending'

export type DiscountType = 'percent' | 'fixed' | 'stored_value'

export type IssuedVia =
  | 'purchase'
  | 'manual'
  | 'refund'
  | 'campaign'
  | 'partner'
  | 'api'
  | 'loyalty_convert'

export type Vertical =
  | 'hospitality'
  | 'restaurant'
  | 'bike_rental'
  | 'experiences'
  | 'wellness'

export type ReservationTable =
  | 'reservations'
  | 'restaurant_reservations'
  | 'bike_rental_reservations'
  | 'reservation_bundles'

export type CreditTransactionType =
  | 'issue'
  | 'redeem'
  | 'refund'
  | 'expire'
  | 'adjust'
  | 'cancel'
  | 'activate'
  | 'suspend'
  | 'resume'

export type RedemptionErrorCode =
  | 'invalid_code'
  | 'expired'
  | 'depleted'
  | 'cancelled'
  | 'suspended'
  | 'out_of_scope'
  | 'ip_rate_limit'
  | 'code_rate_limit'
  | 'internal_error'

export interface CreditInstrumentRow {
  id: string
  tenant_id: string
  kind: CreditKind
  code_hash: string
  code_last4: string
  code_lookup_hash: string
  initial_amount: number
  current_balance: number
  currency: string
  discount_type: DiscountType | null
  discount_value: number | null
  entity_scope: string[]
  vertical_scope: string[]
  min_purchase_amount: number | null
  max_amount_per_use: number | null
  status: CreditStatus
  issued_at: string
  activated_at: string | null
  expires_at: string | null
  first_used_at: string | null
  last_used_at: string | null
  max_uses: number | null
  uses_count: number
  recipient_email: string | null
  recipient_name: string | null
  sender_email: string | null
  sender_name: string | null
  personal_message: string | null
  delivery_scheduled_at: string | null
  delivered_at: string | null
  purchase_order_id: string | null
  purchase_amount: number | null
  purchase_tax: number | null
  purchase_currency: string | null
  issued_by_user_id: string | null
  issued_via: IssuedVia
  partner_id: string | null
  design_id: string | null
  design_overrides: Record<string, unknown> | null
  metadata: Record<string, unknown>
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreditTransactionRow {
  id: string
  credit_instrument_id: string
  tenant_id: string
  type: CreditTransactionType
  amount: number
  balance_before: number
  balance_after: number
  currency: string
  reservation_id: string | null
  reservation_table: ReservationTable | null
  vertical: Vertical | null
  actor_user_id: string | null
  actor_ip: string | null
  actor_user_agent: string | null
  idempotency_key: string | null
  reason: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface GiftCardDesignRow {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  is_system: boolean
  theme_preset: string | null
  primary_color: string | null
  secondary_color: string | null
  background_style: string | null
  background_value: string | null
  font_family: string | null
  hero_image_url: string | null
  logo_url: string | null
  accent_emoji: string | null
  layout_variant: string | null
  default_message: string | null
  footer_text: string | null
  created_at: string
  updated_at: string
}

export interface RedemptionResult {
  success: boolean
  credit_instrument_id: string | null
  amount_applied: number | null
  balance_remaining: number | null
  kind: CreditKind | null
  currency: string | null
  error_code: RedemptionErrorCode | null
  error_message: string | null
}

export interface IssueCreditInput {
  tenantId: string
  kind: CreditKind
  initialAmount: number
  currency?: string
  expiresAt?: string
  maxUses?: number
  maxAmountPerUse?: number
  minPurchaseAmount?: number
  discountType?: DiscountType
  discountValue?: number
  entityScope?: string[]
  verticalScope?: Vertical[]
  recipientEmail?: string
  recipientName?: string
  senderEmail?: string
  senderName?: string
  personalMessage?: string
  deliveryScheduledAt?: string
  issuedVia?: IssuedVia
  issuedByUserId?: string
  partnerId?: string
  designId?: string
  designOverrides?: Record<string, unknown>
  purchaseOrderId?: string
  purchaseAmount?: number
  purchaseTax?: number
  notes?: string
  metadata?: Record<string, unknown>
  /** If true, do not activate immediately (e.g. waiting for Stripe payment confirmation) */
  pending?: boolean
  /** Pre-generated code for physical cards; otherwise auto-generated */
  codeOverride?: string
}

export interface IssuedCredit {
  id: string
  code: string // plaintext — mostrato UNA VOLTA al creator, mai più
  codeLast4: string
  kind: CreditKind
  initialAmount: number
  currency: string
  expiresAt: string | null
  recipientEmail: string | null
}
