import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChannelAdapter, ChannelReservation, SyncResult } from '../types'
import { createBookingAdapter } from '../providers/booking'
import { createAirbnbAdapter } from '../providers/airbnb'
import { createExpediaAdapter } from '../providers/expedia'
import { createOctorateAdapter } from '../providers/octorate'

export interface ChannelConnection {
  id: string
  entity_id: string
  channel_name: string
  property_id_external: string | null
  credentials: Record<string, unknown>
  is_active: boolean
  last_sync_at: string | null
}

export function buildAdapter(connection: ChannelConnection): ChannelAdapter | null {
  const creds = {
    provider: connection.channel_name as never,
    ...(connection.credentials as Record<string, string | undefined>),
  }
  switch (connection.channel_name) {
    case 'booking':
    case 'booking_com':
      return createBookingAdapter(creds as never)
    case 'airbnb':
      return createAirbnbAdapter(creds as never)
    case 'expedia':
      return createExpediaAdapter(creds as never)
    case 'octorate':
      return createOctorateAdapter(creds as never)
    default:
      return null
  }
}

export async function withEntityLock<T>(
  supabase: SupabaseClient,
  entityId: string,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = hashStringToInt(entityId)
  await supabase.rpc('pg_advisory_lock', { key: lockKey }).throwOnError()
  try {
    return await fn()
  } finally {
    await supabase.rpc('pg_advisory_unlock', { key: lockKey })
  }
}

function hashStringToInt(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export async function persistChannelReservation(
  supabase: SupabaseClient,
  connection: ChannelConnection,
  reservation: ChannelReservation
): Promise<{ created: boolean; reservationId: string | null }> {
  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id')
    .eq('id', connection.entity_id)
    .maybeSingle()
  if (!entity) return { created: false, reservationId: null }

  const { data: existing } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('entity_id', connection.entity_id)
    .eq('channel_reservation_id', reservation.externalId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('reservations')
      .update({
        check_in: reservation.checkIn,
        check_out: reservation.checkOut,
        total_amount: reservation.totalAmount,
        status: reservation.status === 'cancelled' ? 'cancelled' : existing.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
    return { created: false, reservationId: existing.id }
  }
  return { created: false, reservationId: null }
}

export async function logSync(
  supabase: SupabaseClient,
  connection: ChannelConnection,
  syncType: string,
  direction: 'inbound' | 'outbound',
  status: 'success' | 'error' | 'partial',
  details: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  await supabase.from('channel_sync_logs').insert({
    entity_id: connection.entity_id,
    channel_connection_id: connection.id,
    sync_type: syncType,
    direction,
    status,
    details,
    error_message: errorMessage ?? null,
  })
}

export async function runFullSync(
  supabase: SupabaseClient,
  connection: ChannelConnection
): Promise<SyncResult> {
  const adapter = buildAdapter(connection)
  if (!adapter) {
    return { success: false, imported: 0, updated: 0, skipped: 0, errors: [`No adapter for ${connection.channel_name}`] }
  }
  if (!adapter.isConfigured) {
    await logSync(supabase, connection, 'full_sync', 'inbound', 'partial', { reason: 'not_configured' })
    return { success: false, imported: 0, updated: 0, skipped: 0, errors: ['Adapter not configured'] }
  }

  return withEntityLock(supabase, connection.entity_id, async () => {
    const since = connection.last_sync_at ? new Date(connection.last_sync_at) : undefined
    try {
      const reservations = await adapter.pullReservations(since)
      let imported = 0
      let updated = 0
      for (const res of reservations) {
        const r = await persistChannelReservation(supabase, connection, res)
        if (r.created) imported++
        else if (r.reservationId) updated++
      }
      await supabase
        .from('channel_connections')
        .update({ last_sync_at: new Date().toISOString(), last_sync_status: 'success' })
        .eq('id', connection.id)
      await logSync(supabase, connection, 'full_sync', 'inbound', 'success', {
        imported,
        updated,
        total: reservations.length,
      })
      return { success: true, imported, updated, skipped: 0, errors: [] }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown'
      await supabase
        .from('channel_connections')
        .update({ last_sync_status: 'error' })
        .eq('id', connection.id)
      await logSync(supabase, connection, 'full_sync', 'inbound', 'error', {}, msg)
      return { success: false, imported: 0, updated: 0, skipped: 0, errors: [msg] }
    }
  })
}
