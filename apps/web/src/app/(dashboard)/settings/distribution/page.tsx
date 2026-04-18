import { DistributionClient } from './distribution-client'
import { listDistributionEntitiesAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function DistributionSettingsPage() {
  const result = await listDistributionEntitiesAction()

  if (!result.success || !result.rows) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Distribuzione</h1>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {result.error === 'TENANT_REQUIRED'
            ? 'Per gestire la distribuzione pubblica serve selezionare un tenant.'
            : `Errore: ${result.error ?? 'sconosciuto'}`}
        </div>
      </div>
    )
  }

  return (
    <DistributionClient rows={result.rows} tenantSlug={result.tenantSlug ?? ''} />
  )
}
