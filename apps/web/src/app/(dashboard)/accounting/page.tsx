'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button, Card, CardContent } from '@touracore/ui'
import { useAuthStore } from '@touracore/auth/store'
import { listAccountingConnectionsAction, createAccountingConnectionAction } from '../competitive-actions'

interface Connection {
  id: string
  provider: string
  entity_id: string | null
  is_active: boolean
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
}

const PROVIDERS = [
  { value: 'fattureincloud', label: 'Fatture in Cloud' },
  { value: 'aruba_fattura', label: 'Aruba Fattura Elettronica' },
  { value: 'teamsystem', label: 'TeamSystem' },
  { value: 'xero', label: 'Xero' },
  { value: 'quickbooks', label: 'QuickBooks' },
]

export default function AccountingPage() {
  const tenantId = useAuthStore((s) => s.tenant?.id)
  const propertyId = useAuthStore((s) => s.property?.id)
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [provider, setProvider] = useState<string>(PROVIDERS[0]!.value)
  const [apiKey, setApiKey] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [perEntity, setPerEntity] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const data = (await listAccountingConnectionsAction(tenantId)) as Connection[]
    setConnections(data)
    setLoading(false)
  }, [tenantId])

  useEffect(() => { void load() }, [load])

  const handleSave = async () => {
    if (!tenantId || !apiKey) return
    const result = await createAccountingConnectionAction({
      tenantId,
      entityId: perEntity && propertyId ? propertyId : undefined,
      provider,
      credentials: { apiKey, companyId },
    })
    if (result.success) {
      setShowForm(false)
      setApiKey('')
      setCompanyId('')
      void load()
    } else {
      alert(`Errore: ${result.error}`)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connessioni Contabili</h1>
          <p className="text-sm text-gray-500">Sincronizzazione fatture/scontrini con software esterni</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Annulla' : 'Nuova connessione'}
        </Button>
      </header>

      {showForm && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <label className="block text-xs font-medium text-gray-600">Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Company ID (opzionale)</label>
              <input
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={perEntity} onChange={(e) => setPerEntity(e.target.checked)} />
              Solo per struttura corrente (altrimenti tenant-wide)
            </label>
            <Button onClick={handleSave}>Salva</Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Caricamento...</p>
      ) : connections.length === 0 ? (
        <p className="text-sm text-gray-500">Nessuna connessione configurata</p>
      ) : (
        <div className="space-y-2">
          {connections.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{PROVIDERS.find((p) => p.value === c.provider)?.label ?? c.provider}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'attiva' : 'disattiva'}
                    </span>
                    {c.entity_id ? (
                      <span className="text-xs text-gray-500">scope: entity</span>
                    ) : (
                      <span className="text-xs text-gray-500">scope: tenant</span>
                    )}
                  </div>
                  {c.last_sync_at && (
                    <p className="text-xs text-gray-500">
                      Ultimo sync: {new Date(c.last_sync_at).toLocaleString('it-IT')} · {c.last_sync_status ?? '—'}
                    </p>
                  )}
                  {c.last_sync_error && (
                    <p className="text-xs text-red-600">⚠ {c.last_sync_error}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
