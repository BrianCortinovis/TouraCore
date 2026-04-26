import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe, buildConnectChargeParamsSafe } from '@touracore/billing/server'
import { jsonWithCors } from '../_shared'

export async function OPTIONS(req: NextRequest) {
  return jsonWithCors({}, { status: 204, origin: req.headers.get('origin') })
}

const Body = z.object({
  tenantId: z.string().uuid(),
  amount: z.number().min(10).max(5000),
  currency: z.string().default('EUR'),
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(200),
  senderEmail: z.string().email(),
  senderName: z.string().min(1).max(200),
  personalMessage: z.string().max(2000).optional(),
  designId: z.string().uuid().optional(),
  verticalScope: z.array(z.string()).default([]),
  deliveryScheduledAt: z.string().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin')
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch (e) {
    return jsonWithCors(
      { error: 'invalid_input', detail: e instanceof Error ? e.message : String(e) },
      { status: 400, origin },
    )
  }

  const supabase = await createServiceRoleClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', body.tenantId)
    .maybeSingle()
  if (!tenant) {
    return jsonWithCors({ error: 'tenant_not_found' }, { status: 404, origin })
  }

  try {
    const stripe = getStripe()
    const amountCents = Math.round(body.amount * 100)
    const successUrl = body.successUrl.replace(
      '{CHECKOUT_SESSION_ID}',
      '{CHECKOUT_SESSION_ID}',
    )

    // Connect Direct Charge: tenant emittente è merchant of record.
    const connectParams = await buildConnectChargeParamsSafe({
      tenantId: tenant.id,
      moduleCode: 'gift_card',
      baseAmountCents: amountCents,
    })
    if (!connectParams) {
      return jsonWithCors(
        { error: 'tenant_stripe_connect_not_ready', detail: 'Il tenant non ha completato l\'onboarding Stripe Connect' },
        { status: 400, origin },
      )
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: body.currency.toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name: `Gift Card ${tenant.name} — €${body.amount.toFixed(2)}`,
              description: body.personalMessage
                ? `Per ${body.recipientName}: ${body.personalMessage.slice(0, 200)}`
                : `Gift card digitale per ${body.recipientName}`,
            },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: connectParams.application_fee_amount,
        on_behalf_of: connectParams.on_behalf_of,
        transfer_data: connectParams.transfer_data,
      },
      customer_email: body.senderEmail,
      success_url: successUrl,
      cancel_url: body.cancelUrl,
      metadata: {
        flow: 'gift_card_purchase',
        tenant_id: tenant.id,
        amount: String(body.amount),
        currency: body.currency,
        recipient_email: body.recipientEmail,
        recipient_name: body.recipientName,
        sender_email: body.senderEmail,
        sender_name: body.senderName,
        personal_message: (body.personalMessage ?? '').slice(0, 400),
        design_id: body.designId ?? '',
        vertical_scope: body.verticalScope.join(','),
        delivery_scheduled_at: body.deliveryScheduledAt ?? '',
      },
    })

    return jsonWithCors({ url: session.url, id: session.id }, { status: 200, origin })
  } catch (e) {
    return jsonWithCors(
      { error: 'stripe_error', detail: e instanceof Error ? e.message : String(e) },
      { status: 500, origin },
    )
  }
}
