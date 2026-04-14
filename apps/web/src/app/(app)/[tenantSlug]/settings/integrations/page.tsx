'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plug, ArrowLeft } from 'lucide-react'
import { Card, CardContent, IntegrationForm } from '@touracore/ui'
import { getProvidersForScope } from '@touracore/integrations/registry'
import type { IntegrationProvider } from '@touracore/integrations'
import {
  saveTenantIntegration,
  loadTenantIntegration,
  testTenantIntegration,
  deleteTenantIntegration,
} from './actions'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {}

function ProviderIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon]
  if (Icon) return <Icon className={className} />
  return <Plug className={className} />
}

export default function TenantIntegrationsPage() {
  const params = useParams<{ tenantSlug: string }>()
  const tenantSlug = params.tenantSlug
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null)

  const providers = getProvidersForScope('tenant')
  const selectedDef = providers.find((p) => p.provider === selectedProvider)

  if (selectedDef && selectedProvider) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedProvider(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Torna alle integrazioni
        </button>

        <IntegrationForm
          provider={selectedProvider}
          providerDef={selectedDef}
          scope="tenant"
          scopeId={tenantSlug}
          onSave={async (input) =>
            saveTenantIntegration(tenantSlug, input.provider, input.credentials as Record<string, unknown>, input.config)
          }
          onLoad={async (input) =>
            loadTenantIntegration(tenantSlug, input.provider)
          }
          onTest={async (input) =>
            testTenantIntegration(tenantSlug, input.provider)
          }
          onDelete={async (input) =>
            deleteTenantIntegration(tenantSlug, input.provider)
          }
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Plug className="h-6 w-6" />
          Integrazioni
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura i servizi esterni collegati al tuo account
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {providers.map((def) => (
          <Card
            key={def.provider}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setSelectedProvider(def.provider)}
          >
            <CardContent className="flex items-start gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <ProviderIcon icon={def.icon} className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{def.label}</h3>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{def.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
