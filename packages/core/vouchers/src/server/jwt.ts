import { SignJWT, jwtVerify } from 'jose'

/**
 * Sign JWT for gift card delivery links (recipient email receives URL with token).
 * Token contains only instrument_id + tenant_id — code is NEVER in JWT or URL.
 * Recipient shows landing page with balance + design + "redeem" QR.
 *
 * Secret from env VOUCHER_JWT_SECRET (must be set in production).
 */

const DEFAULT_ISSUER = 'touracore-vouchers'

function getSecret(): Uint8Array {
  let raw = process.env.VOUCHER_JWT_SECRET
  // Fallback: deriva da SUPABASE_SERVICE_ROLE_KEY se VOUCHER_JWT_SECRET non settato.
  // Production SHOULD set a dedicated secret — questo fallback garantisce deploy senza manual env setup.
  if (!raw) {
    const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (fallback && fallback.length >= 32) {
      raw = `touracore-vouchers-${fallback}`
    }
  }
  if (!raw) {
    throw new Error('VOUCHER_JWT_SECRET env required (or SUPABASE_SERVICE_ROLE_KEY fallback)')
  }
  if (raw.length < 32) {
    throw new Error('VOUCHER_JWT_SECRET must be at least 32 chars')
  }
  return new TextEncoder().encode(raw)
}

export interface VoucherJwtPayload {
  instrumentId: string
  tenantId: string
  kind: string
  purpose: 'delivery' | 'view' | 'redeem'
}

export async function signVoucherJwt(
  payload: VoucherJwtPayload,
  opts: { expiresIn?: string } = {},
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(DEFAULT_ISSUER)
    .setExpirationTime(opts.expiresIn ?? '365d')
    .sign(getSecret())
}

export async function verifyVoucherJwt(
  token: string,
): Promise<VoucherJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: DEFAULT_ISSUER })
    return {
      instrumentId: payload.instrumentId as string,
      tenantId: payload.tenantId as string,
      kind: payload.kind as string,
      purpose: payload.purpose as VoucherJwtPayload['purpose'],
    }
  } catch {
    return null
  }
}
