import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe, buildConnectChargeParamsSafe } from '@touracore/billing/server'
import { defaultFiscalRouter } from '@touracore/fiscal'
import { extractVat, type VatRate } from '@touracore/fiscal'
import type Stripe from 'stripe'

const BundleSchema = z.object({
  tenantSlug: z.string().min(1).max(120),
  guest: z.object({
    fullName: z.string().min(1).max(200),
    email: z.string().email().max(200),
    phone: z.string().max(40).optional(),
    fiscalCode: z.string().max(40).optional(),
    vatNumber: z.string().max(40).optional(),
    isBusiness: z.boolean(),
    companyName: z.string().max(200).optional(),
    sdiCode: z.string().max(20).optional(),
    consentPrivacy: z.literal(true),
    consentMarketing: z.boolean().optional(),
  }),
  items: z.array(z.object({
    itemType: z.enum(['hospitality', 'restaurant', 'experience', 'bike_rental', 'wellness']),
    entityId: z.string().uuid(),
    description: z.string().min(1).max(500),
    config: z.record(z.string(), z.unknown()),
    quantity: z.number().int().min(1).max(50),
    unitPriceCents: z.number().int().min(0).max(10_000_000),
    vatRate: z.number().min(0).max(30),
  })).min(1).max(20),
  locale: z.string().max(10).optional(),
  promoCode: z.string().max(50).optional(),
})

type BundleRequestBody = z.infer<typeof BundleSchema>

