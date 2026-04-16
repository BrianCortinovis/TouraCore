import { createServiceRoleClient } from '@touracore/db/server'
import { Banknote, CreditCard, ReceiptText, WalletCards } from 'lucide-react'
import { PLAN_LABELS, PLAN_PRICES, type SubscriptionPlan } from '@touracore/billing'
import { MetricCard, SectionCard, StatusBadge, TrendList } from '../_components'
import { buildMonthBuckets, fillBucketsFromRows, formatCurrency, formatDate, formatNumber, sumBy } from '../_lib'

interface SubscriptionRow {
  plan: SubscriptionPlan
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
}

interface LedgerRow {
  type: 'booking_commission' | 'subscription_charge' | 'payout' | 'refund' | 'adjustment'
  amount: string | number
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  created_at: string
}

interface InvoiceRow {
  number: string
  amount: string | number
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  created_at: string
}

export default async function SuperadminBillingPage() {
  const supabase = await createServiceRoleClient()
  const monthBuckets = buildMonthBuckets(6)
  const since = new Date(`${monthBuckets[0]!.key}-01T00:00:00.000Z`).toISOString()

  const [
    { data: subscriptions },
    { data: connectAccounts },
    { data: ledgerRows },
    { data: invoices },
  ] = await Promise.all([
    supabase.from('subscriptions').select('plan, status'),
    supabase
      .from('connect_accounts')
      .select('tenant_id, charges_enabled, payouts_enabled, onboarding_complete'),
    supabase
      .from('commission_ledger')
      .select('type, amount, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true }),
    supabase
      .from('invoices')
      .select('number, amount, status, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const subscriptionRows = (subscriptions ?? []) as SubscriptionRow[]
  const connectRows = (connectAccounts ?? []) as {
    charges_enabled: boolean | null
    payouts_enabled: boolean | null
    onboarding_complete: boolean | null
  }[]
  const ledgerEntries = (ledgerRows ?? []) as LedgerRow[]
  const invoiceRows = (invoices ?? []) as InvoiceRow[]

  const planMap = new Map<SubscriptionPlan, number>()
  for (const plan of subscriptionRows.map((row) => row.plan)) {
    planMap.set(plan, (planMap.get(plan) ?? 0) + 1)
  }
  const planSeries = Array.from(planMap.entries()).map(([key, value]) => ({
    key,
    label: PLAN_LABELS[key],
    value,
  }))

  const statusMap = new Map<string, number>()
  for (const row of subscriptionRows) {
    statusMap.set(row.status, (statusMap.get(row.status) ?? 0) + 1)
  }
  const statusSeries = Array.from(statusMap.entries()).map(([key, value]) => ({
    key,
    label: key.replace('_', ' '),
    value,
  }))

  const ledgerTypeMap = new Map<string, number>()
  for (const row of ledgerEntries) {
    ledgerTypeMap.set(row.type, (ledgerTypeMap.get(row.type) ?? 0) + 1)
  }
  const ledgerTypeSeries = Array.from(ledgerTypeMap.entries()).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' '),
    value,
  }))

  const billingTrend = fillBucketsFromRows(monthBuckets, ledgerEntries, (row) => row.created_at)
  const invoiceTrend = fillBucketsFromRows(monthBuckets, invoiceRows, (row) => row.created_at)

  const activeSubscriptions = subscriptionRows.filter((row) => row.status === 'active' || row.status === 'trialing').length
  const pastDueSubscriptions = subscriptionRows.filter((row) => row.status === 'past_due').length
  const readyConnectAccounts = connectRows.filter((row) => row.charges_enabled && row.payouts_enabled && row.onboarding_complete).length
  const subscriptionMRR = subscriptionRows
    .filter((row) => row.status === 'active')
    .reduce((sum, row) => sum + (PLAN_PRICES[row.plan] ?? 0), 0)

  const ledgerTotal = sumBy(ledgerEntries, (row) => Number(row.amount))
  const invoiceTotal = sumBy(invoiceRows, (row) => Number(row.amount))

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
            <Banknote className="h-3.5 w-3.5" />
            Billing
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Billing, subscription e revenue ops
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-slate-500">
            Qui vedi l’economia della suite: subscription, Stripe Connect, commission ledger e
            fatturazione. Nessun CMS serio regge senza un controllo chiaro del flusso economico.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active subscriptions" value={formatNumber(activeSubscriptions)} hint={`${formatNumber(subscriptionRows.length)} totali`} icon={CreditCard} tone="emerald" />
        <MetricCard label="Past due" value={formatNumber(pastDueSubscriptions)} hint="Da tenere in review" icon={WalletCards} tone="amber" />
        <MetricCard label="Connect ready" value={formatNumber(readyConnectAccounts)} hint="Charges + payouts" icon={Banknote} tone="blue" />
        <MetricCard label="MRR est. (active)" value={formatCurrency(subscriptionMRR)} hint="Stima dai piani attivi" icon={ReceiptText} tone="violet" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Plan mix" description="Distribuzione degli abbonamenti per piano.">
          <TrendList items={planSeries} valueLabel="subscription" barTone="bg-emerald-500" />
          <div className="mt-4 flex flex-wrap gap-2">
            {statusSeries.map((item) => (
              <StatusBadge key={item.key} tone={item.key === 'active' ? 'emerald' : item.key === 'past_due' ? 'amber' : 'slate'}>
                {item.label}: {item.value}
              </StatusBadge>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Ledger & invoices" description="Consumi economici recenti e fatturazione.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Commission ledger</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(ledgerTotal)}</p>
              <p className="text-sm text-slate-500">{formatNumber(ledgerEntries.length)} entries</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invoices</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{formatCurrency(invoiceTotal)}</p>
              <p className="text-sm text-slate-500">{formatNumber(invoiceRows.length)} invoices</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {ledgerTypeSeries.length > 0 ? (
              <TrendList items={ledgerTypeSeries} valueLabel="ledger items" barTone="bg-violet-500" />
            ) : (
              <p className="text-sm text-slate-500">Nessun ledger entry nel periodo.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <SectionCard title="Billing trend" description="Andamento delle entrate registrate nel ledger.">
          <TrendList items={billingTrend} valueLabel="entry" barTone="bg-slate-900" />
        </SectionCard>

        <SectionCard title="Invoice trend" description="Emissioni fattura nel periodo selezionato.">
          <TrendList items={invoiceTrend} valueLabel="invoice" barTone="bg-blue-600" />
        </SectionCard>
      </div>

      <SectionCard title="Connect readiness" description="Stato delle strutture con Stripe Connect.">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            <div>Charge</div>
            <div>Payout</div>
            <div>Onboarding</div>
            <div>State</div>
          </div>
          <div className="divide-y divide-slate-200">
            {connectRows.length === 0 ? (
              <div className="px-4 py-4 text-sm text-slate-500">Nessun connect account.</div>
            ) : (
              connectRows.map((row, index) => (
                <div key={index} className="grid grid-cols-4 px-4 py-3 text-sm">
                  <div>{row.charges_enabled ? 'Yes' : 'No'}</div>
                  <div>{row.payouts_enabled ? 'Yes' : 'No'}</div>
                  <div>{row.onboarding_complete ? 'Complete' : 'Pending'}</div>
                  <div>
                    <StatusBadge tone={row.charges_enabled && row.payouts_enabled ? 'emerald' : 'amber'}>
                      {row.charges_enabled && row.payouts_enabled ? 'Ready' : 'Review'}
                    </StatusBadge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent invoices" description="Ultime fatture registrate nel periodo.">
        {invoiceRows.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna fattura nel periodo.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {invoiceRows.slice(0, 8).map((invoice) => (
              <div key={invoice.number} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{invoice.number}</p>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(invoice.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(Number(invoice.amount))}</p>
                  <p className="text-xs text-slate-500">{invoice.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
