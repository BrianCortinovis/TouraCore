import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import { lookupHashFromPlaintext } from './code'
import type {
  RedemptionResult,
  Vertical,
  ReservationTable,
  RedemptionErrorCode,
} from '../types'

export interface RedeemCreditInput {
  code: string
  tenantId: string
  amount: number
  reservationId?: string
  reservationTable?: ReservationTable
  vertical?: Vertical
  entityId?: string
  idempotencyKey?: string
  actorUserId?: string
  actorIp?: string
  actorUserAgent?: string
}

/**
 * Redeem a credit instrument atomically.
 * Rate limit check pre-call, then atomic PG function.
 *
 * @param useServiceRole — required for public booking (anon) flow
 */
export async function redeemCredit(
  input: RedeemCreditInput,
  opts: { useServiceRole?: boolean } = {},
): Promise<RedemptionResult> {
  const supabase = opts.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()

  const lookupHash = lookupHashFromPlaintext(input.code)

  // 1. Rate limit check (fail-closed)
  const { data: rateLimit } = await supabase.rpc('check_credit_redemption_rate_limit', {
    p_ip: input.actorIp ?? null,
    p_code_lookup_hash: lookupHash,
  })
  const rl = rateLimit?.[0]
  if (rl && !rl.allowed) {
    return {
      success: false,
      credit_instrument_id: null,
      amount_applied: null,
      balance_remaining: null,
      kind: null,
      currency: null,
      error_code: (rl.reason as RedemptionErrorCode | null) ?? 'internal_error',
      error_message: 'Troppi tentativi, riprova più tardi',
    }
  }

  // 2. Atomic redemption via PG function
  const { data, error } = await supabase.rpc('redeem_credit_instrument', {
    p_code_lookup_hash: lookupHash,
    p_code_plaintext: input.code.toUpperCase().replace(/\s+/g, ''),
    p_tenant_id: input.tenantId,
    p_amount: input.amount,
    p_reservation_id: input.reservationId ?? null,
    p_reservation_table: input.reservationTable ?? null,
    p_vertical: input.vertical ?? null,
    p_entity_id: input.entityId ?? null,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_actor_user_id: input.actorUserId ?? null,
    p_actor_ip: input.actorIp ?? null,
    p_actor_ua: input.actorUserAgent ?? null,
  })

  if (error) {
    return {
      success: false,
      credit_instrument_id: null,
      amount_applied: null,
      balance_remaining: null,
      kind: null,
      currency: null,
      error_code: 'internal_error',
      error_message: error.message,
    }
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    return {
      success: false,
      credit_instrument_id: null,
      amount_applied: null,
      balance_remaining: null,
      kind: null,
      currency: null,
      error_code: 'internal_error',
      error_message: 'no result',
    }
  }

  return {
    success: row.success,
    credit_instrument_id: row.credit_instrument_id,
    amount_applied: row.amount_applied !== null ? Number(row.amount_applied) : null,
    balance_remaining: row.balance_remaining !== null ? Number(row.balance_remaining) : null,
    kind: row.kind,
    currency: row.currency,
    error_code: row.error_code,
    error_message: row.error_message,
  }
}

/**
 * Validate code WITHOUT redeeming (quote phase).
 * Returns what WOULD apply if redeemed. Does NOT lock balance.
 * Same rate limit guards apply.
 */
