import type { SupabaseClient } from '@supabase/supabase-js'
import { getStripe } from './stripe'
import type { Subscription, SubscriptionPlan } from './types'

export async function getSubscription(supabase: SupabaseClient, tenantId: string): Promise<Subscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  return (data as Subscription) ?? null
}

export async function createCheckoutSession(params: {
  tenantId: string
  plan: SubscriptionPlan
  customerEmail: string
  successUrl: string
  cancelUrl: string
}): Promise<string> {
  const stripe = getStripe()

  const priceMap: Record<SubscriptionPlan, string | undefined> = {
    trial: undefined,
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  }

  const priceId = priceMap[params.plan]
  if (!priceId) throw new Error(`Nessun prezzo configurato per il piano ${params.plan}`)

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: params.customerEmail,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { tenant_id: params.tenantId, plan: params.plan },
  })

  return session.url!
}

export async function createCustomerPortalSession(params: {
  customerId: string
  returnUrl: string
}): Promise<string> {
  const stripe = getStripe()

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  })

  return session.url
}

export async function cancelSubscription(stripeSubscriptionId: string): Promise<void> {
  const stripe = getStripe()
  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at_period_end: true,
  })
}

export async function upsertSubscription(
  supabase: SupabaseClient,
  tenantId: string,
  data: Partial<Subscription>
): Promise<void> {
  const existing = await getSubscription(supabase, tenantId)

  if (existing) {
    await supabase
      .from('subscriptions')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
  } else {
    await supabase
      .from('subscriptions')
      .insert({ tenant_id: tenantId, ...data })
  }
}
