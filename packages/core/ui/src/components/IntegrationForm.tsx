'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from './Button'
import { Input } from './Input'
import { Badge } from './Badge'
import { Card, CardContent } from './Card'
import type {
  IntegrationProvider,
  IntegrationScope,
  IntegrationFieldDef,
  IntegrationProviderDef,
  IntegrationStatus,
} from '@touracore/integrations'

interface IntegrationFormProps {
  provider: IntegrationProvider
  providerDef: IntegrationProviderDef
  scope: IntegrationScope
  scopeId: string
  onSave: (input: {
    scope: IntegrationScope
    scope_id: string
    provider: IntegrationProvider
    credentials: Record<string, unknown>
    config?: Record<string, unknown>
  }) => Promise<{ success: boolean; error?: string }>
  onLoad: (input: {
    scope: IntegrationScope
    scope_id: string
    provider: IntegrationProvider
  }) => Promise<{
    success: boolean
    error?: string
    data?: Record<string, unknown>
  }>
  onTest: (input: {
    scope: IntegrationScope
    scope_id: string
    provider: IntegrationProvider
  }) => Promise<{
    success: boolean
    error?: string
    data?: Record<string, unknown>
  }>
  onDelete?: (input: {
    scope: IntegrationScope
    scope_id: string
    provider: IntegrationProvider
  }) => Promise<{ success: boolean; error?: string }>
  extraContent?: React.ReactNode
}

const MASKED = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'

function statusBadge(status: IntegrationStatus) {
  switch (status) {
    case 'configured':
      return <Badge variant="success">Configurato</Badge>
    case 'error':
      return <Badge variant="destructive">Errore</Badge>
    default:
      return <Badge variant="secondary">Non configurato</Badge>
  }
}

function isFieldSensitive(field: IntegrationFieldDef): boolean {
  return field.type === 'password'
}

export function IntegrationForm({
  provider,
  providerDef,
  scope,
  scopeId,
  onSave,
  onLoad,
  onTest,
  onDelete,
  extraContent,
}: IntegrationFormProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<IntegrationStatus>('not_configured')
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await onLoad({ scope, scope_id: scopeId, provider })
    if (result.success && result.data) {
      const creds = (result.data.credentials ?? {}) as Record<string, string>
      const initial: Record<string, string> = {}
      for (const field of providerDef.fields) {
        initial[field.key] = creds[field.key] != null ? String(creds[field.key]) : ''
      }
      setValues(initial)
      setStatus((result.data.status as IntegrationStatus) ?? 'not_configured')
      setLastSyncAt((result.data.last_sync_at as string) ?? null)
      setLastError((result.data.last_error as string) ?? null)
    }
    setLoading(false)
  }, [scope, scopeId, provider, providerDef.fields, onLoad])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    const credentials: Record<string, unknown> = {}
    for (const field of providerDef.fields) {
      const val = values[field.key] ?? ''
      // Non inviare il campo mascherato — il server mantiene il valore cifrato esistente
      if (isFieldSensitive(field) && val === MASKED) continue
      if (field.type === 'jsonb') {
        try {
          credentials[field.key] = val ? JSON.parse(val) : null
        } catch {
          setMessage({ type: 'error', text: `${field.label}: JSON non valido` })
          setSaving(false)
          return
        }
      } else {
        credentials[field.key] = val
      }
    }

    const result = await onSave({
      scope,
      scope_id: scopeId,
      provider,
      credentials,
    })

    if (result.success) {
      setMessage({ type: 'success', text: 'Configurazione salvata' })
      void loadData()
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore di salvataggio' })
    }
    setSaving(false)
  }

  const handleTest = async () => {
    setTesting(true)
    setMessage(null)
    const result = await onTest({ scope, scope_id: scopeId, provider })
    if (result.success) {
      const reason = (result.data?.reason as string) ?? 'Test completato'
      setMessage({ type: 'success', text: reason })
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore di connessione' })
    }
    setTesting(false)
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setMessage(null)
    const result = await onDelete({ scope, scope_id: scopeId, provider })
    if (result.success) {
      setValues({})
      setStatus('not_configured')
      setMessage({ type: 'success', text: 'Integrazione rimossa' })
    } else {
      setMessage({ type: 'error', text: result.error ?? 'Errore di eliminazione' })
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8 text-gray-500">Caricamento...</div>
  }

  return (
    <div className="space-y-4">
      {/* Header con stato */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{providerDef.label}</h2>
          <p className="text-sm text-gray-500">{providerDef.description}</p>
        </div>
        {statusBadge(status)}
      </div>

      {/* Messaggi */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Form campi */}
      <Card>
        <CardContent className="space-y-4 py-5">
          {providerDef.fields.map((field) => (
            <div key={field.key}>
              <Input
                id={`integration-${field.key}`}
                label={`${field.label}${field.required ? ' *' : ''}`}
                type={field.type === 'password' ? 'password' : 'text'}
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
                onFocus={() => {
                  if (isFieldSensitive(field) && values[field.key] === MASKED) {
                    setValues((prev) => ({ ...prev, [field.key]: '' }))
                  }
                }}
              />
              {field.help && (
                <p className="mt-1 text-xs text-gray-400">{field.help}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contenuto extra (es. property_mapping per octorate entity) */}
      {extraContent}

      {/* Info sincronizzazione */}
      {(lastSyncAt || lastError) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          {lastSyncAt && (
            <p className="text-gray-600">
              Ultima sincronizzazione: {new Date(lastSyncAt).toLocaleString('it-IT')}
            </p>
          )}
          {lastError && (
            <p className="mt-1 text-red-600">Ultimo errore: {lastError}</p>
          )}
        </div>
      )}

      {/* Azioni */}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} isLoading={saving}>
          Salva configurazione
        </Button>
        <Button
          variant="outline"
          onClick={handleTest}
          isLoading={testing}
          disabled={status !== 'configured'}
          title={status !== 'configured' ? 'Salva le credenziali prima di testare' : ''}
        >
          Testa connessione
        </Button>
        {onDelete && status !== 'not_configured' && (
          <Button variant="destructive" onClick={handleDelete}>
            Rimuovi
          </Button>
        )}
      </div>
    </div>
  )
}
