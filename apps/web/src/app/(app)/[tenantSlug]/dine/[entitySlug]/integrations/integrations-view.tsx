'use client'

import { useState, useTransition } from 'react'
import { Plug, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react'
import { configureIntegration, testIntegration } from './actions'

const PROVIDERS = [
  {
    code: 'thefork',
    label: 'TheFork',
    description: 'Ricevi prenotazioni TheFork + push availability',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'tf_xxx', secret: true },
      { key: 'restaurantId', label: 'TheFork Restaurant ID', placeholder: 'TF-12345' },
    ],
  },
  {
    code: 'google_reserve',
    label: 'Google Reserve',
    description: 'Reserve with Google + booking via Maps/Search',
    fields: [
      { key: 'merchantId', label: 'Google Merchant ID', placeholder: 'G-12345' },
      { key: 'feedUrl', label: 'Feed XML URL', placeholder: 'https://…/feed.xml' },
    ],
  },
  {
    code: 'rt_fiscal_it',
    label: 'RT Fiscale Italia',
    description: 'Stampa scontrino elettronico + invio corrispettivi ADE',
    fields: [
      { key: 'middlewareUrl', label: 'Middleware URL', placeholder: 'http://192.168.1.10:8080' },
      { key: 'fiscalSerial', label: 'Serial RT', placeholder: 'EPSON-FP90-001' },
    ],
  },
  {
    code: 'printer_kitchen',
    label: 'Printer cucina ESC/POS',
    description: 'Stampa commande cartacee per stazione',
    fields: [
      { key: 'ipAddress', label: 'IP printer', placeholder: '192.168.1.50' },
      { key: 'port', label: 'Porta', placeholder: '9100' },
    ],
  },
  {
    code: 'deliveroo',
    label: 'Deliveroo',
    description: 'Ricevi ordini delivery (v2 — futuro)',
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: '…', secret: true },
    ],
  },
] as const

interface Integration {
  id: string
  provider: string
  isActive: boolean
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastSyncError: string | null
}

interface Props {
  tenantSlug: string
  entitySlug: string
  restaurantId: string
  integrations: Integration[]
}

export function IntegrationsView({ tenantSlug, entitySlug, restaurantId, integrations }: Props) {
  const [configFor, setConfigFor] = useState<typeof PROVIDERS[number] | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {PROVIDERS.map((p) => {
          const integration = integrations.find((i) => i.provider === p.code)
          return (
            <div key={p.code} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`rounded-md p-2 ${integration?.isActive ? 'bg-green-50' : 'bg-gray-100'}`}>
                    <Plug className={`h-5 w-5 ${integration?.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{p.label}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{p.description}</p>
                  </div>
                </div>
                {integration?.isActive ? (
                  <span className="rounded border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                    Attivo
                  </span>
                ) : (
                  <span className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                    Inattivo
                  </span>
                )}
              </div>

              {integration && (
                <div className="mt-3 border-t border-gray-100 pt-2 text-[11px] text-gray-500">
                  <div className="flex items-center gap-1">
                    {integration.lastSyncStatus === 'ok' ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                    )}
                    <span>
                      Ultima sync: {integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('it-IT') : 'Mai'}
                    </span>
                  </div>
                  {integration.lastSyncError && (
                    <p className="mt-1 text-red-600">{integration.lastSyncError}</p>
                  )}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setConfigFor(p)}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs hover:border-blue-400"
                >
                  {integration ? 'Modifica' : 'Configura'}
                </button>
                {integration && (
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await testIntegration({ integrationId: integration.id, tenantSlug, entitySlug })
                      })
                    }
                    disabled={pending}
                    className="flex items-center gap-1 rounded border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" /> Test
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {configFor && (
        <ConfigDialog
          provider={configFor}
          restaurantId={restaurantId}
          tenantSlug={tenantSlug}
          entitySlug={entitySlug}
          onClose={() => setConfigFor(null)}
        />
      )}
    </>
  )
}

function ConfigDialog({
  provider,
  restaurantId,
  tenantSlug,
  entitySlug,
  onClose,
}: {
  provider: typeof PROVIDERS[number]
  restaurantId: string
  tenantSlug: string
  entitySlug: string
  onClose: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [config, setConfig] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await configureIntegration({
        restaurantId,
        tenantSlug,
        entitySlug,
        provider: provider.code as 'thefork' | 'google_reserve' | 'opentable' | 'rt_fiscal_it' | 'printer_kitchen' | 'deliveroo' | 'justeat',
        config,
        isActive: true,
      })
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold">Configura {provider.label}</h2>
        <p className="text-xs text-gray-500">{provider.description}</p>
        {provider.fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs text-gray-600">{f.label}</label>
            <input
              required
              type={'secret' in f && f.secret ? 'password' : 'text'}
              placeholder={f.placeholder}
              value={config[f.key] ?? ''}
              onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
              className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
          <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            Annulla
          </button>
          <button type="submit" disabled={pending} className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            {pending ? 'Salvo…' : 'Attiva'}
          </button>
        </div>
      </form>
    </div>
  )
}
