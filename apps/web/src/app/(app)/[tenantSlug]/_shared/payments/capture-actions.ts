'use server'

import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getStripe } from '@touracore/billing/server'

const CaptureSchema = z.object({
  vertical: z.enum(['hospitality', 'restaurant', 'bike', 'experience']),
  reservationId: z.string().uuid(),
})

const TABLES = {
  hospitality: 'reservations',
  restaurant: 'restaurant_reservations',
  bike: 'bike_rental_reservations',
  experience: 'experience_reservations',
} as const

/**
 * Cattura il PaymentIntent autorizzato (pre-auth) per una prenotazione.
 * Da chiamare dall'UI tenant al check-in/check-out per finalizzare addebito.
 */
export async function capturePaymentAction(
  input: z.infer<typeof CaptureSchema>,
): Promise<{ ok: boolean; status?: string; error?: string }> {
  const parsed = CaptureSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'invalid_input' }

  // Auth check minimale: utente loggato (no permission specifica per ora)
  const userClient = await createServerSupabaseClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return { ok: false, error: 'unauthorized' }

  const supabase = await createServiceRoleClient()
  const table = TABLES[parsed.data.vertical]

  // Trova ultimo attempt 'succeeded' (= autorizzato, in attesa capture)
  const { data: attempt } = await supabase
    .from('reservation_payment_attempts')
    .select('stripe_payment_intent_id')
    .eq('vertical', parsed.data.vertical)
    .eq('reservation_id', parsed.data.reservationId)
    .eq('status', 'succeeded')
    .order('attempt_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  const piId = (attempt as { stripe_payment_intent_id?: string } | null)?.stripe_payment_intent_id
  if (!piId) return { ok: false, error: 'no_authorized_intent' }

  let stripe
  try { stripe = getStripe() } catch { return { ok: false, error: 'stripe_not_configured' } }

  try {
    const pi = await stripe.paymentIntents.capture(piId)

    await supabase.from(table).update({
      payment_state: pi.status === 'succeeded' ? 'captured' : 'authorized',
    }).eq('id', parsed.data.reservationId)

    return { ok: true, status: pi.status }
  } catch (err) {
    const e = err as { code?: string; message?: string }
    return { ok: false, error: e.code ?? e.message ?? 'capture_failed' }
  }
}
