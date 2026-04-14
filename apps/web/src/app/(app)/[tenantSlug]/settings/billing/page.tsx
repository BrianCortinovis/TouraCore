import { createServerSupabaseClient } from '@touracore/db/server'
import { notFound } from 'next/navigation'
import { CreditCard, TrendingUp, Receipt } from 'lucide-react'

interface BillingSettingsProps {
  params: Promise<{ tenantSlug: string }>
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Prova gratuita',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

const PLAN_PRICES: Record<string, string> = {
  trial: 'Gratuito',
  starter: '29 EUR/mese',
  professional: '79 EUR/mese',
  enterprise: '199 EUR/mese',
}

const PLAN_COMMISSION: Record<string, string> = {
  trial: '0%',
  starter: '3%',
  professional: '2%',
  enterprise: '1,5%',
}

const STATUS_LABELS: Record<string, string> = {
  trialing: 'In prova',
  active: 'Attivo',
  past_due: 'Pagamento scaduto',
  canceled: 'Cancellato',
  unpaid: 'Non pagato',
}

export default async function BillingSettingsPage({ params }: BillingSettingsProps) {
  const { tenantSlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('slug', tenantSlug)
    .single()

  if (!tenant) notFound()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenant.id)
    .single()

  const plan = subscription?.plan ?? 'trial'
  const status = subscription?.status ?? 'trialing'

  const { data: ledgerEntries } = await supabase
    .from('commission_ledger')
    .select('*')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const totalPending = (ledgerEntries ?? [])
    .filter((e) => e.status === 'pending')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const totalCompleted = (ledgerEntries ?? [])
    .filter((e) => e.status === 'completed')
    .reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Fatturazione</h1>
        <p className="mt-1 text-sm text-gray-500">
          Piano attuale, commissioni e storico addebiti
        </p>
      </div>

      {/* Piano attuale */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-2.5">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Piano attuale</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                status === 'active' || status === 'trialing'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {STATUS_LABELS[status] ?? status}
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{PLAN_LABELS[plan] ?? plan}</p>
            <div className="mt-2 flex gap-6 text-sm text-gray-500">
              <span>{PLAN_PRICES[plan] ?? '—'}</span>
              <span>Commissione: {PLAN_COMMISSION[plan] ?? '—'} su ogni prenotazione</span>
            </div>
            {subscription?.current_period_end && (
              <p className="mt-2 text-xs text-gray-400">
                Prossimo rinnovo: {new Date(subscription.current_period_end).toLocaleDateString('it-IT')}
              </p>
            )}
          </div>
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
                    {Number(entry.amount).toLocaleString('it-IT', { style: 'currency', currency: entry.currency })}
                  </p>
                  <span className={`text-xs ${
                    entry.status === 'completed' ? 'text-green-600' :
                    entry.status === 'pending' ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {entry.status === 'completed' ? 'Saldato' :
                     entry.status === 'pending' ? 'In sospeso' :
                     entry.status === 'failed' ? 'Fallito' : entry.status}
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
