import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, TrendingUp, Receipt, Gift, Clock } from 'lucide-react'

interface BillingSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'In prova',
  active: 'Attivo',
  paused: 'In pausa',
  past_due: 'Pagamento scaduto',
  canceled: 'Cancellato',
}

export default async function BillingSettingsPage({ params }: BillingSettingsProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()
  const admin = await createServiceRoleClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, modules')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: catalog } = await admin
    .from('module_catalog')
    .select('code,label,base_price_eur')
    .eq('active', true)

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  const { data: overrides } = await admin
    .from('module_overrides')
    .select('module_code,override_type,valid_until,reason')
    .eq('tenant_id', tenant.id)
    .eq('active', true)

  const { data: ledgerEntries } = await admin
    .from('commission_ledger')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const modules = (tenant.modules ?? {}) as Record<
    string,
    { active: boolean; source: string; trial_until?: string }
  >

  const activeCodes = Object.keys(modules).filter((k) => modules[k]?.active)

  // Calcolo costo mensile totale effettivo
  let monthlyTotal = 0
  const lineItems: Array<{
    code: string
    label: string
    price: number
    isFree: boolean
    trialUntil?: string
    source: string
  }> = []

  for (const code of activeCodes) {
    const entry = catalog?.find((c) => c.code === code)
    if (!entry) continue
    const override = overrides?.find((o) => o.module_code === code)
    const isFree = override?.override_type === 'free'
    const price = isFree ? 0 : Number(entry.base_price_eur)
    monthlyTotal += price
    lineItems.push({
      code,
      label: entry.label,
      price,
      isFree,
      trialUntil: modules[code]?.trial_until,
      source: modules[code]?.source ?? 'subscription',
    })
  }

  const totalPending = (ledgerEntries ?? [])
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalCompleted = (ledgerEntries ?? [])
    .filter((e) => e.status === 'completed')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const status = subscription?.status ?? 'trialing'

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fatturazione</h1>
        <p className="mt-1 text-sm text-gray-500">
          Piano, metodo di pagamento, commissioni e storico addebiti
        </p>
      </div>

      {/* Sommario piano */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-2.5">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Piano attuale</h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  status === 'active' || status === 'trialing'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              €{monthlyTotal.toFixed(2)}/mese
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {activeCodes.length} modul{activeCodes.length === 1 ? 'o attivo' : 'i attivi'}
            </p>
            {subscription?.current_period_end && (
              <p className="mt-2 text-xs text-gray-400">
                Prossimo rinnovo:{' '}
                {new Date(subscription.current_period_end).toLocaleDateString('it-IT')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Moduli e costi */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Moduli attivi</h3>
        </div>
        {lineItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nessun modulo attivo</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lineItems.map((it) => (
              <div key={it.code} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{it.label}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {it.isFree && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <Gift className="h-3 w-3" />
                        Gratis (override)
                      </span>
                    )}
                    {it.source === 'trial' && it.trialUntil && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                        <Clock className="h-3 w-3" />
                        Trial fino a{' '}
                        {new Date(it.trialUntil).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  €{it.price.toFixed(2)}/mese
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-gray-100 px-5 py-3">
          <Link
            href={`/${tenantSlug}/settings/modules`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Gestisci moduli →
          </Link>
        </div>
      </div>

      {/* Riepilogo commissioni */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            <span className="text-sm text-gray-500">Commissioni in sospeso</span>
          </div>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {totalPending.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-500">Commissioni saldate</span>
          </div>
          <p className="mt-2 text-xl font-bold text-gray-900">
            {totalCompleted.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>

      {/* Storico commissioni */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">Storico commissioni</h3>
        </div>
        {(ledgerEntries ?? []).length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">
            Nessuna commissione registrata
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(ledgerEntries ?? []).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-900">{entry.description ?? entry.type}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {Number(entry.amount).toLocaleString('it-IT', {
                      style: 'currency',
                      currency: entry.currency,
                    })}
                  </p>
                  <span
                    className={`text-xs ${
                      entry.status === 'completed'
                        ? 'text-green-600'
                        : entry.status === 'pending'
                          ? 'text-orange-600'
                          : 'text-red-600'
                    }`}
                  >
                    {entry.status === 'completed'
                      ? 'Saldato'
                      : entry.status === 'pending'
                        ? 'In sospeso'
                        : entry.status === 'failed'
                          ? 'Fallito'
                          : entry.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
