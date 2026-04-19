import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@touracore/db/server'
import { getVisibilityContext, hasPermission } from '@touracore/auth/visibility'

interface BillingPageProps {
  params: Promise<{ agencySlug: string }>
}

export const dynamic = 'force-dynamic'

const PLAN_PRICE: Record<string, number> = {
  agency_starter: 99,
  agency_pro: 299,
  agency_enterprise: 999,
}

function planLabel(p: string | null | undefined): string {
  if (p === 'agency_starter') return 'Starter'
  if (p === 'agency_pro') return 'Pro'
  if (p === 'agency_enterprise') return 'Enterprise'
  if (p === 'custom') return 'Personalizzato'
  return p ?? '—'
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { agencySlug } = await params
  const ctx = await getVisibilityContext()
  const supabase = await createServiceRoleClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, plan, max_tenants, billing_email, legal_name, stripe_customer_id, stripe_subscription_id, stripe_connect_account_id')
    .eq('slug', agencySlug)
    .maybeSingle()
  if (!agency) notFound()

  const canWrite = hasPermission(ctx, 'billing.write')
  const planPrice = PLAN_PRICE[agency.plan] ?? 0

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold">Fatturazione · {agency.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Piano agenzia, fatture ricevute e collegamento Stripe per ricevere i pagamenti.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Piano attuale</p>
          <p className="mt-1 text-lg font-semibold">{planLabel(agency.plan)}</p>
          <p className="text-sm text-slate-600">€{planPrice}/mese · fino a {agency.max_tenants ?? '∞'} clienti</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Email fatturazione</p>
          <p className="mt-1 text-sm">{agency.billing_email ?? '—'}</p>
          <p className="text-xs text-slate-500">{agency.legal_name ?? ''}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase text-slate-400">Collegamento Stripe</p>
          <p className="mt-1 text-sm">
            {agency.stripe_connect_account_id
              ? <span className="text-emerald-700">Collegato</span>
              : <span className="text-amber-700">Da configurare</span>}
          </p>
          {canWrite && !agency.stripe_connect_account_id && (
            <Link href={`/a/${agencySlug}/billing/stripe`} className="mt-2 inline-block text-xs text-indigo-600 hover:underline">
              Collega Stripe →
            </Link>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Cambia piano</h2>
        {!canWrite ? (
          <p className="mt-2 text-sm text-slate-500">Solo il titolare o gli amministratori possono modificare il piano.</p>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
            {(['agency_starter', 'agency_pro', 'agency_enterprise'] as const).map((p) => (
              <div
                key={p}
                className={`rounded-xl border p-4 ${
                  p === agency.plan ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200'
                }`}
              >
                <p className="font-semibold">{planLabel(p)}</p>
                <p className="mt-1 text-sm text-slate-600">€{PLAN_PRICE[p]}/mese</p>
                {p === agency.plan ? (
                  <p className="mt-2 text-xs text-indigo-700">Piano attivo</p>
                ) : (
                  <form action={`/a/${agencySlug}/billing/change-plan`} method="POST">
                    <input type="hidden" name="plan" value={p} />
                    <button
                      type="submit"
                      className="mt-2 rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Passa a {planLabel(p)}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Fatture ricevute</h2>
        <p className="mt-2 text-sm text-slate-500">
          {agency.stripe_subscription_id
            ? 'Abbonamento attivo. Le fatture arrivano via email mensilmente.'
            : 'Abbonamento non ancora attivo. Collega Stripe per iniziare a ricevere le fatture.'}
        </p>
      </section>
    </div>
  )
}
