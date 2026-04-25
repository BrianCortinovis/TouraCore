import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe, buildConnectChargeParamsSafe } from '@touracore/billing/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) { return handler(req) }
export async function POST(req: Request) { return handler(req) }

type Vertical = 'hospitality' | 'restaurant' | 'bike' | 'experience'

interface PendingCharge {
  vertical: Vertical
  reservation_id: string
  tenant_id: string
  amount_cents: number
  currency: string
  module_code: 'hospitality' | 'restaurant' | 'bike_rental' | 'experiences'
  applies_to: 'booking_total' | 'rental' | 'coperto'
}

const VERTICAL_CONFIG: Record<Vertical, {
  table: string
  amountCol: string
  amountIsCents: boolean
  currencyCol: string
  tenantCol: string
  resolveTenant?: 'direct' | 'via_restaurant'
  moduleCode: PendingCharge['module_code']
  appliesTo: PendingCharge['applies_to']
}> = {
  hospitality: {
    table: 'reservations', amountCol: 'total_amount', amountIsCents: false,
    currencyCol: 'currency', tenantCol: 'entity_id', resolveTenant: 'direct',
    moduleCode: 'hospitality', appliesTo: 'booking_total',
  },
  restaurant: {
    table: 'restaurant_reservations', amountCol: 'deposit_amount', amountIsCents: false,
    currencyCol: 'currency', tenantCol: 'restaurant_id', resolveTenant: 'via_restaurant',
    moduleCode: 'restaurant', appliesTo: 'coperto',
  },
  bike: {
    table: 'bike_rental_reservations', amountCol: 'total_amount', amountIsCents: false,
    currencyCol: 'currency', tenantCol: 'tenant_id', resolveTenant: 'direct',
    moduleCode: 'bike_rental', appliesTo: 'rental',
  },
  experience: {
    table: 'experience_reservations', amountCol: 'total_cents', amountIsCents: true,
    currencyCol: 'currency', tenantCol: 'tenant_id', resolveTenant: 'direct',
    moduleCode: 'experiences', appliesTo: 'booking_total',
  },
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const stripe = (() => { try { return getStripe() } catch { return null } })()
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 })

  const now = new Date().toISOString()
  const results: Array<{ vertical: Vertical; reservation_id: string; status: string; error?: string }> = []

  for (const [vertical, cfg] of Object.entries(VERTICAL_CONFIG) as Array<[Vertical, typeof VERTICAL_CONFIG[Vertical]]>) {
    const { data, error } = await supabase
      .from(cfg.table)
      .select(`id, ${cfg.amountCol}, ${cfg.currencyCol}, ${cfg.tenantCol}, application_fee_amount_cents, charge_scheduled_at, payment_state`)
      .in('payment_state', ['card_saved', 'failed'])
      .lte('charge_scheduled_at', now)
      .limit(50)

    if (error) {
      results.push({ vertical, reservation_id: '*', status: 'fetch_failed', error: error.message })
      continue
    }

    for (const row of (data ?? []) as unknown as Array<Record<string, unknown>>) {
      const reservationId = row.id as string

      // Risolvi tenant_id
      let tenantId: string | null = null
      if (cfg.resolveTenant === 'direct' && cfg.tenantCol === 'tenant_id') {
        tenantId = row[cfg.tenantCol] as string
      } else if (cfg.resolveTenant === 'direct' && cfg.tenantCol === 'entity_id') {
        const { data: e } = await supabase
          .from('entities').select('tenant_id').eq('id', row[cfg.tenantCol] as string).maybeSingle()
        tenantId = (e as { tenant_id?: string } | null)?.tenant_id ?? null
      } else if (cfg.resolveTenant === 'via_restaurant') {
        const { data: r } = await supabase
          .from('restaurants').select('tenant_id').eq('id', row[cfg.tenantCol] as string).maybeSingle()
        tenantId = (r as { tenant_id?: string } | null)?.tenant_id ?? null
      }
      if (!tenantId) {
        results.push({ vertical, reservation_id: reservationId, status: 'no_tenant' })
        continue
      }

      // Recupera carta salvata (primary)
      const { data: pm } = await supabase
        .from('reservation_payment_methods')
        .select('stripe_customer_id, stripe_payment_method_id')
        .eq('vertical', vertical).eq('reservation_id', reservationId).eq('is_primary', true)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (!pm) {
        results.push({ vertical, reservation_id: reservationId, status: 'no_payment_method' })
        continue
      }
      const paymentMethod = pm as { stripe_customer_id: string; stripe_payment_method_id: string }

      // Calcola amount
      const amountRaw = Number(row[cfg.amountCol] ?? 0)
      const amountCents = cfg.amountIsCents ? Math.round(amountRaw) : Math.round(amountRaw * 100)
      if (amountCents <= 0) {
        results.push({ vertical, reservation_id: reservationId, status: 'zero_amount' })
        continue
      }

      // Connect params
      const connectParams = await buildConnectChargeParamsSafe({
        tenantId, moduleCode: cfg.moduleCode, baseAmountCents: amountCents, appliesTo: cfg.appliesTo,
      })
      if (!connectParams) {
        results.push({ vertical, reservation_id: reservationId, status: 'tenant_no_connect' })
        continue
      }

      const currency = String(row[cfg.currencyCol] ?? 'EUR').toLowerCase()
      const attemptNumber = await nextAttemptNumber(supabase, vertical, reservationId)

      try {
        const pi = await stripe.paymentIntents.create(
          {
            amount: amountCents,
            currency,
            customer: paymentMethod.stripe_customer_id,
            payment_method: paymentMethod.stripe_payment_method_id,
            off_session: true,
            confirm: true,
            capture_method: 'manual',
            on_behalf_of: connectParams.on_behalf_of,
            transfer_data: connectParams.transfer_data,
            application_fee_amount: connectParams.application_fee_amount,
            metadata: {
              vertical,
              reservation_id: reservationId,
              tenant_id: tenantId,
              auto_charge: 'true',
              attempt: String(attemptNumber),
            },
          },
          { idempotencyKey: `autocharge_${vertical}_${reservationId}_${attemptNumber}` },
        )

        await supabase.from('reservation_payment_attempts').insert({
          vertical, reservation_id: reservationId, tenant_id: tenantId,
          attempt_number: attemptNumber,
          stripe_payment_intent_id: pi.id,
          amount_cents: amountCents, currency: currency.toUpperCase(),
          status: pi.status === 'requires_capture' ? 'succeeded' : (pi.status === 'requires_action' ? 'requires_action' : 'processing'),
          completed_at: new Date().toISOString(),
        })

        await supabase.from(cfg.table).update({
          payment_state: pi.status === 'requires_capture' ? 'authorized' : 'card_saved',
          charge_scheduled_at: null,
        }).eq('id', reservationId)

        results.push({ vertical, reservation_id: reservationId, status: pi.status })
      } catch (err) {
        const e = err as { code?: string; message?: string; payment_intent?: { id?: string } }
        await supabase.from('reservation_payment_attempts').insert({
          vertical, reservation_id: reservationId, tenant_id: tenantId,
          attempt_number: attemptNumber,
          stripe_payment_intent_id: e.payment_intent?.id ?? null,
          amount_cents: amountCents, currency: currency.toUpperCase(),
          status: 'failed',
          failure_code: e.code ?? null,
          failure_message: e.message ?? null,
          completed_at: new Date().toISOString(),
          retry_at: attemptNumber < 4 ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null,
        })

        await supabase.from(cfg.table).update({
          payment_state: 'failed',
          charge_scheduled_at: attemptNumber < 4 ? new Date(Date.now() + 24 * 3600 * 1000).toISOString() : null,
        }).eq('id', reservationId)

        results.push({ vertical, reservation_id: reservationId, status: 'failed', error: e.code ?? e.message })
      }
    }
  }

  return NextResponse.json({ ok: true, run_at: now, processed: results.length, results })
}

async function nextAttemptNumber(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  vertical: Vertical,
  reservationId: string,
): Promise<number> {
  const { data } = await supabase
    .from('reservation_payment_attempts')
    .select('attempt_number')
    .eq('vertical', vertical).eq('reservation_id', reservationId)
    .order('attempt_number', { ascending: false }).limit(1).maybeSingle()
  return ((data as { attempt_number?: number } | null)?.attempt_number ?? 0) + 1
}
