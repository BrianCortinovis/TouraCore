import { listDistributionEntitiesAction } from '../distribution/actions'
import { EmbedStudioClient } from './embed-studio-client'

export const dynamic = 'force-dynamic'

export default async function EmbedStudioPage() {
  const result = await listDistributionEntitiesAction()

  if (!result.success || !result.rows) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Embed Studio</h1>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {result.error === 'TENANT_REQUIRED'
            ? 'Seleziona un tenant per generare gli embed.'
            : `Errore: ${result.error ?? 'sconosciuto'}`}
        </div>
      </div>
    )
  }

  return <EmbedStudioClient rows={result.rows} tenantSlug={result.tenantSlug ?? ''} />
}
