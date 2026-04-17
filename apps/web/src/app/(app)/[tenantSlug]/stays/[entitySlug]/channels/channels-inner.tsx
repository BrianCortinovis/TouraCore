'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Globe, Calendar, RefreshCw, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button, Badge, Card, CardContent, IntegrationForm } from '@touracore/ui'
import { getProviderDef, type IntegrationProvider } from '@touracore/integrations'
import {
  saveEntityIntegration,
  loadEntityIntegration,
  testEntityIntegration,
  deleteEntityIntegration,
  loadChannelsHubAction,
} from './actions'

interface ChannelStatus {
  provider: IntegrationProvider
  configured: boolean
  lastSync: string | null
  lastStatus: string | null
}

interface SyncLog {
  id: string
  sync_type: string
  direction: string
  status: string
  error_message: string | null
  synced_at: string
}

const CHANNEL_PROVIDERS: { provider: IntegrationProvider; icon: typeof Globe }[] = [
  { provider: 'octorate', icon: Globe },
  { provider: 'booking_ical', icon: Calendar },
  { provider: 'airbnb_ical', icon: Calendar },
]

export default function ChannelsHubPage() {
  const params = useParams<{ tenantSlug: string; entitySlug: string }>()
  const [channels, setChannels] = useState<Record<string, ChannelStatus>>({})
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openProvider, setOpenProvider] = useState<IntegrationProvider | null>(null)

  const loadHub = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await loadChannelsHubAction()
      if (result.success && result.data) {
        const map: Record<string, ChannelStatus> = {}
        for (const ch of result.data.channels as ChannelStatus[]) {
          map[ch.provider] = ch
        }
        setChannels(map)
        setLogs((result.data.logs as SyncLog[]) ?? [])
      } else {
        setError(result.error ?? 'Errore caricamento canali')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento canali')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadHub()
  }, [loadHub])

  const baseHref = `/${params.tenantSlug}/stays/${params.entitySlug}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={baseHref}
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna alla struttura
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Globe className="h-6 w-6" />
            Channel Manager
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Connetti la tua struttura ai principali portali di prenotazione e
            sincronizza disponibilità, prezzi e prenotazioni in modo automatico
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadHub} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CHANNEL_PROVIDERS.map(({ provider, icon: Icon }) => {
          const def = getProviderDef(provider)
          if (!def) return null
          const status = channels[provider]
          const isOpen = openProvider === provider

          return (
            <Card key={provider} className={isOpen ? 'ring-2 ring-blue-500' : ''}>
              <CardContent className="space-y-4 py-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <Icon className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{def.label}</h3>
                      <p className="text-xs text-gray-500">{def.description}</p>
                    </div>
                  </div>
                  {status?.configured ? (
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3" />
                      Connesso
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Non configurato</Badge>
                  )}
                </div>

                {status?.lastSync && (
                  <p className="text-xs text-gray-500">
                    Ultima sincronizzazione: {new Date(status.lastSync).toLocaleString('it-IT')}
                  </p>
                )}

                <Button
                  variant={isOpen ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => setOpenProvider(isOpen ? null : provider)}
                >
                  {isOpen ? 'Chiudi' : status?.configured ? 'Modifica' : 'Configura'}
                </Button>

                {isOpen && (
                  <div className="border-t pt-4">
                    <IntegrationForm
                      provider={provider}
                      providerDef={def}
                      scope="entity"
                      scopeId="resolved-server-side"
                      onSave={async (input) =>
                        saveEntityIntegration(
                          input.provider,
                          input.credentials as Record<string, unknown>,
                          input.config,
                        )
                      }
                      onLoad={async (input) => loadEntityIntegration(input.provider)}
                      onTest={async (input) => testEntityIntegration(input.provider)}
                      onDelete={async (input) => deleteEntityIntegration(input.provider)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {logs.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Log sincronizzazioni recenti
          </h2>
          <div className="divide-y rounded-lg border bg-white">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{log.sync_type}</span>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                      {log.status === 'success' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {log.status}
                    </Badge>
                    <Badge variant="secondary">{log.direction}</Badge>
                  </div>
                  {log.error_message && (
                    <p className="text-xs text-red-600">{log.error_message}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.synced_at).toLocaleString('it-IT')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
