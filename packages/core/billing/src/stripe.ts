import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY non configurata')
    stripeInstance = new Stripe(key, { apiVersion: '2025-02-24.acacia' })
  }
  return stripeInstance
}

export function getConnectClientId(): string {
  const id = process.env.STRIPE_CONNECT_CLIENT_ID
  if (!id) throw new Error('STRIPE_CONNECT_CLIENT_ID non configurato')
  return id
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET non configurato')
  return secret
}
