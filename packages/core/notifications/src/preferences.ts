import { createServiceRoleClient } from '@touracore/db/server'
import { signUnsubscribeToken } from './crypto'

export async function unsubscribeByToken(token: string, email: string, eventKey: string): Promise<{ ok: boolean; error?: string }> {
  const expected = signUnsubscribeToken(email, eventKey)
  if (expected !== token) return { ok: false, error: 'invalid_token' }

  const supabase = await createServiceRoleClient()
  const { error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: null,
      guest_email: email,
      event_key: eventKey,
      channel: 'email',
      enabled: false,
      unsubscribed_at: new Date().toISOString(),
      unsubscribe_token: token,
    }, { onConflict: 'guest_email,event_key,channel,tenant_id,agency_id' })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function setPreference(input: {
  userId?: string | null
  guestEmail?: string | null
  eventKey: string
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'slack' | 'in_app'
  enabled: boolean
  tenantId?: string | null
  agencyId?: string | null
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServiceRoleClient()
  const row = {
    user_id: input.userId ?? null,
    guest_email: input.guestEmail ?? null,
    event_key: input.eventKey,
    channel: input.channel,
    enabled: input.enabled,
    tenant_id: input.tenantId ?? null,
    agency_id: input.agencyId ?? null,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('notification_preferences').upsert(row, {
    onConflict: input.userId ? 'user_id,event_key,channel,tenant_id,agency_id' : 'guest_email,event_key,channel,tenant_id,agency_id',
  })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function listPreferences(userId: string | null, guestEmail: string | null): Promise<Array<{ event_key: string; channel: string; enabled: boolean }>> {
  const supabase = await createServiceRoleClient()
  let q = supabase.from('notification_preferences').select('event_key, channel, enabled')
  if (userId) q = q.eq('user_id', userId)
  else if (guestEmail) q = q.eq('guest_email', guestEmail)
  else return []
  const { data } = await q
  return (data ?? []) as Array<{ event_key: string; channel: string; enabled: boolean }>
}
