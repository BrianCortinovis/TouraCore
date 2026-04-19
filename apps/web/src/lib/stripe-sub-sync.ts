/**
 * Minimal Stripe subscription item sync (proration + qty) via raw REST API.
 * No stripe SDK to keep deps lean. Calls return null on missing env or error.
 */

const STRIPE_API = 'https://api.stripe.com/v1'

function getKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null
}

async function stripeForm(path: string, params: Record<string, string>, method: 'POST' | 'DELETE' = 'POST'): Promise<Record<string, unknown> | null> {
  const key = getKey()
  if (!key) return null
  try {
    const res = await fetch(`${STRIPE_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params).toString(),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn(`[stripe-sub-sync] ${path} ${res.status}: ${err.slice(0, 200)}`)
      return null
    }
    return (await res.json()) as Record<string, unknown>
  } catch (e) {
    console.warn('[stripe-sub-sync] fetch error:', e instanceof Error ? e.message : e)
    return null
  }
}

/** Create new subscription item on existing subscription (proration always_invoice) */
export async function stripeCreateSubscriptionItem(input: {
  subscriptionId: string
  priceId: string
  quantity?: number
}): Promise<string | null> {
  const res = await stripeForm('/subscription_items', {
    subscription: input.subscriptionId,
    price: input.priceId,
    quantity: String(input.quantity ?? 1),
    proration_behavior: 'always_invoice',
  })
  return (res?.id as string) ?? null
}

/** Update existing subscription item quantity */
export async function stripeUpdateSubscriptionItemQuantity(input: {
  subscriptionItemId: string
  quantity: number
}): Promise<boolean> {
  const res = await stripeForm(`/subscription_items/${input.subscriptionItemId}`, {
    quantity: String(input.quantity),
    proration_behavior: 'always_invoice',
  })
  return res !== null
}

/** Delete subscription item (on module deactivate) */
export async function stripeDeleteSubscriptionItem(subscriptionItemId: string): Promise<boolean> {
  const res = await stripeForm(`/subscription_items/${subscriptionItemId}`, { proration_behavior: 'always_invoice' }, 'DELETE')
  return res !== null
}
