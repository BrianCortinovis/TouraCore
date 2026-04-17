import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe } from '@touracore/billing/server'
import { jsonWithCors } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

/**
 * POST /api/public/booking/checkout
 * Body: { reservationId, returnUrl?, cancelUrl? }
 * Ritorna Stripe Checkout session URL → template fa redirect.
 * Pagamento dentro Stripe checkout hosted (PCI compliance demandata a Stripe).
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  let body: any
  try { body = await req.json() } catch { return jsonWithCors({ error: 'Invalid JSON' }, { status: 400, origin }) }

  const reservationId = body?.reservationId as string | undefined
  if (!reservationId) return jsonWithCors({ error: 'reservationId required' }, { status: 400, origin })

  const supabase = await createServiceRoleClient()
  const { data: res } = await supabase
    .from('reservations')
    .select('id, reservation_code, entity_id, total_amount, currency, guest_id, check_in, check_out')
    .eq('id', reservationId)
    .maybeSingle()

  if (!res) return jsonWithCors({ error: 'Reservation not found' }, { status: 404, origin })
  if (Number(res.total_amount) <= 0) return jsonWithCors({ error: 'Amount must be > 0' }, { status: 400, origin })

  const { data: entity } = await supabase
    .from('entities')
    .select('id, slug, name')
    .eq('id', res.entity_id)
    .single()

  const { data: guest } = await supabase
    .from('guests')
    .select('email, first_name, last_name')
    .eq('id', res.guest_id)
    .maybeSingle()

  if (!entity || !guest?.email) {
    return jsonWithCors({ error: 'Missing entity or guest email' }, { status: 400, origin })
  }

  // Determina base url: prod (req.nextUrl.origin) o var envs
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin

  // Open redirect protection: returnUrl/cancelUrl whitelist
  function isSafeReturnUrl(url: string | undefined): boolean {
    if (!url) return false
    try {
      const parsed = new URL(url)
      if (parsed.origin === new URL(baseUrl).origin) return true
      if (origin && parsed.origin === origin) return true
      const allowed = (process.env.PUBLIC_BOOKING_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
      return allowed.includes(parsed.origin)
    } catch {
      return false
    }
  }

  const successUrl = isSafeReturnUrl(body.returnUrl)
    ? body.returnUrl!
    : `${baseUrl}/book/${entity.slug}/success?code=${encodeURIComponent(res.reservation_code)}`
  const cancelUrl = isSafeReturnUrl(body.cancelUrl)
    ? body.cancelUrl!
    : `${baseUrl}/book/${entity.slug}?cancelled=${encodeURIComponent(res.reservation_code)}`

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: guest.email,
      line_items: [
        {
          price_data: {
            currency: (res.currency ?? 'EUR').toLowerCase(),
            unit_amount: Math.round(Number(res.total_amount) * 100),
            product_data: {
              name: `${entity.name} — prenotazione ${res.reservation_code}`,
              description: `${res.check_in} → ${res.check_out}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        reservation_id: res.id,
        reservation_code: res.reservation_code,
        entity_id: res.entity_id,
        kind: 'booking_engine_payment',
      },
    })

    return jsonWithCors({ url: session.url, sessionId: session.id }, { status: 200, origin })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    console.error('[booking/checkout] stripe error', err)
    return jsonWithCors({ error: msg }, { status: 500, origin })
  }
}
