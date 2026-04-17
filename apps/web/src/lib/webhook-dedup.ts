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
