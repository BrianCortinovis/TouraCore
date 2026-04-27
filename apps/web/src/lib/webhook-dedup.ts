import 'server-only'
import { createServiceRoleClient } from '@touracore/db/server'

/**
 * Webhook event deduplication via webhook_events table.
 * Returns true se evento già processato (skip), false se nuovo (proceed).
 */
export async function isWebhookEventProcessed(
  provider: string,
  externalEventId: string,
): Promise<boolean> {
  const admin = await createServiceRoleClient()
  const { data } = await admin
    .from('webhook_events')
    .select('id')
    .eq('provider', provider)
    .eq('external_event_id', externalEventId)
    .maybeSingle()
  return Boolean(data)
}

export async function recordWebhookEvent(
  provider: string,
  externalEventId: string,
  eventType?: string,
  payloadHash?: string,
): Promise<void> {
  const admin = await createServiceRoleClient()
  await admin.from('webhook_events').insert({
    provider,
    external_event_id: externalEventId,
    event_type: eventType ?? null,
    payload_hash: payloadHash ?? null,
    status: 'processed',
  })
}

/**
 * Atomic dedup-and-record (P1 fix race check-then-insert).
 * Sfrutta UNIQUE (provider, external_event_id) creato in migration 00152.
 * Restituisce true se l'evento è NUOVO (caller deve processarlo), false se già visto.
 */
export async function tryRecordWebhookEvent(
  provider: string,
  externalEventId: string,
  eventType?: string,
  payloadHash?: string,
): Promise<{ isNew: boolean }> {
  const admin = await createServiceRoleClient()
  const { error } = await admin.from('webhook_events').insert({
    provider,
    external_event_id: externalEventId,
    event_type: eventType ?? null,
    payload_hash: payloadHash ?? null,
    status: 'processing',
  })
  if (!error) return { isNew: true }
  // Postgres unique_violation = 23505. Supabase espone code in error.code.
  const code = (error as { code?: string }).code
  if (code === '23505') return { isNew: false }
  // Errore non duplicato: fail-open per evitare di perdere webhook reali.
  console.error('[webhook-dedup] insert error', error)
  return { isNew: true }
}
