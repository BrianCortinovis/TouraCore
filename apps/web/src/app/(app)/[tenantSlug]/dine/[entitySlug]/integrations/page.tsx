import { createServerSupabaseClient } from '@touracore/db/server'
import { ensureRestaurantRecord } from '../settings/actions'
import { IntegrationsView } from './integrations-view'

interface Props {
  params: Promise<{ tenantSlug: string; entitySlug: string }>
}

export default async function IntegrationsPage({ params }: Props) {
  const { tenantSlug, entitySlug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('id, name, tenant_id')
    .eq('slug', entitySlug)
    .single()
  if (!entity) return null

  await ensureRestaurantRecord(entity.id as string, entity.tenant_id as string)

  const { data: integrations } = await supabase
    .from('restaurant_integrations')
    .select('id, provider, is_active, last_sync_at, last_sync_status, last_sync_error')
    .eq('restaurant_id', entity.id)
    .order('provider')

  return (
    <div className="space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Integrazioni</h1>
        <p className="text-sm text-gray-500">TheFork · Google Reserve · RT fiscale · Printer cucina · Delivery</p>
      </header>
      <IntegrationsView
        tenantSlug={tenantSlug}
        entitySlug={entitySlug}
        restaurantId={entity.id as string}
        integrations={(integrations ?? []).map((i) => ({
          id: i.id as string,
          provider: i.provider as string,
          isActive: i.is_active as boolean,
          lastSyncAt: i.last_sync_at as string | null,
          lastSyncStatus: i.last_sync_status as string | null,
          lastSyncError: i.last_sync_error as string | null,
        }))}
      />
    </div>
  )
}
