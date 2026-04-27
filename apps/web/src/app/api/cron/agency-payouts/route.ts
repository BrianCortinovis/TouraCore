import { NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { createServiceRoleClient } from '@touracore/db/server'
import { getStripe } from '@touracore/billing'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  return handler(req)
}

export async function POST(req: Request) {
  return handler(req)
}

interface PlatformBillingRow {
  billing_model: 'subscription' | 'commission' | 'hybrid' | 'free'
  fee_monthly_eur: number | null
  commission_pct: number | null
  commission_base: 'client_revenue' | 'agency_fee'
  commission_cap_monthly_eur: number | null
  commission_min_monthly_eur: number | null
  commission_threshold_eur: number | null
}

function previousMonthStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  return d
}

function periodMonthDate(d: Date): string {
  return d.toISOString().slice(0, 10) // YYYY-MM-01
}

function nextMonthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
}

function computePlatformFee(
  grossEur: number,
  pb: PlatformBillingRow | null,
  agencyFeeEur: number,
): number {
  if (!pb) return 0
  if (pb.billing_model === 'free') return 0

  let fee = 0
  if (pb.billing_model === 'subscription' || pb.billing_model === 'hybrid') {
    fee += Number(pb.fee_monthly_eur ?? 0)
  }
  if (pb.billing_model === 'commission' || pb.billing_model === 'hybrid') {
    const pct = Number(pb.commission_pct ?? 0) / 100
    const base = pb.commission_base === 'agency_fee' ? agencyFeeEur : grossEur
    const threshold = Number(pb.commission_threshold_eur ?? 0)
    if (base > threshold) {
      let commission = base * pct
      if (pb.commission_cap_monthly_eur != null) {
        commission = Math.min(commission, Number(pb.commission_cap_monthly_eur))
      }
      if (pb.commission_min_monthly_eur != null) {
        commission = Math.max(commission, Number(pb.commission_min_monthly_eur))
      }
      fee += commission
    }
  }
  return Math.round(fee * 100) / 100
}

