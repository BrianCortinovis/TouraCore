'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Card, CardHeader, CardTitle, CardContent, DataTable, Badge } from '@touracore/ui'
import { PLAN_LABELS, PLAN_PRICES } from '@touracore/billing'
import type { Subscription, ConnectAccount, CommissionEntry, Invoice, SubscriptionPlan } from '@touracore/billing'
import {
  getSubscriptionAction,
  getConnectAccountAction,
  createCheckoutAction,
  openPortalAction,
  cancelSubscriptionAction,
  startConnectOnboardingAction,
  getLedgerAction,
  getInvoicesAction,
} from './actions'

type Tab = 'subscription' | 'connect' | 'ledger' | 'invoices'

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  trialing: 'secondary',
  past_due: 'warning',
  canceled: 'destructive',
  unpaid: 'destructive',
  pending: 'secondary',
  completed: 'success',
  failed: 'destructive',
  paid: 'success',
  open: 'warning',
  draft: 'secondary',
  void: 'destructive',
}

export default function BillingPage() {
  const [tab, setTab] = useState<Tab>('subscription')
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [connectAccount, setConnectAccount] = useState<ConnectAccount | null>(null)
  const [ledger, setLedger] = useState<CommissionEntry[]>([])
  const [ledgerCount, setLedgerCount] = useState(0)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [ledgerPage, setLedgerPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const loadSubscription = useCallback(async () => {
    const sub = await getSubscriptionAction()
    setSubscription(sub)
  }, [])

  const loadConnect = useCallback(async () => {
    const acc = await getConnectAccountAction()
    setConnectAccount(acc)
  }, [])

  const loadLedger = useCallback(async () => {
    const res = await getLedgerAction(ledgerPage)
    setLedger(res.data)
    setLedgerCount(res.count)
  }, [ledgerPage])

  const loadInvoices = useCallback(async () => {
    const data = await getInvoicesAction()
    setInvoices(data)
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadSubscription(), loadConnect()]).finally(() => setLoading(false))
  }, [loadSubscription, loadConnect])

  useEffect(() => {
    if (tab === 'ledger') loadLedger()
    if (tab === 'invoices') loadInvoices()
  }, [tab, loadLedger, loadInvoices])

  async function handleCheckout(plan: SubscriptionPlan) {
    setActionLoading(true)
    const res = await createCheckoutAction(plan)
    if (res.success && res.data) {
      window.location.href = res.data as string
    }
    setActionLoading(false)
  }

  async function handlePortal() {
    setActionLoading(true)
    const res = await openPortalAction()
    if (res.success && res.data) {
      window.location.href = res.data as string
    }
    setActionLoading(false)
  }

  async function handleCancel() {
    if (!confirm('Sei sicuro di voler cancellare l\'abbonamento?')) return
    setActionLoading(true)
    await cancelSubscriptionAction()
    await loadSubscription()
    setActionLoading(false)
  }

  async function handleConnectOnboarding() {
    setActionLoading(true)
    const res = await startConnectOnboardingAction()
    if (res.success && res.data) {
      window.location.href = res.data as string
    }
    setActionLoading(false)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'subscription', label: 'Abbonamento' },
    { key: 'connect', label: 'Stripe Connect' },
    { key: 'ledger', label: 'Commissioni' },
    { key: 'invoices', label: 'Fatture' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fatturazione</h1>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-t px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'subscription' && (
        <div className="space-y-6">
          {subscription ? (
            <Card>
              <CardHeader>
                <CardTitle>Piano attuale: {PLAN_LABELS[subscription.plan]}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant={(STATUS_COLORS[subscription.status] ?? 'secondary') as 'success' | 'warning' | 'destructive' | 'secondary'}>
                      {subscription.status}
                    </Badge>
                    <span className="text-2xl font-bold">
                      €{PLAN_PRICES[subscription.plan]}/mese
                    </span>
                  </div>

                  {subscription.current_period_end && (
                    <p className="text-sm text-gray-500">
                      Prossimo rinnovo: {new Date(subscription.current_period_end).toLocaleDateString('it-IT')}
                    </p>
                  )}

                  {subscription.cancel_at_period_end && (
                    <p className="text-sm text-amber-600">
                      L&apos;abbonamento verrà cancellato alla fine del periodo corrente
                    </p>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={handlePortal} disabled={actionLoading}>
                      Gestisci abbonamento
                    </Button>
                    {!subscription.cancel_at_period_end && subscription.status !== 'canceled' && (
                      <Button variant="outline" onClick={handleCancel} disabled={actionLoading}>
                        Cancella abbonamento
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {(['starter', 'professional', 'enterprise'] as SubscriptionPlan[]).map((plan) => (
                <Card key={plan}>
                  <CardHeader>
                    <CardTitle>{PLAN_LABELS[plan]}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-3xl font-bold">€{PLAN_PRICES[plan]}<span className="text-sm font-normal text-gray-500">/mese</span></p>
                    <Button onClick={() => handleCheckout(plan)} disabled={actionLoading} className="w-full">
                      Scegli {PLAN_LABELS[plan]}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'connect' && (
        <Card>
          <CardHeader>
            <CardTitle>Stripe Connect</CardTitle>
          </CardHeader>
          <CardContent>
            {connectAccount ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Account ID</p>
                    <p className="font-mono text-sm">{connectAccount.stripe_account_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stato</p>
                    <div className="flex gap-2">
                      <Badge variant={connectAccount.charges_enabled ? 'success' : 'secondary'}>
                        {connectAccount.charges_enabled ? 'Pagamenti attivi' : 'Pagamenti non attivi'}
                      </Badge>
                      <Badge variant={connectAccount.payouts_enabled ? 'success' : 'secondary'}>
                        {connectAccount.payouts_enabled ? 'Payouts attivi' : 'Payouts non attivi'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {!connectAccount.onboarding_complete && (
                  <div>
                    <p className="mb-2 text-sm text-amber-600">Onboarding non completato</p>
                    <Button onClick={handleConnectOnboarding} disabled={actionLoading}>
                      Completa onboarding
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Collega il tuo account Stripe per ricevere pagamenti dalle prenotazioni.
                </p>
                <Button onClick={handleConnectOnboarding} disabled={actionLoading}>
                  Collega Stripe
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'ledger' && (
        <Card>
          <CardHeader>
            <CardTitle>Registro commissioni</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'created_at', header: 'Data', render: (row: CommissionEntry) => new Date(row.created_at).toLocaleDateString('it-IT') },
                { key: 'type', header: 'Tipo' },
                { key: 'amount', header: 'Importo', render: (row: CommissionEntry) => `€${row.amount.toFixed(2)}` },
                { key: 'currency', header: 'Valuta' },
                { key: 'status', header: 'Stato', render: (row: CommissionEntry) => (
                  <Badge variant={(STATUS_COLORS[row.status] ?? 'secondary') as 'success' | 'warning' | 'destructive' | 'secondary'}>
                    {row.status}
                  </Badge>
                )},
                { key: 'description', header: 'Descrizione', render: (row: CommissionEntry) => row.description ?? '—' },
              ]}
              data={ledger}
              keyExtractor={(row) => row.id}
            />

            {ledgerCount > 20 && (
              <div className="mt-4 flex justify-between">
                <Button
                  variant="outline"
                  disabled={ledgerPage <= 1}
                  onClick={() => setLedgerPage((p) => p - 1)}
                >
                  Precedente
                </Button>
                <span className="text-sm text-gray-500">
                  Pagina {ledgerPage} di {Math.ceil(ledgerCount / 20)}
                </span>
                <Button
                  variant="outline"
                  disabled={ledgerPage >= Math.ceil(ledgerCount / 20)}
                  onClick={() => setLedgerPage((p) => p + 1)}
                >
                  Successiva
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'invoices' && (
        <Card>
          <CardHeader>
            <CardTitle>Fatture</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'created_at', header: 'Data', render: (row: Invoice) => new Date(row.created_at).toLocaleDateString('it-IT') },
                { key: 'number', header: 'Numero' },
                { key: 'amount', header: 'Importo', render: (row: Invoice) => `€${row.amount.toFixed(2)}` },
                { key: 'status', header: 'Stato', render: (row: Invoice) => (
                  <Badge variant={(STATUS_COLORS[row.status] ?? 'secondary') as 'success' | 'warning' | 'destructive' | 'secondary'}>
                    {row.status}
                  </Badge>
                )},
                { key: 'pdf_url', header: '', render: (row: Invoice) => row.pdf_url ? (
                  <a href={row.pdf_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Scarica PDF
                  </a>
                ) : null },
              ]}
              data={invoices}
              keyExtractor={(row) => row.id}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
