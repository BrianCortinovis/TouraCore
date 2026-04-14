import { getDecryptedCredentials } from './credentials'

export async function processPayment(
  entityId: string,
  _amountCents: number,
  _currency: string,
): Promise<{ success: boolean; skipped?: boolean }> {
  const creds = await getDecryptedCredentials(entityId, 'stripe_connect')
  if (!creds) return { success: true, skipped: true }
  // Stub: API Stripe Connect non ancora collegata
  return { success: true, skipped: true }
}