async function handler(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'cron_not_configured' }, { status: 503 })
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceRoleClient()

  // Periodo target = mese precedente (rispetto a oggi UTC)
  const now = new Date()
  const periodStart = previousMonthStart(now)
  const periodEnd = nextMonthStart(periodStart)
  const periodMonth = periodMonthDate(periodStart)

  // 1. Trova tutte le agenzie attive con almeno una commissione accrued nel periodo
  const { data: accruedRows, error: accErr } = await supabase
    .from('agency_commissions')
    .select('agency_id, gross_amount, commission_amount, currency, id')
    .eq('status', 'accrued')
    .gte('accrued_at', periodStart.toISOString())
    .lt('accrued_at', periodEnd.toISOString())

  if (accErr) {
    return NextResponse.json({ error: 'fetch_failed', detail: accErr.message }, { status: 500 })
  }

  const rows = (accruedRows ?? []) as Array<{
    id: string
    agency_id: string
    gross_amount: number | null
    commission_amount: number | null
    currency: string | null
  }>

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, period: periodMonth, payouts: 0, message: 'no_accrued_commissions' })
  }

  // Aggrega per agency_id
  const byAgency = new Map<string, {
    gross: number
    commissions: number
    count: number
    currency: string
    commissionIds: string[]
  }>()

  for (const r of rows) {
    const acc = byAgency.get(r.agency_id) ?? {
      gross: 0,
      commissions: 0,
      count: 0,
      currency: r.currency ?? 'EUR',
      commissionIds: [],
    }
    acc.gross += Number(r.gross_amount ?? 0)
    acc.commissions += Number(r.commission_amount ?? 0)
    acc.count += 1
    acc.commissionIds.push(r.id)
    byAgency.set(r.agency_id, acc)
  }

  const stripe = (() => {
    try { return getStripe() } catch { return null }
  })()

  const results: Array<{ agency_id: string; status: string; payout_id?: string; error?: string }> = []

  for (const [agencyId, agg] of byAgency) {
    // 2. Salta se payout già esistente per questo periodo
    const { data: existing } = await supabase
      .from('agency_payouts')
      .select('id, status')
      .eq('agency_id', agencyId)
      .eq('period_month', periodMonth)
      .maybeSingle()

    if (existing && (existing as { status: string }).status === 'paid') {
      results.push({ agency_id: agencyId, status: 'already_paid', payout_id: (existing as { id: string }).id })
      continue
    }

    // 3. Recupera Stripe Connect + accordo platform billing
    const { data: agency } = await supabase
      .from('agencies')
      .select('stripe_connect_account_id, name')
      .eq('id', agencyId)
      .maybeSingle()
    const connectId = (agency as { stripe_connect_account_id: string | null } | null)?.stripe_connect_account_id ?? null

    const { data: pb } = await supabase
      .from('agency_platform_billing')
      .select('billing_model, fee_monthly_eur, commission_pct, commission_base, commission_cap_monthly_eur, commission_min_monthly_eur, commission_threshold_eur')
      .eq('agency_id', agencyId)
      .maybeSingle()

    const platformFee = computePlatformFee(
      agg.gross,
      (pb as PlatformBillingRow | null) ?? null,
      agg.commissions,
    )
    const netAmount = Math.max(0, Math.round((agg.commissions - platformFee) * 100) / 100)

    // 4. Upsert payout in stato pending
    const payoutBody = {
      agency_id: agencyId,
      period_month: periodMonth,
      gross_amount: agg.gross,
      platform_fee_amount: platformFee,
      net_amount: netAmount,
      currency: agg.currency,
      commissions_count: agg.count,
      stripe_destination: connectId,
      status: 'pending' as const,
      metadata: { run_at: now.toISOString() },
    }

    const { data: payout, error: upErr } = await supabase
      .from('agency_payouts')
      .upsert(payoutBody, { onConflict: 'agency_id,period_month' })
      .select('id')
      .single()

    if (upErr || !payout) {
      results.push({ agency_id: agencyId, status: 'upsert_failed', error: upErr?.message ?? 'unknown' })
      continue
    }

    const payoutId = (payout as { id: string }).id

    // 5. Esegue Stripe Transfer se possibile
    if (!stripe || !connectId || netAmount <= 0) {
      const reason = !stripe ? 'no_stripe' : !connectId ? 'no_connect_account' : 'zero_amount'
      await supabase
        .from('agency_payouts')
        .update({
          status: netAmount <= 0 ? 'paid' : 'failed',
          error_message: netAmount <= 0 ? null : reason,
          processed_at: now.toISOString(),
          paid_at: netAmount <= 0 ? now.toISOString() : null,
        })
        .eq('id', payoutId)

      if (netAmount <= 0) {
        await supabase
          .from('agency_commissions')
          .update({ status: 'paid', paid_at: now.toISOString(), payout_id: payoutId })
          .in('id', agg.commissionIds)
      }
      results.push({ agency_id: agencyId, status: netAmount <= 0 ? 'paid_zero' : 'skipped', payout_id: payoutId, error: reason })
      continue
    }

    await supabase
      .from('agency_payouts')
      .update({ status: 'processing', processed_at: now.toISOString() })
      .eq('id', payoutId)

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(netAmount * 100),
          currency: agg.currency.toLowerCase(),
          destination: connectId,
          description: `TouraCore payout ${periodMonth}`,
          metadata: { agency_id: agencyId, period_month: periodMonth, payout_id: payoutId },
        },
        { idempotencyKey: `payout_${agencyId}_${periodMonth}` },
      )

      await supabase
        .from('agency_payouts')
        .update({
          status: 'paid',
          stripe_transfer_id: transfer.id,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payoutId)

      await supabase
        .from('agency_commissions')
        .update({ status: 'paid', paid_at: new Date().toISOString(), payout_id: payoutId })
        .in('id', agg.commissionIds)

      results.push({ agency_id: agencyId, status: 'paid', payout_id: payoutId })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await supabase
        .from('agency_payouts')
        .update({ status: 'failed', error_message: message })
        .eq('id', payoutId)
      results.push({ agency_id: agencyId, status: 'failed', payout_id: payoutId, error: message })
    }
  }

  return NextResponse.json({
    ok: true,
    period: periodMonth,
    payouts: results.length,
    results,
  })
}
