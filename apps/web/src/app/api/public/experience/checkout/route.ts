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
    .from('experience_reservations')
    .select('id, tenant_id, reference_code, total_cents, currency, customer_email, customer_name, start_at, end_at, experience_products:product_id(name)')
    .eq('id', parsed.reservationId)
    .maybeSingle()

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  const r = reservation as {
    id: string
    tenant_id: string
    reference_code: string
    total_cents: number | null
    currency: string | null
    customer_email: string | null
    start_at: string
    end_at: string
    experience_products: { name: string } | { name: string }[] | null
  }

  const totalCents = Number(r.total_cents ?? 0)
  if (totalCents <= 0) return NextResponse.json({ error: 'Amount must be > 0' }, { status: 400 })
  if (!r.customer_email) return NextResponse.json({ error: 'Missing customer email' }, { status: 400 })

  const connectParams = await buildConnectChargeParamsSafe({
    tenantId: r.tenant_id,
    moduleCode: 'experiences',
    baseAmountCents: totalCents,
    appliesTo: 'booking_total',
  })
  if (!connectParams) {
    return NextResponse.json(
      { error: 'Tenant non ha completato il setup pagamenti Stripe' },
      { status: 400 },
    )
  }

  await admin
    .from('experience_reservations')
    .update({ application_fee_amount_cents: connectParams.application_fee_amount })
    .eq('id', r.id)

  const product = Array.isArray(r.experience_products) ? r.experience_products[0] : r.experience_products

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: r.customer_email,
      payment_intent_data: {
        application_fee_amount: connectParams.application_fee_amount,
        on_behalf_of: connectParams.on_behalf_of,
        transfer_data: connectParams.transfer_data,
        metadata: {
          reservation_id: r.id,
          tenant_id: r.tenant_id,
          vertical: 'experience',
        },
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: (r.currency ?? 'EUR').toLowerCase(),
          unit_amount: totalCents,
          product_data: {
            name: `${product?.name ?? 'Esperienza'} — ${r.reference_code}`,
            description: `${r.start_at.slice(0,16).replace('T',' ')}`,
          },
        },
      }],
      success_url: parsed.successUrl,
      cancel_url: parsed.cancelUrl,
      metadata: {
        reservation_id: r.id,
        vertical: 'experience',
      },
    })
    return NextResponse.json({ checkoutUrl: session.url, sessionId: session.id }, { status: 200 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe error'
    console.error('[experience/checkout] stripe error', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
