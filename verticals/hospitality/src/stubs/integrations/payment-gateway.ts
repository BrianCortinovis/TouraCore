import { createServiceRoleClient } from '@touracore/db/server'
import { getDecryptedCredentials } from './credentials'

export async function processPayment(
  entityId: string,
  amountCents: number,
  currency: string,
): Promise<{ success: boolean; skipped?: boolean; paymentIntentId?: string; clientSecret?: string; reason?: string }> {
  if (!entityId) return { success: false, reason: 'entityId mancante' }
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return { success: false, reason: 'Importo non valido' }
  }

  const creds = await getDecryptedCredentials(entityId, 'stripe_connect')
  const accountIdFromCreds = typeof creds?.account_id === 'string' ? creds.account_id.trim() : ''

  const supabase = await createServiceRoleClient()
  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', entityId)
    .maybeSingle()

  const tenantId = entity?.tenant_id as string | undefined

  let connectedAccountId = accountIdFromCreds

  if (!connectedAccountId && tenantId) {
    const { data: connectAccount } = await supabase
      .from('connect_accounts')
      .select('stripe_account_id, charges_enabled, onboarding_complete')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (connectAccount?.charges_enabled && connectAccount.onboarding_complete) {
      connectedAccountId = connectAccount.stripe_account_id
    }
  }

  if (!connectedAccountId) {
    return { success: true, skipped: true, reason: 'Stripe Connect non configurato per questa struttura' }
  }

  try {
    const secretKey = process.env.STRIPE_SECRET_KEY
    if (!secretKey) {
      return { success: false, reason: 'STRIPE_SECRET_KEY non configurata' }
    }

    const body = new URLSearchParams()
    body.set('amount', String(Math.round(amountCents)))
    body.set('currency', currency.toLowerCase())
    body.set('automatic_payment_methods[enabled]', 'true')
    body.set('transfer_data[destination]', connectedAccountId)
    body.set('metadata[entity_id]', entityId)
    body.set('metadata[source]', 'hospitality')

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const payload = await response.json().catch(() => null) as
      | { id?: string; client_secret?: string; error?: { message?: string } }
      | null

    if (!response.ok || !payload?.id) {
      return {
        success: false,
        reason: payload?.error?.message ?? `Stripe API error ${response.status}`,
      }
    }

    return {
      success: true,
      paymentIntentId: payload.id,
      clientSecret: payload.client_secret ?? undefined,
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Errore creazione pagamento Stripe'
    return { success: false, reason }
  }
}
