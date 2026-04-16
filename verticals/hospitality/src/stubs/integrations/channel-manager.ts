import { createServerSupabaseClient } from '@touracore/db'
import { getDecryptedCredentials } from './credentials'

interface SyncResult {
  success: boolean
  skipped?: boolean
  reason?: string
  synced_count?: number
  errors?: string[]
}

function getOctoratePropertyId(
  entityId: string,
  creds: Record<string, unknown>,
): string | null {
  const directId = creds.property_id_external
  if (typeof directId === 'string' && directId.trim()) return directId.trim()

  const mapping = creds.property_mapping
  if (mapping && typeof mapping === 'object' && !Array.isArray(mapping)) {
    const mapped = (mapping as Record<string, unknown>)[entityId]
    if (typeof mapped === 'string' && mapped.trim()) return mapped.trim()
  }

  return null
}

async function ensureOctorateConnection(
  entityId: string,
  creds: Record<string, unknown>,
): Promise<{ id: string; propertyIdExternal: string | null } | null> {
  const supabase = await createServerSupabaseClient()
  const propertyIdExternal = getOctoratePropertyId(entityId, creds)

  const { data: existing } = await supabase
    .from('channel_connections')
    .select('id')
    .eq('entity_id', entityId)
    .eq('channel_name', 'octorate')
    .maybeSingle()

  if (existing?.id) {
    await supabase
      .from('channel_connections')
      .update({
        credentials: creds,
        property_id_external: propertyIdExternal,
        is_active: Boolean(propertyIdExternal),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    return { id: existing.id, propertyIdExternal }
  }

  const { data: inserted } = await supabase
    .from('channel_connections')
    .insert({
      entity_id: entityId,
      channel_name: 'octorate',
      is_active: Boolean(propertyIdExternal),
      credentials: creds,
      property_id_external: propertyIdExternal,
      last_sync_status: null,
      last_sync_at: null,
    })
    .select('id')
    .single()

  if (!inserted?.id) return null

  return { id: inserted.id, propertyIdExternal }
}

async function markConnectionSyncState(
  connectionId: string,
  status: 'success' | 'partial' | 'error',
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  await supabase
    .from('channel_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: status,
    })
    .eq('id', connectionId)
}

async function logSync(
  entityId: string,
  provider: string,
  operation: string,
  status: 'success' | 'partial' | 'error',
  details?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { data: connection } = await supabase
    .from('channel_connections')
    .select('id')
    .eq('entity_id', entityId)
    .eq('channel_name', provider)
    .limit(1)
    .maybeSingle()

  if (!connection) return

  await supabase.from('channel_sync_logs').insert({
    entity_id: entityId,
    channel_connection_id: connection.id,
    sync_type: operation,
    direction: 'outbound',
    status,
    details: details ?? {},
    error_message: errorMessage ?? null,
  })
}

export async function syncAvailabilityForOrg(
  entityId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<SyncResult> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) {
    return { success: true, skipped: true, reason: 'Credenziali Octorate non configurate' }
  }

  const propertyMapping = (creds.property_mapping as Record<string, string>) ?? {}
  const apiKey = creds.api_key as string
  const accountId = creds.account_id as string

  if (!apiKey || !accountId) {
    return { success: false, reason: 'Credenziali Octorate incomplete (api_key o account_id mancanti)' }
  }

  const connection = await ensureOctorateConnection(entityId, creds)
  if (!connection) {
    return { success: false, reason: 'Connessione Octorate non inizializzabile' }
  }

  if (!connection.propertyIdExternal) {
    await logSync(
      entityId,
      'octorate',
      'availability_push',
      'partial',
      {
        date_from: dateFrom ?? 'today',
        date_to: dateTo ?? '+30d',
        property_mapping: Object.keys(propertyMapping).length,
      },
      'Mappatura Octorate non disponibile per questa struttura',
    )
    await markConnectionSyncState(connection.id, 'partial')

    return {
      success: true,
      skipped: true,
      reason: 'Mappatura Octorate non disponibile per questa struttura',
    }
  }

  await logSync(entityId, 'octorate', 'availability_push', 'partial', {
    date_from: dateFrom ?? 'today',
    date_to: dateTo ?? '+30d',
    property_mapping: Object.keys(propertyMapping).length,
    property_id_external: connection.propertyIdExternal,
  })
  await markConnectionSyncState(connection.id, 'partial')

  return {
    success: true,
    synced_count: 0,
    reason: 'Sincronizzazione registrata, adapter esterno non ancora collegato',
  }
}

export async function syncReservations(
  entityId: string
): Promise<SyncResult> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) {
    return { success: true, skipped: true, reason: 'Credenziali Octorate non configurate' }
  }

  const connection = await ensureOctorateConnection(entityId, creds)
  if (!connection) {
    return { success: false, reason: 'Connessione Octorate non inizializzabile' }
  }

  await logSync(entityId, 'octorate', 'reservations_pull', 'partial', {
    note: 'API Octorate non ancora collegata',
    property_id_external: connection.propertyIdExternal,
  })
  await markConnectionSyncState(connection.id, 'partial')

  return {
    success: true,
    synced_count: 0,
    reason: 'Sincronizzazione registrata, adapter esterno non ancora collegato',
  }
}

export async function pushRateUpdate(
  entityId: string,
  ratePlanId?: string
): Promise<SyncResult> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) {
    return { success: true, skipped: true, reason: 'Credenziali Octorate non configurate' }
  }

  const connection = await ensureOctorateConnection(entityId, creds)
  if (!connection) {
    return { success: false, reason: 'Connessione Octorate non inizializzabile' }
  }

  await logSync(entityId, 'octorate', 'rates_push', 'partial', {
    rate_plan_id: ratePlanId ?? 'all',
    note: 'API Octorate non ancora collegata',
    property_id_external: connection.propertyIdExternal,
  })
  await markConnectionSyncState(connection.id, 'partial')

  return {
    success: true,
    synced_count: 0,
    reason: 'Sincronizzazione registrata, adapter esterno non ancora collegato',
  }
}

export async function syncRatesForOrg(
  entityId: string,
  _options?: { ratePlanId?: string }
): Promise<SyncResult | null> {
  return pushRateUpdate(entityId, _options?.ratePlanId)
}
