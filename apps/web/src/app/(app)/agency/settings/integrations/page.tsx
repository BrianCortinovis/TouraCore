'use client'

import { useState } from 'react'
import { Plug, ArrowLeft } from 'lucide-react'
import { Card, CardContent, IntegrationForm } from '@touracore/ui'
import { getProvidersForScope } from '@touracore/integrations'
import type { IntegrationProvider } from '@touracore/integrations'
import {
  saveAgencyIntegration,
  loadAgencyIntegration,
  testAgencyIntegration,
  deleteAgencyIntegration,
} from './actions'

export default function AgencyIntegrationsPage() {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider | null>(null)

  const providers = getProvidersForScope('agency')
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
          scope="agency"
          scopeId="resolved-server-side"
          onSave={async (input) =>
            saveAgencyIntegration(input.provider, input.credentials as Record<string, unknown>, input.config)
          }
          onLoad={async (input) =>
            loadAgencyIntegration(input.provider)
          }
          onTest={async (input) =>
            testAgencyIntegration(input.provider)
          }
          onDelete={async (input) =>
            deleteAgencyIntegration(input.provider)
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
          Integrazioni Agenzia
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configura i servizi esterni condivisi tra tutte le strutture gestite
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                <Plug className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900">{def.label}</h3>
                <p className="mt-0.5 text-sm text-gray-500">{def.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
