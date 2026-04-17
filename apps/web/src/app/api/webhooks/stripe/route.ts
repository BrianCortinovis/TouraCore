import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import {
  getStripe,
  getWebhookSecret,
  upsertSubscription,
  upsertConnectAccount,
  addLedgerEntry,
} from '@touracore/billing/server'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const stripe = getStripe()
    event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Firma non valida'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const supabase = await createServiceRoleClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      const plan = session.metadata?.plan
      const kind = session.metadata?.kind

      // Booking engine payment → mark reservation paid + insert payment record
      if (kind === 'booking_engine_payment') {
        const reservationId = session.metadata?.reservation_id
        if (reservationId && session.amount_total) {
          const amount = session.amount_total / 100
          const { data: reservation } = await supabase
            .from('reservations')
            .select('id, entity_id, guest_id, paid_amount, currency')
            .eq('id', reservationId)
            .maybeSingle()

          if (reservation) {
            const newPaid = Number(reservation.paid_amount ?? 0) + amount
            await supabase
              .from('reservations')
              .update({ paid_amount: newPaid, updated_at: new Date().toISOString() })
              .eq('id', reservationId)

            await supabase.from('payments').insert({
              entity_id: reservation.entity_id,
              reservation_id: reservation.id,
              guest_id: reservation.guest_id,
              amount,
              currency: (reservation.currency ?? 'EUR').toUpperCase(),
              payment_method: 'online',
              stripe_payment_id: session.payment_intent as string,
              gateway_type: 'stripe',
              gateway_payment_id: session.id,
              gateway_metadata: { session_id: session.id, customer: session.customer },
              description: `Booking engine payment ${session.metadata?.reservation_code ?? ''}`,
              reference_number: session.metadata?.reservation_code ?? null,
            })
          }
        }
        break
      }

      if (tenantId && plan) {
        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: plan as 'starter' | 'professional' | 'enterprise',
          status: 'active',
        })
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      if (!tenantId) break

      await upsertSubscription(supabase, tenantId, {
        status: sub.status as 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing',
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      if (!tenantId) break

      await upsertSubscription(supabase, tenantId, {
        status: 'canceled',
        cancel_at_period_end: false,
      })
      break
    }

    case 'account.updated': {
      const account = event.data.object as Stripe.Account
      const tenantId = account.metadata?.tenant_id
      if (!tenantId) break

      await upsertConnectAccount(supabase, tenantId, account.id, {
        charges_enabled: account.charges_enabled ?? false,
        payouts_enabled: account.payouts_enabled ?? false,
        onboarding_complete: (account.charges_enabled && account.payouts_enabled) ?? false,
      })
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const tenantId = invoice.metadata?.tenant_id
      if (!tenantId) break

      await addLedgerEntry(supabase, {
        tenant_id: tenantId,
        type: 'subscription_charge',
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: invoice.currency?.toUpperCase() ?? 'EUR',
        description: `Fattura ${invoice.number ?? invoice.id}`,
        status: 'completed',
      })
      break
    }

    case 'payment_intent.succeeded': {
      const pi = event.data.object as Stripe.PaymentIntent
      const tenantId = pi.metadata?.tenant_id
      const reservationId = pi.metadata?.reservation_id
      if (!tenantId) break

      if (pi.transfer_data?.destination) {
        await addLedgerEntry(supabase, {
          tenant_id: tenantId,
          reservation_id: reservationId,
          type: 'booking_commission',
          amount: (pi.application_fee_amount ?? 0) / 100,
          currency: pi.currency.toUpperCase(),
          stripe_payment_intent_id: pi.id,
          description: 'Commissione prenotazione',
          status: 'completed',
        })
      }
      break
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge
      const tenantId = charge.metadata?.tenant_id
      if (!tenantId) break

      await addLedgerEntry(supabase, {
        tenant_id: tenantId,
        type: 'refund',
        amount: (charge.amount_refunded ?? 0) / 100,
        currency: charge.currency.toUpperCase(),
        description: 'Rimborso',
        status: 'completed',
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
