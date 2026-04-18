import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { generateCodePlaintext, hashCodeForStorage } from './code'
import type {
  CreditInstrumentRow,
  IssueCreditInput,
  IssuedCredit,
} from '../types'

/**
 * Issue a new credit instrument (gift card / voucher / promo code / store credit).
 * Returns plaintext code ONLY once — caller must persist or email it, never retrievable later.
 *
 * @param useServiceRole — bypass RLS (per webhook Stripe, cron, partner API). Default false.
 */
export async function issueCredit(
  input: IssueCreditInput,
  opts: { useServiceRole?: boolean } = {},
): Promise<IssuedCredit> {
  const supabase = opts.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()

  const plaintext = input.codeOverride ?? generateCodePlaintext(16)
  const hashed = await hashCodeForStorage(plaintext)

  const status: CreditInstrumentRow['status'] = input.pending ? 'pending' : 'active'
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('credit_instruments')
    .insert({
      tenant_id: input.tenantId,
      kind: input.kind,
      code_hash: hashed.bcryptHash,
      code_last4: hashed.last4,
      code_lookup_hash: hashed.lookupHash,
      initial_amount: input.initialAmount,
      current_balance: input.kind === 'promo_code' ? 0 : input.initialAmount,
      currency: input.currency ?? 'EUR',
      discount_type: input.discountType ?? null,
      discount_value: input.discountValue ?? null,
      entity_scope: input.entityScope ?? [],
      vertical_scope: input.verticalScope ?? [],
      min_purchase_amount: input.minPurchaseAmount ?? null,
      max_amount_per_use: input.maxAmountPerUse ?? null,
      max_uses: input.maxUses ?? null,
      status,
      activated_at: input.pending ? null : now,
      expires_at: input.expiresAt ?? null,
      recipient_email: input.recipientEmail ?? null,
      recipient_name: input.recipientName ?? null,
      sender_email: input.senderEmail ?? null,
      sender_name: input.senderName ?? null,
      personal_message: input.personalMessage ?? null,
      delivery_scheduled_at: input.deliveryScheduledAt ?? null,
      issued_via: input.issuedVia ?? 'manual',
      issued_by_user_id: input.issuedByUserId ?? null,
      partner_id: input.partnerId ?? null,
      design_id: input.designId ?? null,
      design_overrides: input.designOverrides ?? null,
      purchase_order_id: input.purchaseOrderId ?? null,
      purchase_amount: input.purchaseAmount ?? null,
      purchase_tax: input.purchaseTax ?? null,
      purchase_currency: input.currency ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
    })
    .select('id, initial_amount, currency, expires_at, recipient_email, kind')
    .single()

  if (error || !data) {
    throw new Error(`issueCredit failed: ${error?.message ?? 'unknown'}`)
  }

  // Issue ledger entry (append-only audit)
  await supabase.from('credit_transactions').insert({
    credit_instrument_id: data.id,
    tenant_id: input.tenantId,
    type: 'issue',
    amount: input.initialAmount,
    balance_before: 0,
    balance_after: input.kind === 'promo_code' ? 0 : input.initialAmount,
    currency: input.currency ?? 'EUR',
    actor_user_id: input.issuedByUserId ?? null,
    reason: input.issuedVia ?? 'manual',
  })

  return {
    id: data.id as string,
    code: plaintext,
    codeLast4: hashed.last4,
    kind: data.kind as IssuedCredit['kind'],
    initialAmount: Number(data.initial_amount),
    currency: data.currency as string,
    expiresAt: (data.expires_at as string | null) ?? null,
    recipientEmail: (data.recipient_email as string | null) ?? null,
  }
}

export async function activateCredit(params: {
  creditInstrumentId: string
  tenantId: string
  useServiceRole?: boolean
}): Promise<boolean> {
  const supabase = params.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { error } = await supabase
    .from('credit_instruments')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', params.creditInstrumentId)
    .eq('tenant_id', params.tenantId)
    .eq('status', 'pending')
  if (error) return false
  await supabase.from('credit_transactions').insert({
    credit_instrument_id: params.creditInstrumentId,
    tenant_id: params.tenantId,
    type: 'activate',
    amount: 0,
    balance_before: 0,
    balance_after: 0,
    reason: 'activation post-payment',
  })
  return true
}
