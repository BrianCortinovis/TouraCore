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
import { isWebhookEventProcessed, recordWebhookEvent } from '@/lib/webhook-dedup'

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

  // Idempotency: dedup tramite stripe event.id
  if (await isWebhookEventProcessed('stripe', event.id)) {
    return NextResponse.json({ received: true, idempotent: true })
  }

  const supabase = await createServiceRoleClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      const plan = session.metadata?.plan
      const kind = session.metadata?.kind

      // Gift card purchase: emette credit_instrument + email JWT link
      if (session.metadata?.flow === 'gift_card_purchase') {
        const tid = session.metadata.tenant_id
        if (tid) {
          try {
            const { issueCredit, signVoucherJwt, renderGiftCardEmail } = await import(
              '@touracore/vouchers/server'
            )
            const { Resend } = await import('resend')
            const amount = Number(session.metadata.amount ?? '0')
            const verticalScope = (session.metadata.vertical_scope ?? '')
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
            const deliveryAt = session.metadata.delivery_scheduled_at || undefined

            // Expiry 1y from purchase
            const expiresAt = new Date()
            expiresAt.setFullYear(expiresAt.getFullYear() + 1)

            const issued = await issueCredit(
              {
                tenantId: tid,
                kind: 'gift_card',
                initialAmount: amount,
                currency: (session.metadata.currency ?? 'EUR').toUpperCase(),
                expiresAt: expiresAt.toISOString(),
                verticalScope: verticalScope as never,
                recipientEmail: session.metadata.recipient_email,
                recipientName: session.metadata.recipient_name,
                senderEmail: session.metadata.sender_email,
                senderName: session.metadata.sender_name,
                personalMessage: session.metadata.personal_message || undefined,
                designId: session.metadata.design_id || undefined,
                deliveryScheduledAt: deliveryAt,
                issuedVia: 'purchase',
                purchaseOrderId: session.id,
                purchaseAmount: amount,
              },
              { useServiceRole: true },
            )

            // Fetch tenant + design + instrument full for email render
            const [tenantData, designData, instrumentData] = await Promise.all([
              supabase.from('tenants').select('name, slug').eq('id', tid).maybeSingle(),
              session.metadata.design_id
                ? supabase
                    .from('gift_card_designs')
                    .select('*')
                    .eq('id', session.metadata.design_id)
                    .maybeSingle()
                : Promise.resolve({ data: null }),
              supabase
                .from('credit_instruments')
                .select('*')
                .eq('id', issued.id)
                .maybeSingle(),
            ])

            const tenantName = (tenantData.data as { name?: string } | null)?.name ?? 'TouraCore'
            const tenantSlug = (tenantData.data as { slug?: string } | null)?.slug ?? ''

            if (instrumentData.data) {
              // Sign JWT + deliver URL
              const jwt = await signVoucherJwt({
                instrumentId: issued.id,
                tenantId: tid,
                kind: 'gift_card',
                purpose: 'delivery',
              })
              const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL
                ? process.env.NEXT_PUBLIC_APP_URL ?? `https://${process.env.VERCEL_URL}`
                : 'https://touracore.vercel.app'
              const deliveryUrl = `${appUrl}/credits/${jwt}`

              const emailContent = renderGiftCardEmail({
                credit: instrumentData.data as never,
                design: (designData.data as never) ?? null,
                deliveryUrl,
                tenantName,
              })

              // Skip send if scheduled for future
              const now = Date.now()
              const sendLater = deliveryAt && new Date(deliveryAt).getTime() > now

              if (!sendLater && session.metadata.recipient_email) {
                try {
                  const resend = new Resend(process.env.RESEND_API_KEY ?? '')
                  await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL ?? 'noreply@touracore.app',
                    to: session.metadata.recipient_email,
                    subject: emailContent.subject,
                    html: emailContent.html,
                    text: emailContent.text,
                  })
                  await supabase
                    .from('credit_instruments')
                    .update({ delivered_at: new Date().toISOString() })
                    .eq('id', issued.id)
                } catch (emailErr) {
                  console.error('gift card email send failed', emailErr)
                }
              }
            }
          } catch (giftErr) {
            console.error('gift card issue failed', giftErr)
          }
        }
        break
      }

      // Unified reservation bundle (multi-vertical cart)
      if (session.metadata?.type === 'bundle') {
        const bundleId = session.metadata?.bundle_id
        if (bundleId) {
          const { data: bundle } = await supabase
            .from('reservation_bundles')
            .select('id, tenant_id, status, stripe_payment_intent_id')
            .eq('id', bundleId)
            .maybeSingle()

          if (bundle && bundle.status !== 'confirmed') {
            await supabase
              .from('reservation_bundles')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                stripe_charge_id: (session.payment_intent as string) ?? session.id,
                stripe_customer_id: (session.customer as string) ?? null,
                payment_method_type: session.payment_method_types?.[0] ?? 'card',
              })
              .eq('id', bundleId)

            await supabase.from('bundle_audit_log').insert({
              bundle_id: bundleId,
              tenant_id: bundle.tenant_id,
              actor_type: 'webhook',
              actor_id: event.id,
              event_type: 'bundle.paid',
              event_data: { session_id: session.id, amount: session.amount_total },
            })

            // Saga fulfillment (async trigger — in v1 direct call)
            // TODO: enqueue to Inngest/edge function per reliability
            try {
              const fulfillRes = await fetch(
                `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/v1/bundles/${bundleId}/fulfill`,
                {
                  method: 'POST',
                  headers: {
                    'content-type': 'application/json',
                    'x-cron-secret': process.env.CRON_SECRET ?? '',
                  },
                },
              )
              if (!fulfillRes.ok) {
                await supabase
                  .from('reservation_bundles')
                  .update({
                    last_saga_error: `fulfill trigger failed: ${fulfillRes.status}`,
                  })
                  .eq('id', bundleId)
              }
            } catch (e) {
              await supabase
                .from('reservation_bundles')
                .update({
                  last_saga_error: e instanceof Error ? e.message : String(e),
                })
                .eq('id', bundleId)
            }
          }
        }
        break
      }

      // Restaurant deposit hold via Stripe checkout
      if (session.metadata?.type === 'restaurant_deposit') {
        const restaurantReservationId = session.metadata?.restaurant_reservation_id
        if (restaurantReservationId) {
          // Verifica reservation esiste + match payment_intent_id (anti-tampering metadata)
          const { data: reservation } = await supabase
            .from('restaurant_reservations')
            .select('id, deposit_stripe_intent_id, restaurant_id')
            .eq('id', restaurantReservationId)
            .maybeSingle()
          if (reservation && reservation.deposit_stripe_intent_id === session.payment_intent) {
            await supabase
              .from('restaurant_reservations')
              .update({
                status: 'confirmed',
                deposit_status: 'held',
                updated_at: new Date().toISOString(),
              })
              .eq('id', restaurantReservationId)
          }
        }
        break
      }

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
        // Verifica tenant matcha customer (anti-metadata-tampering)
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, stripe_customer_id')
          .eq('id', tenantId)
          .maybeSingle()
        const customerOk = tenant && (
          !tenant.stripe_customer_id || tenant.stripe_customer_id === session.customer
        )
        if (customerOk) {
          await upsertSubscription(supabase, tenantId, {
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            plan: plan as 'starter' | 'professional' | 'enterprise',
            status: 'active',
          })
        }
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

      // Sync subscription_items: 1 riga per line item Stripe (ognuno è un modulo)
      for (const item of sub.items.data) {
        const moduleCode = item.metadata?.module_code ?? item.price.metadata?.module_code
        if (!moduleCode) continue
        const { data: subRow } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('tenant_id', tenantId)
          .maybeSingle()
        if (!subRow) continue
        await supabase.from('subscription_items').upsert(
          {
            subscription_id: subRow.id,
            tenant_id: tenantId,
            module_code: moduleCode,
            stripe_subscription_item_id: item.id,
            quantity: item.quantity ?? 1,
            unit_amount_eur: (item.price.unit_amount ?? 0) / 100,
            status: sub.status as 'trialing' | 'active' | 'paused' | 'past_due' | 'canceled',
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          },
          { onConflict: 'tenant_id,module_code' }
        )

        // Se status active o trialing → modulo attivo su tenant.modules
        if (sub.status === 'active' || sub.status === 'trialing') {
          const { data: tenantRow } = await supabase
            .from('tenants')
            .select('modules')
            .eq('id', tenantId)
            .single()
          const modules =
            (tenantRow?.modules ?? {}) as Record<string, { active: boolean; source: string; since?: string; trial_until?: string }>
          modules[moduleCode] = {
            active: true,
            source: sub.status === 'trialing' ? 'trial' : 'subscription',
            since: new Date().toISOString(),
            ...(sub.trial_end
              ? { trial_until: new Date(sub.trial_end * 1000).toISOString() }
              : {}),
          }
          await supabase.from('tenants').update({ modules }).eq('id', tenantId)
        }
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const tenantId = invoice.metadata?.tenant_id
      if (!tenantId) break
      const graceUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await upsertSubscription(supabase, tenantId, { status: 'past_due' })
      await supabase.from('tenants').update({ billing_grace_until: graceUntil }).eq('id', tenantId)
      await supabase.from('module_activation_log').insert({
        tenant_id: tenantId,
        module_code: 'all',
        action: 'payment_failed',
        actor_scope: 'system',
        stripe_event_id: event.id,
        notes: `Invoice ${invoice.id} failed. Grace until ${graceUntil}`,
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
      // Clear grace period
      await supabase.from('tenants').update({ billing_grace_until: null }).eq('id', tenantId)
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

  // Record event come processed (idempotency)
  await recordWebhookEvent('stripe', event.id, event.type)

  return NextResponse.json({ received: true })
}
