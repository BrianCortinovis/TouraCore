'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { requireCurrentEntity } from '@touracore/hospitality/src/auth/access'
import {
  saveIntegrationAction,
  deleteIntegrationAction,
  testConnectionAction,
  loadIntegrationAction,
  type IntegrationProvider,
} from '@touracore/integrations'

interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

const CHANNEL_PROVIDERS: IntegrationProvider[] = [
  'octorate',
  'booking_ical',
  'airbnb_ical',
]

async function getEntityId(): Promise<string> {
  const { property } = await requireCurrentEntity()
  return property.id
}

export async function saveEntityIntegration(
  provider: IntegrationProvider,
  credentials: Record<string, unknown>,
  config?: Record<string, unknown>,
): Promise<ActionResult> {
  const entityId = await getEntityId()
  return saveIntegrationAction({
    scope: 'entity',
    scope_id: entityId,
    provider,
    credentials,
    config,
  })
}

export async function loadEntityIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult> {
  const entityId = await getEntityId()
  return loadIntegrationAction({
    scope: 'entity',
    scope_id: entityId,
    provider,
  })
}

export async function testEntityIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult> {
  const entityId = await getEntityId()
  return testConnectionAction({
    scope: 'entity',
    scope_id: entityId,
    provider,
  })
}

export async function deleteEntityIntegration(
  provider: IntegrationProvider,
): Promise<ActionResult> {
  const entityId = await getEntityId()
  return deleteIntegrationAction({
    scope: 'entity',
    scope_id: entityId,
    provider,
  })
}

// Carica stato di tutti i canali in una sola request HTTP
export async function loadChannelsHubAction(): Promise<ActionResult> {
  try {
    const entityId = await getEntityId()
    const supabase = await createServerSupabaseClient()

    const [credsResult, logsResult] = await Promise.all([
      supabase
        .from('integration_credentials')
        .select('provider, status, last_sync_at, last_error')
        .eq('scope', 'entity')
        .eq('scope_id', entityId)
        .in('provider', CHANNEL_PROVIDERS),
      supabase
        .from('channel_sync_logs')
        .select('*')
        .eq('entity_id', entityId)
        .order('synced_at', { ascending: false })
        .limit(15),
    ])

    const credsByProvider = new Map<string, { status: string; last_sync_at: string | null; last_error: string | null }>()
    for (const row of credsResult.data ?? []) {
      credsByProvider.set(row.provider, {
        status: row.status,
        last_sync_at: row.last_sync_at,
        last_error: row.last_error,
      })
    }

    const channels = CHANNEL_PROVIDERS.map((provider) => {
      const cred = credsByProvider.get(provider)
      return {
        provider,
        configured: cred?.status === 'configured',
        lastSync: cred?.last_sync_at ?? null,
        lastStatus: cred?.last_error ?? null,
      }
    })

    return {
      success: true,
      data: {
        channels,
        logs: logsResult.data ?? [],
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
