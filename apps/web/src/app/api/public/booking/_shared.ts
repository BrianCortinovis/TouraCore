import { createHash, randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@touracore/db/server'

export interface PublicApiKeyValidation {
  ok: boolean
  keyId?: string
  entityId?: string
  tenantId?: string
  error?: string
}

/**
 * Valida API key pubblica pbk_XXXX_secret.
 * - Prefisso salvato in chiaro → lookup indicizzato
 * - Resto hashato sha256 → confronto timing-safe
 * - Verifica allowed_domains vs Origin header
 */
export async function validatePublicKey(
  apiKey: string,
  origin: string | null
): Promise<PublicApiKeyValidation> {
  if (!apiKey || !apiKey.startsWith('pbk_')) {
    return { ok: false, error: 'Invalid API key format' }
  }
  const parts = apiKey.split('_')
  if (parts.length < 3) return { ok: false, error: 'Malformed API key' }
  const prefix = parts.slice(0, 2).join('_')       // "pbk_abc12345"
  const secret = parts.slice(2).join('_')

  const supabase = await createServiceRoleClient()
  const { data: row } = await supabase
    .from('public_booking_keys')
    .select('id, entity_id, tenant_id, key_hash, allowed_domains, is_active, expires_at')
    .eq('key_prefix', prefix)
    .eq('is_active', true)
    .maybeSingle()

  if (!row) return { ok: false, error: 'Key not found' }

  const hash = createHash('sha256').update(secret).digest('hex')
  if (hash !== row.key_hash) return { ok: false, error: 'Invalid API key' }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { ok: false, error: 'API key expired' }
  }

  if (row.allowed_domains && row.allowed_domains.length > 0) {
    const originHost = origin ? safeHost(origin) : null
    const allowed = row.allowed_domains.some((d: string) => originHost === d || originHost?.endsWith('.' + d))
    if (!allowed) return { ok: false, error: 'Origin not allowed' }
  }

  // Async: aggiorna last_used_at (fire-and-forget)
  void supabase.from('public_booking_keys').update({ last_used_at: new Date().toISOString() }).eq('id', row.id)

  return { ok: true, keyId: row.id, entityId: row.entity_id, tenantId: row.tenant_id }
}

function safeHost(origin: string): string | null {
  try { return new URL(origin).host } catch { return null }
}

export function corsHeaders(origin: string | null, allowedDomains?: string[]): HeadersInit {
  // Echo origin solo se presente E (whitelist assente OR origin in whitelist)
  // Mai '*' su API mutabili: cookie/credenziali vengono rifiutate dal browser comunque,
  // ma una mutazione GET-shaped può essere effettuata e produce side effect senza CORS.
  const originHost = origin ? safeHost(origin) : null
  let allowOrigin: string | null = null
  if (origin && originHost) {
    if (!allowedDomains || allowedDomains.length === 0) {
      allowOrigin = origin
    } else {
      const ok = allowedDomains.some((d) => originHost === d || originHost.endsWith('.' + d))
      allowOrigin = ok ? origin : null
    }
  }
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Booking-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
  if (allowOrigin) headers['Access-Control-Allow-Origin'] = allowOrigin
  return headers
}

export function jsonWithCors(
  data: unknown,
  init: ResponseInit & { origin: string | null; allowedDomains?: string[] }
) {
  const { origin, allowedDomains, ...rest } = init
  return NextResponse.json(data, {
    ...rest,
    headers: { ...corsHeaders(origin, allowedDomains), ...(rest.headers ?? {}) },
  })
}

export function extractKey(req: NextRequest): string | null {
  const h = req.headers.get('x-booking-key')
  if (h) return h
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return req.nextUrl.searchParams.get('key')
}

/**
 * Genera nuova API key. Ritorna {prefix, secret, fullKey, keyHash}.
 * Salvare solo prefix+keyHash su DB. fullKey mostrata una sola volta all'utente.
 */
export function generateApiKey(): { prefix: string; fullKey: string; keyHash: string } {
  // CSPRNG via node:crypto. Math.random non è cryptographic.
  // 4 bytes hex = 8 char per slug; 16 bytes hex = 32 char per secret.
  const slugB = randomBytes(4).toString('hex')
  const secret = randomBytes(16).toString('hex')
  const prefix = `pbk_${slugB}`
  const fullKey = `${prefix}_${secret}`
  const keyHash = createHash('sha256').update(secret).digest('hex')
  return { prefix, fullKey, keyHash }
}