export async function POST(request: NextRequest) {
  const raw = await request.json().catch(() => null)
  const parsed = BundleSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }
  const body: BundleRequestBody = parsed.data

  const supabase = await createServiceRoleClient()

  // Resolve tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', body.tenantSlug)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Upsert guest profile
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const { data: guestId, error: guestError } = await supabase.rpc('upsert_guest_profile', {
    p_tenant_id: tenant.id,
    p_email: body.guest.email,
    p_full_name: body.guest.fullName,
    p_phone: body.guest.phone ?? null,
    p_locale: body.locale ?? 'it',
    p_consent_privacy: body.guest.consentPrivacy,
    p_consent_marketing: body.guest.consentMarketing ?? false,
    p_consent_ip: clientIp,
  })
  if (guestError || !guestId) {
    return NextResponse.json({ error: 'Guest profile error: ' + (guestError?.message ?? '') }, { status: 500 })
  }

  // Update guest fiscal info
  await supabase
    .from('guest_profiles')
    .update({
      guest_fiscal_code: body.guest.fiscalCode || null,
      guest_vat_number: body.guest.vatNumber || null,
      guest_sdi_code: body.guest.sdiCode || null,
      guest_is_business: body.guest.isBusiness,
      guest_company_name: body.guest.companyName || null,
    })
    .eq('id', guestId)

  // Resolve entity → legal_entity per item
  const entityIds = [...new Set(body.items.map((i) => i.entityId))]
  const { data: entitiesData } = await supabase
    .from('entities')
    .select('id, name, kind, legal_entity_id')
    .eq('tenant_id', tenant.id)
    .in('id', entityIds)

  const entityMap = new Map((entitiesData ?? []).map((e) => [e.id as string, e]))

  // Validate: ogni item deve avere entity con legal_entity_id assegnato
  for (const item of body.items) {
    const e = entityMap.get(item.entityId)
    if (!e) return NextResponse.json({ error: `Entity ${item.entityId} not found in tenant` }, { status: 400 })
    if (!e.legal_entity_id) {
      return NextResponse.json({
        error: `Entity "${e.name}" has no legal_entity assigned. Setup in /settings/legal-entities.`,
      }, { status: 400 })
    }
  }

  // P0 #6 anti price-tampering: sanity check totale + per item.
  // Validation server-side completa via pricing engine = follow-up (richiede mapping
  // per ogni itemType: hospitality/restaurant/experience/bike_rental/wellness).
  // Per ora: rifiuta payload con cap ovviamente sospetti.
  const MAX_ITEM_TOTAL_CENTS = 5_000_00 // €5.000 per singolo item
  const MAX_BUNDLE_TOTAL_CENTS = 50_000_00 // €50.000 per bundle
  for (const i of body.items) {
    if (i.unitPriceCents * i.quantity > MAX_ITEM_TOTAL_CENTS) {
      return NextResponse.json(
        { error: `Item "${i.description}" supera tetto sicurezza (€5000). Contatta supporto.` },
        { status: 400 },
      )
    }
  }

  // Create bundle (pending)
  const totalCents = body.items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0)
  if (totalCents > MAX_BUNDLE_TOTAL_CENTS) {
    return NextResponse.json(
      { error: 'Bundle totale supera tetto sicurezza (€50.000). Contatta supporto.' },
      { status: 400 },
    )
  }
  const { data: bundle, error: bundleError } = await supabase
    .from('reservation_bundles')
    .insert({
      tenant_id: tenant.id,
      guest_profile_id: guestId,
      status: 'pending',
      currency: 'EUR',
      total_amount_cents: totalCents,
      locale: body.locale ?? 'it',
      client_ip: clientIp,
      user_agent: request.headers.get('user-agent'),
      promo_code: body.promoCode ?? null,
      source: 'direct',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),  // 30min
    })
    .select()
    .single()

  if (bundleError || !bundle) {
    return NextResponse.json({ error: 'Bundle create error: ' + (bundleError?.message ?? '') }, { status: 500 })
  }

  // Insert bundle items
  const itemRows = body.items.map((i, idx) => {
    const e = entityMap.get(i.entityId)!
    const vatRate = i.vatRate as VatRate
    const subtotalCents = i.unitPriceCents * i.quantity
    const { taxableCents: _taxable, vatCents } = extractVat(subtotalCents, vatRate)
    return {
      bundle_id: bundle.id,
      tenant_id: tenant.id,
      legal_entity_id: e.legal_entity_id,
      entity_id: i.entityId,
      item_type: i.itemType,
      config: i.config,
      quantity: i.quantity,
      unit_price_cents: i.unitPriceCents,
      subtotal_cents: subtotalCents,
      vat_rate: vatRate,
      vat_cents: vatCents,
      discount_cents: 0,
      total_cents: subtotalCents,
      sort_order: idx,
      fulfillment_status: 'pending',
    }
  })

  const { error: itemsError } = await supabase.from('reservation_bundle_items').insert(itemRows)
  if (itemsError) {
    return NextResponse.json({ error: 'Items create error: ' + itemsError.message }, { status: 500 })
  }

  // Audit
  await supabase.from('bundle_audit_log').insert({
    bundle_id: bundle.id,
    tenant_id: tenant.id,
    actor_type: 'guest',
    actor_id: body.guest.email,
    event_type: 'bundle.created',
    event_data: { item_count: body.items.length, total_cents: totalCents },
    ip_address: clientIp,
  })

  // If total > 0 create Stripe checkout session; altrimenti confirm direct
  let checkoutUrl: string | null = null
  if (totalCents > 0) {
    try {
      const stripe = getStripe()

      // Connect Direct Charge: tutti gli items dello stesso tenant (validato sopra),
      // quindi un solo destination account. application_fee = somma fee per item type.
      // NOTE: re-pricing server-side via pricing engine cross-vertical pianificato come
      // hardening successivo. Per ora cap difensivi (€5k item / €50k bundle) sopra.
      const connectParams = await buildConnectChargeParamsSafe({
        tenantId: tenant.id,
        moduleCode: 'bundle',
        baseAmountCents: totalCents,
      })
      if (!connectParams) {
        return NextResponse.json({
          error: 'Tenant Stripe Connect non attivo. Onboarding required: /[tenant]/settings/payments',
        }, { status: 400 })
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        currency: 'eur',
        customer_email: body.guest.email,
        line_items: body.items.map((i) => {
          const e = entityMap.get(i.entityId)!
          return {
            quantity: i.quantity,
            price_data: {
              currency: 'eur',
              unit_amount: i.unitPriceCents,
              product_data: {
                name: `${e.name}: ${i.description}`,
                metadata: { entity_id: i.entityId, item_type: i.itemType },
              },
            },
          } satisfies Stripe.Checkout.SessionCreateParams.LineItem
        }),
        payment_intent_data: {
          application_fee_amount: connectParams.application_fee_amount,
          on_behalf_of: connectParams.on_behalf_of,
          transfer_data: connectParams.transfer_data,
        },
        metadata: {
          type: 'bundle',
          bundle_id: bundle.id,
          tenant_id: tenant.id,
          tenant_slug: body.tenantSlug,
          guest_profile_id: String(guestId),
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin}/book/multi/${body.tenantSlug}/success?bundle=${bundle.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin}/book/multi/${body.tenantSlug}?cancelled=1`,
      })

      await supabase
        .from('reservation_bundles')
        .update({
          status: 'payment_processing',
          stripe_payment_intent_id: (session.payment_intent as string) ?? session.id,
        })
        .eq('id', bundle.id)

      checkoutUrl = session.url
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Stripe error'
      await supabase
        .from('reservation_bundles')
        .update({ status: 'failed', last_saga_error: msg })
        .eq('id', bundle.id)
      return NextResponse.json({ error: 'Stripe checkout error: ' + msg }, { status: 500 })
    }
  } else {
    // Bundle gratuito (es. solo prenotazioni tavolo) → confirm diretto, saga fulfillment
    await supabase
      .from('reservation_bundles')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', bundle.id)

    // TODO: trigger saga fulfillment async (edge fn o queue)
  }

  return NextResponse.json({
    bundleId: bundle.id,
    checkoutUrl,
    totalCents,
  })
}

 
const _router = defaultFiscalRouter  // import side-effect to validate package link
