// Helper Stripe Connect Direct Charge.
// Calcola application_fee_amount e costruisce parametri Stripe per Direct Charge
// dove il cliente paga direttamente al Connect account del tenant e TouraCore
// preleva solo la commissione.

import { createServiceRoleClient } from '@touracore/db/server'
import type { BillingProfile } from './types'
import { resolveBillingProfile, calculateCommission } from './profiles'

export interface TenantConnectInfo {
  id: string
  stripe_connect_account_id: string | null
  stripe_connect_charges_enabled: boolean
  stripe_connect_payouts_enabled: boolean
}

export async function getTenantConnect(tenantId: string): Promise<TenantConnectInfo | null> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('tenants')
    .select('id, stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_payouts_enabled')
    .eq('id', tenantId)
    .maybeSingle()
  return (data as TenantConnectInfo | null) ?? null
}

export interface ApplicationFeeInput {
  tenantId: string
  moduleCode: 'hospitality' | 'restaurant' | 'bike_rental' | 'experiences' | string
  baseAmountCents: number
  appliesTo?: 'booking_total' | 'booking_net' | 'coperto' | 'rental' | 'upsell'
}

export interface ApplicationFeeResult {
  feeCents: number
  profile: BillingProfile | null
  source: 'profile' | 'fallback_zero'
}

/**
 * Calcola application_fee_amount per Stripe Direct Charge basandosi su billing_profiles
 * (TouraCore→tenant). Se profilo è 'subscription' (canone fisso) → fee=0 sul singolo charge.
 * Se 'commission' o 'hybrid' → applica % sul base.
 */
export async function computeApplicationFee(input: ApplicationFeeInput): Promise<ApplicationFeeResult> {
  const supabase = await createServiceRoleClient()
  let profile: BillingProfile | null = null
  try {
    profile = await resolveBillingProfile(supabase, input.tenantId, input.moduleCode as never)
  } catch (err) {
    console.warn('[computeApplicationFee] resolve_billing_profile failed', err)
  }
  if (!profile || profile.billing_model === 'free' || profile.billing_model === 'subscription') {
    return { feeCents: 0, profile, source: profile ? 'profile' : 'fallback_zero' }
  }

  // baseAmountCents → € per calculateCommission che lavora in EUR
  const baseEur = input.baseAmountCents / 100
  const { total } = calculateCommission({
    profile,
    baseAmount: baseEur,
    appliesTo: input.appliesTo ?? 'booking_total',
  })
  const feeCents = Math.max(0, Math.round(total * 100))
  return { feeCents, profile, source: 'profile' }
}

export interface ConnectChargeParams {
  application_fee_amount: number
  on_behalf_of: string
  transfer_data: { destination: string }
}

/**
 * Costruisce i parametri Stripe per Direct Charge.
 * Throw se tenant non ha Connect attivo (charges_enabled=false).
 */
export async function buildConnectChargeParams(input: ApplicationFeeInput): Promise<ConnectChargeParams> {
  const tenant = await getTenantConnect(input.tenantId)
  if (!tenant?.stripe_connect_account_id || !tenant.stripe_connect_charges_enabled) {
    throw new Error('TENANT_STRIPE_CONNECT_NOT_READY')
  }
  const { feeCents } = await computeApplicationFee(input)
  return {
    application_fee_amount: feeCents,
    on_behalf_of: tenant.stripe_connect_account_id,
    transfer_data: { destination: tenant.stripe_connect_account_id },
  }
}

/**
 * Variante "soft": ritorna null invece di throw se tenant non ready.
 * Utile per checkout che vogliono fare graceful degradation
 * (es. messaggio chiaro all'utente invece di 500).
 */
export async function buildConnectChargeParamsSafe(
  input: ApplicationFeeInput,
): Promise<ConnectChargeParams | null> {
  try {
    return await buildConnectChargeParams(input)
  } catch {
    return null
  }
}
