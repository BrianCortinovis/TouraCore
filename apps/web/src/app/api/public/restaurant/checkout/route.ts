import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { getStripe } from '@touracore/billing/server'
import { jsonWithCors } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

const Body = z.object({
  reservationId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

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

  const admin = await createServiceRoleClient()
  const { data: reservation } = await admin
    .from('restaurant_reservations')
    .select('id, restaurant_id, party_size, deposit_amount, deposit_status, deposit_stripe_intent_id, guest_email, guest_name, slot_date, slot_time')
    .eq('id', parsed.reservationId)
    .maybeSingle()

  if (!reservation) {
    return jsonWithCors({ error: 'Reservation not found' }, { status: 404, origin })
  }

  if (!reservation.deposit_amount || (reservation.deposit_amount as number) <= 0) {
    return jsonWithCors({ error: 'No deposit required' }, { status: 400, origin })
  }

  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_intent_data: {
      capture_method: 'manual',
      metadata: {
        restaurant_reservation_id: reservation.id as string,
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
