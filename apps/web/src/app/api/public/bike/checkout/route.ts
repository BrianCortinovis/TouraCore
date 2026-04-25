import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe, buildConnectChargeParamsSafe } from '@touracore/billing/server'

export const runtime = 'nodejs'

const Body = z.object({
  reservationId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

function isSafeRedirectUrl(url: string, origin: string | null): boolean {
  try {
    const parsed = new URL(url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL
    if (baseUrl && parsed.origin === new URL(baseUrl).origin) return true
    if (origin && parsed.origin === origin) return true
    const allowed = (process.env.PUBLIC_BOOKING_ALLOWED_ORIGINS ?? '').split(',').filter(Boolean)
    return allowed.includes(parsed.origin)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  let parsed: z.infer<typeof Body>
  try {
    parsed = Body.parse(await req.json())
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid body' },
      { status: 400 },
    )
  }

  if (!isSafeRedirectUrl(parsed.successUrl, origin) || !isSafeRedirectUrl(parsed.cancelUrl, origin)) {
    return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 })
  }

  const admin = await createServiceRoleClient()
  const { data: reservation } = await admin
    .from('bike_rental_reservations')
    .select('id, tenant_id, reference_code, total_amount, currency, guest_email, guest_name, rental_start, rental_end, bike_rentals:bike_rental_id(name)')
    .eq('id', parsed.reservationId)
    .maybeSingle()

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  const r = reservation as {
    id: string
    tenant_id: string
    reference_code: string
    total_amount: number | null
    currency: string | null
    guest_email: string | null
    rental_start: string
    rental_end: string
    bike_rentals: { name: string } | { name: string }[] | null
  }

  const total = Number(r.total_amount ?? 0)
  if (total <= 0) return NextResponse.json({ error: 'Amount must be > 0' }, { status: 400 })
  if (!r.guest_email) return NextResponse.json({ error: 'Missing guest email' }, { status: 400 })

  const totalCents = Math.round(total * 100)
  const connectParams = await buildConnectChargeParamsSafe({
    tenantId: r.tenant_id,
    moduleCode: 'bike_rental',
    baseAmountCents: totalCents,
    appliesTo: 'rental',
  })
  if (!connectParams) {
    return NextResponse.json(
      { error: 'Tenant non ha completato il setup pagamenti Stripe' },
      { status: 400 },
    )
  }

  await admin
    .from('bike_rental_reservations')
    .update({ application_fee_amount_cents: connectParams.application_fee_amount })
    .eq('id', r.id)

  const rental = Array.isArray(r.bike_rentals) ? r.bike_rentals[0] : r.bike_rentals

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: r.guest_email,
      payment_intent_data: {
        application_fee_amount: connectParams.application_fee_amount,
        on_behalf_of: connectParams.on_behalf_of,
        transfer_data: connectParams.transfer_data,
        metadata: {
          reservation_id: r.id,
          tenant_id: r.tenant_id,
          vertical: 'bike',
        },
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (r.currency ?? 'EUR').toLowerCase(),
          unit_amount: totalCents,
          product_data: {
            name: `${rental?.name ?? 'Noleggio bici'} — ${r.reference_code}`,
            description: `${r.rental_start.slice(0,10)} → ${r.rental_end.slice(0,10)}`,
          },
        },
      }],
      success_url: parsed.successUrl,
      cancel_url: parsed.cancelUrl,
      metadata: {
        reservation_id: r.id,
        vertical: 'bike',
      },
    })
    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    console.error('[bike/checkout] stripe error', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
