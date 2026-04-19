import { createServiceRoleClient } from '@touracore/db/server'
import { encryptJson, decryptJson } from './crypto'

export type ProviderKey =
  | 'resend' | 'mailgun' | 'sendgrid' | 'ses' | 'smtp'
  | 'twilio_sms' | 'twilio_wa' | 'meta_wa'
  | 'webpush' | 'slack' | 'telegram'

export type ProviderScope = 'platform' | 'agency' | 'tenant'

export interface SaveProviderInput {
  scope: ProviderScope
  scopeId?: string | null
  provider: ProviderKey
  channel: 'email' | 'sms' | 'whatsapp' | 'push' | 'slack'
  config: Record<string, unknown>
  fromEmail?: string | null
  fromName?: string | null
  fromPhone?: string | null
  replyTo?: string | null
  isDefault?: boolean
  isActive?: boolean
}

export async function saveProvider(input: SaveProviderInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const supabase = await createServiceRoleClient()
  const encrypted = encryptJson(input.config)

  const row = {
    scope: input.scope,
    scope_id: input.scopeId ?? null,
    provider: input.provider,
    channel: input.channel,
    config_encrypted: encrypted,
    from_email: input.fromEmail ?? null,
    from_name: input.fromName ?? null,
    from_phone: input.fromPhone ?? null,
    reply_to: input.replyTo ?? null,
    is_default: input.isDefault ?? true,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('notification_providers')
    .upsert(row, { onConflict: 'scope,scope_id,provider,channel' })
    .select('id')
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, id: data.id }
}

export async function deleteProvider(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServiceRoleClient()
  const { error } = await supabase.from('notification_providers').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getProviderConfig(id: string): Promise<Record<string, unknown> | null> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase
    .from('notification_providers')
    .select('config_encrypted')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  try { return decryptJson(data.config_encrypted) } catch { return null }
}

export async function listProviders(scope: ProviderScope, scopeId: string | null): Promise<Array<{
  id: string; provider: ProviderKey; channel: string; is_active: boolean; is_default: boolean; from_email: string | null; from_name: string | null; from_phone: string | null; updated_at: string
}>> {
  const supabase = await createServiceRoleClient()
  let q = supabase
    .from('notification_providers')
    .select('id, provider, channel, is_active, is_default, from_email, from_name, from_phone, updated_at')
    .eq('scope', scope)
    .order('channel')
  if (scopeId) q = q.eq('scope_id', scopeId)
  else q = q.is('scope_id', null)
  const { data } = await q
  return (data ?? []) as Array<{
    id: string; provider: ProviderKey; channel: string; is_active: boolean; is_default: boolean; from_email: string | null; from_name: string | null; from_phone: string | null; updated_at: string
  }>
}
