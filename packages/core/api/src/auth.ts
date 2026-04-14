import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export interface ApiKeyContext {
  tenantId: string
  keyId: string
  scopes: string[]
}

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export async function authenticateApiKey(authHeader: string | null): Promise<ApiKeyContext | null> {
  if (!authHeader?.startsWith('Bearer ')) return null

  const key = authHeader.slice(7)
  if (!key || key.length < 10) return null

  const prefix = key.slice(0, 8)
  const keyHash = hashKey(key)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, tenant_id, scopes, is_active, expires_at')
    .eq('key_prefix', prefix)
    .eq('key_hash', keyHash)
    .single()

  if (error || !data || !data.is_active) return null

  if (data.expires_at && new Date(data.expires_at) < new Date()) return null

  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)

  return {
    tenantId: data.tenant_id,
    keyId: data.id,
    scopes: data.scopes ?? [],
  }
}
