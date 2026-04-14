'use client'

import { useState, useEffect, useCallback } from 'react'
import { Globe, RefreshCw } from 'lucide-react'
import { Button, Badge, Card, CardContent, IntegrationForm } from '@touracore/ui'
import { getProviderDef } from '@touracore/integrations'
import {
  saveEntityIntegration,
  loadEntityIntegration,
  testEntityIntegration,
  deleteEntityIntegration,
  loadOctorateConnectionAction,
} from './actions'

interface SyncLog {
  id: string
  sync_type: string
  direction: string
  status: string
  error_message: string | null
  synced_at: string
}

interface Connection {
  id: string
  is_active: boolean
  property_id_external: string | null
  settings: { webhook_api_key?: string }
  last_sync_at: string | null
  last_sync_status: string | null
}

export default function OctoratePage() {
  const [connection, setConnection] = useState<Connection | null>(null)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [, setLoadingLegacy] = useState(true)

  const providerDef = getProviderDef('octorate')

  const loadLegacyData = useCallback(async () => {
    setLoadingLegacy(true)
    const result = await loadOctorateConnectionAction()
    if (result.success && result.data) {
      setConnection(result.data.connection as Connection | null)
      setLogs(result.data.logs as SyncLog[])
    }
    setLoadingLegacy(false)
  }, [])

  useEffect(() => {
    void loadLegacyData()
  }, [loadLegacyData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Globe className="h-6 w-6" />
            Octorate Channel Manager
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sincronizza prenotazioni da Booking.com, Expedia, Airbnb e altri canali
          </p>
        </div>
        {connection?.is_active && <Badge variant="success">Connesso</Badge>}
      </div>

      {/* Form credenziali via IntegrationForm */}
      <IntegrationForm
        provider="octorate"
        providerDef={providerDef}
        scope="entity"
        scopeId="resolved-server-side"
        onSave={async (input) =>
          saveEntityIntegration(input.provider, input.credentials as Record<string, unknown>, input.config)
        }
        onLoad={async (input) => loadEntityIntegration(input.provider)}
        onTest={async (input) => testEntityIntegration(input.provider)}
        onDelete={async (input) => deleteEntityIntegration(input.provider)}
      />

      {/* Webhook info (legacy channel_connections) */}
      {connection && (
        <Card>
          <CardContent className="space-y-4 py-6">
            <h2 className="text-lg font-semibold text-gray-900">Webhook Octorate</h2>
            <p className="text-sm text-gray-500">
              Questi dati provengono dalla configurazione channel manager esistente.
            </p>

            {connection.property_id_external && (
              <div>
                <p className="text-sm font-medium text-gray-700">Property ID</p>
                <p className="font-mono text-sm text-gray-600">{connection.property_id_external}</p>
              </div>
            )}

            {connection.last_sync_at && (
              <p className="text-xs text-gray-500">
                Ultima sincronizzazione: {new Date(connection.last_sync_at).toLocaleString('it-IT')}
                {' '}&mdash; {connection.last_sync_status}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log sincronizzazioni */}
      {logs.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Log sincronizzazioni</h2>
            <Button variant="outline" size="sm" onClick={loadLegacyData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="divide-y rounded-lg border bg-white">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{log.sync_type}</span>
                    <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
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
