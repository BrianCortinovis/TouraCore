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

// Carica anche i vecchi dati channel_connections per retrocompatibilità
export async function loadOctorateConnectionAction(): Promise<ActionResult> {
  try {
    const { property } = await requireCurrentEntity()
    const supabase = await createServerSupabaseClient()

    const { data } = await supabase
      .from('channel_connections')
      .select('*')
      .eq('entity_id', property.id)
      .eq('channel_name', 'octorate')
      .maybeSingle()

    const { data: logs } = await supabase
      .from('channel_sync_logs')
      .select('*')
      .eq('entity_id', property.id)
      .order('synced_at', { ascending: false })
      .limit(10)

    return {
      success: true,
      data: {
        connection: data ?? null,
        logs: logs ?? [],
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore' }
  }
}
