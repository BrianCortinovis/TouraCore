import { createServerSupabaseClient } from '@touracore/db'
import { getDecryptedCredentials } from './credentials'

interface SyncResult {
  success: boolean
  skipped?: boolean
  reason?: string
  synced_count?: number
  errors?: string[]
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

  // Cerca channel_connection per l'entity
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

  // TODO: chiamata HTTP Octorate per sync availability
  // POST /api/v2/availability con property_mapping[entityId] come octorate property id
  // Per ora logga l'operazione e ritorna successo

  await logSync(entityId, 'octorate', 'availability_push', 'success', {
    date_from: dateFrom ?? 'today',
    date_to: dateTo ?? '+30d',
    property_mapping: Object.keys(propertyMapping).length,
  })

  return { success: true, synced_count: 0, reason: 'API Octorate non ancora collegata' }
}

export async function syncReservations(
  entityId: string
): Promise<SyncResult> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) {
    return { success: true, skipped: true, reason: 'Credenziali Octorate non configurate' }
  }

  // TODO: chiamata HTTP Octorate per pull prenotazioni
  // GET /api/v2/reservations con filtro da last_sync_at

  await logSync(entityId, 'octorate', 'reservations_pull', 'success', {
    note: 'API Octorate non ancora collegata',
  })

  return { success: true, synced_count: 0, reason: 'API Octorate non ancora collegata' }
}

export async function pushRateUpdate(
  entityId: string,
  ratePlanId?: string
): Promise<SyncResult> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) {
    return { success: true, skipped: true, reason: 'Credenziali Octorate non configurate' }
  }

  // TODO: chiamata HTTP Octorate per push tariffe aggiornate

  await logSync(entityId, 'octorate', 'rates_push', 'success', {
    rate_plan_id: ratePlanId ?? 'all',
    note: 'API Octorate non ancora collegata',
  })

  return { success: true, synced_count: 0, reason: 'API Octorate non ancora collegata' }
}

export async function syncRatesForOrg(
  entityId: string,
  _options?: { ratePlanId?: string }
): Promise<SyncResult | null> {
  return pushRateUpdate(entityId, _options?.ratePlanId)
}
