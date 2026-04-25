import { NextResponse, type NextRequest } from 'next/server'
import { verifyApiKey, recordApiAudit } from '@touracore/partners/server'
import type { PartnerRow, PartnerApiKeyRow } from '@touracore/partners/server'

/**
 * Middleware auth for partner API.
 * Expects headers:
 *   X-API-Key: <key_id> (required)
 *   X-API-Secret: <secret> (required if HMAC not used)
 *   X-Signature: <hmac_sha256> (optional, replaces secret for stronger security)
 *   X-Timestamp: <unix_seconds> (required if X-Signature used)
 *   Idempotency-Key: <uuid> (optional, for POST endpoints)
 *
 * Returns ctx { partner, apiKey, ip } or error JSON.
 */
export interface ApiContext {
  partner: PartnerRow
  apiKey: PartnerApiKeyRow
  ip: string | null
  userAgent: string | null
  idempotencyKey: string | null
}

export async function authenticate(
  req: NextRequest,
  requiredScope: string,
): Promise<{ ctx: ApiContext; error: null } | { ctx: null; error: NextResponse }> {
  const startedAt = Date.now()
  const keyId = req.headers.get('x-api-key')
  const secret = req.headers.get('x-api-secret')
  const signature = req.headers.get('x-signature')
  const timestamp = req.headers.get('x-timestamp')
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent')
  const idempotencyKey = req.headers.get('idempotency-key')

  if (!keyId) {
    return {
      ctx: null,
      error: apiError(401, 'missing_api_key', 'Header X-API-Key required'),
    }
  }

  // Determine secret for verify
  const secretToVerify = secret
  if (!secretToVerify && signature && timestamp) {
    // HMAC flow: secret is verified via HMAC of body, not passed directly.
    // In this case client uses X-Signature + X-Timestamp. We still need
    // to lookup by keyId and verify HMAC against stored bcrypt.
    // Note: bcrypt fundamentally incompatible with HMAC verify against hash.
    // Two strategies:
    //  A) Keep secret in plaintext (less safe but standard in many APIs)
    //  B) Separate HMAC signing key (stored in plaintext if small) vs access secret (bcrypt)
    // MVP: we accept X-API-Secret plaintext over HTTPS (like Stripe). HMAC optional Phase 2.
    return {
      ctx: null,
      error: apiError(
        501,
        'hmac_not_implemented',
        'HMAC signature flow Phase 2. Use X-API-Key + X-API-Secret headers over HTTPS.',
      ),
    }
  }

  if (!secretToVerify) {
    return {
      ctx: null,
      error: apiError(401, 'missing_secret', 'Header X-API-Secret required'),
    }
  }

  const verified = await verifyApiKey({ keyId, secret: secretToVerify, scope: requiredScope })
  if (!verified.valid) {
    await recordApiAudit({
      partnerId: verified.partner?.id ?? 'unknown',
      tenantId: verified.partner?.tenant_id ?? 'unknown',
      apiKeyId: verified.key?.id ?? 'unknown',
      endpoint: req.nextUrl.pathname,
      method: req.method,
      httpStatus: 401,
      ip: ip ?? undefined,
      userAgent: userAgent ?? undefined,
      errorCode: verified.error,
      durationMs: Date.now() - startedAt,
    }).catch(() => null)
    return {
      ctx: null,
      error: apiError(
        verified.error === 'scope_denied' ? 403 : 401,
        verified.error ?? 'unauthorized',
        'Authentication failed',
      ),
    }
  }

  // IP allowlist check
  if (verified.key && verified.key.ip_allowlist.length > 0 && ip) {
    if (!verified.key.ip_allowlist.some((allowed) => allowed === ip)) {
      await recordApiAudit({
        partnerId: verified.partner!.id,
        tenantId: verified.partner!.tenant_id,
        apiKeyId: verified.key.id,
        endpoint: req.nextUrl.pathname,
        method: req.method,
        httpStatus: 403,
        ip,
        userAgent: userAgent ?? undefined,
        errorCode: 'ip_not_allowed',
      }).catch(() => null)
      return { ctx: null, error: apiError(403, 'ip_not_allowed', 'IP not in allowlist') }
    }
  }

  return {
    ctx: {
      partner: verified.partner!,
      apiKey: verified.key!,
      ip,
      userAgent,
      idempotencyKey,
    },
    error: null,
  }
}

export function apiError(status: number, code: string, message: string, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      error: { code, message, details },
      request_id: crypto.randomUUID(),
    },
    { status },
  )
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      data,
      request_id: crypto.randomUUID(),
    },
    { status },
  )
}

export async function finalizeAudit(
  ctx: ApiContext,
  req: NextRequest,
  httpStatus: number,
  durationMs: number,
  errorCode?: string,
): Promise<void> {
  await recordApiAudit({
    partnerId: ctx.partner.id,
    tenantId: ctx.partner.tenant_id,
    apiKeyId: ctx.apiKey.id,
    endpoint: req.nextUrl.pathname,
    method: req.method,
    httpStatus,
    ip: ctx.ip ?? undefined,
    userAgent: ctx.userAgent ?? undefined,
    durationMs,
    errorCode,
  }).catch(() => null)
}