export async function validateCredit(
  input: {
    code: string
    tenantId: string
    amount: number
    vertical?: Vertical
    entityId?: string
    actorIp?: string
  },
  opts: { useServiceRole?: boolean } = {},
): Promise<RedemptionResult> {
  const supabase = opts.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const lookupHash = lookupHashFromPlaintext(input.code)

  // Rate limit
  const { data: rateLimit } = await supabase.rpc('check_credit_redemption_rate_limit', {
    p_ip: input.actorIp ?? null,
    p_code_lookup_hash: lookupHash,
  })
  const rl = rateLimit?.[0]
  if (rl && !rl.allowed) {
    return {
      success: false,
      credit_instrument_id: null,
      amount_applied: null,
      balance_remaining: null,
      kind: null,
      currency: null,
      error_code: (rl.reason as RedemptionErrorCode | null) ?? 'internal_error',
      error_message: 'Troppi tentativi, riprova più tardi',
    }
  }

  // Lookup senza lock (read only, no balance change)
  const { data: ci } = await supabase
    .from('credit_instruments')
    .select(
      'id, kind, code_hash, status, current_balance, expires_at, vertical_scope, entity_scope, discount_type, discount_value, max_amount_per_use, max_uses, uses_count, currency, tenant_id',
    )
    .eq('code_lookup_hash', lookupHash)
    .eq('tenant_id', input.tenantId)
    .maybeSingle()

  if (!ci) {
    return {
      success: false,
      credit_instrument_id: null,
      amount_applied: null,
      balance_remaining: null,
      kind: null,
      currency: null,
      error_code: 'invalid_code',
      error_message: 'Codice non valido',
    }
  }

  if (ci.status !== 'active') {
    return {
      success: false,
      credit_instrument_id: ci.id,
      amount_applied: null,
      balance_remaining: ci.current_balance,
      kind: ci.kind,
      currency: ci.currency,
      error_code: ci.status as RedemptionErrorCode,
      error_message: `Codice in stato ${ci.status}`,
    }
  }

  if (ci.expires_at && new Date(ci.expires_at) < new Date()) {
    return {
      success: false,
      credit_instrument_id: ci.id,
      amount_applied: null,
      balance_remaining: ci.current_balance,
      kind: ci.kind,
      currency: ci.currency,
      error_code: 'expired',
      error_message: 'Codice scaduto',
    }
  }

  // Scope checks
  if (
    input.vertical &&
    Array.isArray(ci.vertical_scope) &&
    ci.vertical_scope.length > 0 &&
    !ci.vertical_scope.includes(input.vertical)
  ) {
    return {
      success: false,
      credit_instrument_id: ci.id,
      amount_applied: null,
      balance_remaining: ci.current_balance,
      kind: ci.kind,
      currency: ci.currency,
      error_code: 'out_of_scope',
      error_message: 'Codice non valido per questo servizio',
    }
  }

  if (
    input.entityId &&
    Array.isArray(ci.entity_scope) &&
    ci.entity_scope.length > 0 &&
    !ci.entity_scope.includes(input.entityId)
  ) {
    return {
      success: false,
      credit_instrument_id: ci.id,
      amount_applied: null,
      balance_remaining: ci.current_balance,
      kind: ci.kind,
      currency: ci.currency,
      error_code: 'out_of_scope',
      error_message: 'Codice non valido per questa attività',
    }
  }

  // Compute effective amount
  let applied = 0
  if (ci.kind === 'promo_code') {
    if (ci.discount_type === 'percent') {
      applied = Math.round(((input.amount * Number(ci.discount_value)) / 100) * 100) / 100
    } else if (ci.discount_type === 'fixed') {
      applied = Math.min(Number(ci.discount_value), input.amount)
    }
  } else {
    applied = Math.min(input.amount, Number(ci.current_balance))
    if (ci.max_amount_per_use) {
      applied = Math.min(applied, Number(ci.max_amount_per_use))
    }
  }

  return {
    success: applied > 0,
    credit_instrument_id: ci.id,
    amount_applied: applied,
    balance_remaining: Number(ci.current_balance),
    kind: ci.kind,
    currency: ci.currency,
    error_code: applied === 0 ? 'depleted' : null,
    error_message: applied === 0 ? 'Saldo insufficiente' : null,
  }
}

/**
 * Refund a prior redemption (booking cancelled).
 * Reverts balance + creates compensating ledger entry.
 */
export async function refundCredit(params: {
  creditInstrumentId: string
  tenantId: string
  amount: number
  reason?: string
  idempotencyKey?: string
  actorUserId?: string
  useServiceRole?: boolean
}): Promise<{ success: boolean; error?: string }> {
  const supabase = params.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()

  // Idempotency
  if (params.idempotencyKey) {
    const { data: existing } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('idempotency_key', params.idempotencyKey)
      .eq('tenant_id', params.tenantId)
      .maybeSingle()
    if (existing) return { success: true }
  }

  // Fetch + update balance
  const { data: ci } = await supabase
    .from('credit_instruments')
    .select('id, current_balance, initial_amount, kind, currency, status')
    .eq('id', params.creditInstrumentId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()
  if (!ci) return { success: false, error: 'not_found' }

  const balanceBefore = Number(ci.current_balance)
  const initialAmount = Number(ci.initial_amount)
  const newBalance = Math.min(initialAmount, balanceBefore + params.amount)

  const { error } = await supabase
    .from('credit_instruments')
    .update({
      current_balance: newBalance,
      status: ci.status === 'redeemed' ? 'active' : ci.status,
    })
    .eq('id', params.creditInstrumentId)
  if (error) return { success: false, error: error.message }

  await supabase.from('credit_transactions').insert({
    credit_instrument_id: params.creditInstrumentId,
    tenant_id: params.tenantId,
    type: 'refund',
    amount: params.amount,
    balance_before: balanceBefore,
    balance_after: newBalance,
    currency: ci.currency,
    actor_user_id: params.actorUserId ?? null,
    idempotency_key: params.idempotencyKey ?? null,
    reason: params.reason ?? 'booking refund',
  })
  return { success: true }
}

/**
 * Suspend / resume / cancel — admin operations with audit trail.
 */
export async function setCreditStatus(params: {
  creditInstrumentId: string
  tenantId: string
  status: 'active' | 'suspended' | 'cancelled'
  reason?: string
  actorUserId?: string
}): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { data: ci } = await supabase
    .from('credit_instruments')
    .select('status, current_balance, currency')
    .eq('id', params.creditInstrumentId)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()
  if (!ci) return false

  const { error } = await supabase
    .from('credit_instruments')
    .update({ status: params.status })
    .eq('id', params.creditInstrumentId)
  if (error) return false

  const txType =
    params.status === 'cancelled'
      ? 'cancel'
      : params.status === 'suspended'
        ? 'suspend'
        : 'resume'

  await supabase.from('credit_transactions').insert({
    credit_instrument_id: params.creditInstrumentId,
    tenant_id: params.tenantId,
    type: txType,
    amount: 0,
    balance_before: Number(ci.current_balance),
    balance_after: Number(ci.current_balance),
    currency: ci.currency,
    actor_user_id: params.actorUserId ?? null,
    reason: params.reason ?? null,
  })
  return true
}
