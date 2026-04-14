import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe, getConnectClientId } from './stripe'
import type { ConnectAccount } from './types'

export async function getConnectAccount(supabase: SupabaseClient, tenantId: string): Promise<ConnectAccount | null> {
  const { data } = await supabase
    .from('connect_accounts')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  return (data as ConnectAccount) ?? null
}

export async function createConnectOnboardingUrl(params: {
  tenantId: string
  refreshUrl: string
  returnUrl: string
}): Promise<string> {
  const stripe = getStripe()

  const account = await stripe.accounts.create({
    type: 'express',
    country: 'IT',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: { tenant_id: params.tenantId },
  })

  const link = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: 'account_onboarding',
  })

  return link.url
}

export async function upsertConnectAccount(
  supabase: SupabaseClient,
  tenantId: string,
  stripeAccountId: string,
  data: Partial<ConnectAccount>
): Promise<void> {
  const existing = await getConnectAccount(supabase, tenantId)

  if (existing) {
    await supabase
      .from('connect_accounts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
  } else {
    await supabase
      .from('connect_accounts')
      .insert({
        tenant_id: tenantId,
        stripe_account_id: stripeAccountId,
        ...data,
      })
  }
}

export async function createDestinationCharge(params: {
  amount: number
  currency: string
  connectedAccountId: string
  applicationFeeAmount: number
  description?: string
  metadata?: Record<string, string>
}): Promise<string> {
  const stripe = getStripe()

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(params.amount * 100),
    currency: params.currency.toLowerCase(),
    application_fee_amount: Math.round(params.applicationFeeAmount * 100),
    transfer_data: {
      destination: params.connectedAccountId,
    },
    description: params.description,
    metadata: params.metadata,
  })

  return paymentIntent.id
}
