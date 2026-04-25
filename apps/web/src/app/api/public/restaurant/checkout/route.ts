import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { getStripe, buildConnectChargeParamsSafe } from '@touracore/billing/server'
import { jsonWithCors } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

const Body = z.object({
  reservationId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

function isSafeRedirectUrl(url: string, allowedOrigin: string | null): boolean {
  try {
    const parsed = new URL(url)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (baseUrl && parsed.origin === new URL(baseUrl).origin) return true
    if (allowedOrigin && parsed.origin === allowedOrigin) return true
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
    return jsonWithCors(
      { error: e instanceof Error ? e.message : 'Invalid body' },
      { status: 400, origin },
    )
  }

  // Open redirect protection: validate URLs match allowed origins
  if (!isSafeRedirectUrl(parsed.successUrl, origin) || !isSafeRedirectUrl(parsed.cancelUrl, origin)) {
    return jsonWithCors({ error: 'Invalid redirect URL' }, { status: 400, origin })
  }

  const admin = await createServiceRoleClient()
  const { data: reservation } = await admin
    .from('restaurant_reservations')
    .select('id, restaurant_id, party_size, deposit_amount, deposit_status, deposit_stripe_intent_id, guest_email, guest_name, slot_date, slot_time, restaurants:restaurant_id(tenant_id)')
    .eq('id', parsed.reservationId)
    .maybeSingle()

  if (!reservation) {
    return jsonWithCors({ error: 'Reservation not found' }, { status: 404, origin })
  }

  if (!reservation.deposit_amount || (reservation.deposit_amount as number) <= 0) {
    return jsonWithCors({ error: 'No deposit required' }, { status: 400, origin })
  }

  const restaurantField = (reservation as unknown as { restaurants?: { tenant_id: string } | { tenant_id: string }[] | null }).restaurants
  const restaurant = Array.isArray(restaurantField) ? (restaurantField[0] ?? null) : (restaurantField ?? null)
  if (!restaurant?.tenant_id) {
    return jsonWithCors({ error: 'Tenant not resolvable' }, { status: 400, origin })
  }

  const depositCents = Math.round((reservation.deposit_amount as number) * 100)
  const connectParams = await buildConnectChargeParamsSafe({
    tenantId: restaurant.tenant_id,
    moduleCode: 'restaurant',
    baseAmountCents: depositCents,
    appliesTo: 'coperto',
  })
  if (!connectParams) {
    return jsonWithCors(
      { error: 'Tenant non ha completato il setup pagamenti Stripe' },
      { status: 400, origin },
    )
  }

  await admin
    .from('restaurant_reservations')
    .update({ application_fee_amount_cents: connectParams.application_fee_amount })
    .eq('id', reservation.id)

  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_intent_data: {
      capture_method: 'manual',
      application_fee_amount: connectParams.application_fee_amount,
      on_behalf_of: connectParams.on_behalf_of,
      transfer_data: connectParams.transfer_data,
      metadata: {
        restaurant_reservation_id: reservation.id as string,
        tenant_id: restaurant.tenant_id,
        vertical: 'restaurant',
        type: 'restaurant_deposit',
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: Math.round((reservation.deposit_amount as number) * 100),
          product_data: {
            name: `Deposito tavolo · ${reservation.party_size} coperti`,
            description: `${reservation.slot_date} ${(reservation.slot_time as string).slice(0, 5)}`,
          },
        },
      },
    ],
    customer_email: (reservation.guest_email as string) ?? undefined,
    success_url: parsed.successUrl,
    cancel_url: parsed.cancelUrl,
    metadata: {
      restaurant_reservation_id: reservation.id as string,
    },
  })

  await admin
    .from('restaurant_reservations')
    .update({ deposit_stripe_intent_id: session.payment_intent as string })
    .eq('id', reservation.id)

  return jsonWithCors({ checkoutUrl: session.url, sessionId: session.id }, { status: 200, origin })
}
