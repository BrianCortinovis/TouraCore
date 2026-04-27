import { randomBytes, createHash, createHmac } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db'
import type {
  PartnerRow,
  PartnerLinkRow,
  PartnerCommissionRow,
  PartnerApiKeyRow,
  PartnerVertical,
  ReservationTable,
} from './index'

export * from './index'

// =============================================================================
// Partner CRUD
// =============================================================================

export async function listPartners(params: {
  tenantId: string
  status?: string
}): Promise<PartnerRow[]> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('partners')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
  if (params.status) q = q.eq('status', params.status)
  const { data } = await q
  return (data as PartnerRow[] | null) ?? []
}

export async function getPartnerById(params: {
  id: string
  tenantId: string
}): Promise<PartnerRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('partners')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()
  return (data as PartnerRow | null) ?? null
}

export async function getPartnerBySlug(params: {
  slug: string
  tenantId: string
  useServiceRole?: boolean
}): Promise<PartnerRow | null> {
  const supabase = params.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { data } = await supabase
    .from('partners')
    .select('*')
    .eq('slug', params.slug)
    .eq('tenant_id', params.tenantId)
    .maybeSingle()
  return (data as PartnerRow | null) ?? null
}

export async function createPartner(params: {
  tenantId: string
  name: string
  slug: string
  kind: string
  contactEmail: string
  commissionPctDefault?: number
  commissionPerVertical?: Record<string, number>
  companyName?: string
  contactPhone?: string
  contactPerson?: string
  country?: string
  notes?: string
}): Promise<PartnerRow | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('partners')
    .insert({
      tenant_id: params.tenantId,
      slug: params.slug,
      name: params.name,
      kind: params.kind,
      contact_email: params.contactEmail.toLowerCase(),
      contact_phone: params.contactPhone ?? null,
      contact_person: params.contactPerson ?? null,
      company_name: params.companyName ?? null,
      country: params.country ?? 'IT',
      commission_pct_default: params.commissionPctDefault ?? 10,
      commission_per_vertical: params.commissionPerVertical ?? {},
      notes_internal: params.notes ?? null,
      status: 'pending',
    })
    .select('*')
    .maybeSingle()
  return (data as PartnerRow | null) ?? null
}

export async function updatePartner(params: {
  id: string
  tenantId: string
  patch: Partial<PartnerRow>
}): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('partners')
    .update(params.patch)
    .eq('id', params.id)
    .eq('tenant_id', params.tenantId)
  return !error
}

// =============================================================================
// Links
// =============================================================================

export async function listPartnerLinks(params: {
  partnerId?: string
  tenantId: string
}): Promise<PartnerLinkRow[]> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('partner_links')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
  if (params.partnerId) q = q.eq('partner_id', params.partnerId)
  const { data } = await q
  return (data as PartnerLinkRow[] | null) ?? []
}

export function generateReferralCode(partnerSlug: string): string {
  const slug = partnerSlug.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  const suffix = randomBytes(3).toString('hex').toUpperCase()
  return `${slug}-${suffix}`
}

/**
 * Pure: calcola commission amount dato pct + booking amount.
 * Round a 2 decimali (cents). Esposto separato per testabilità + reuse cron.
 */
export function computeCommissionAmount(bookingAmount: number, pct: number): number {
  return Math.round((bookingAmount * Number(pct)) / 100 * 100) / 100
}

/**
 * Pure: applica precedenza link override → per_vertical → default.
 */
export function resolveCommissionPct(input: {
  linkOverride?: number | null
  perVertical?: Partial<Record<string, number>>
  vertical: string
  defaultPct: number
}): number {
  if (input.linkOverride != null) return Number(input.linkOverride)
  const v = input.perVertical?.[input.vertical]
  if (v != null) return Number(v)
  return Number(input.defaultPct)
}

export async function createPartnerLink(params: {
  partnerId: string
  tenantId: string
  label?: string
  channel?: string
  targetEntityId?: string
  targetUrl?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  commissionPctOverride?: number
  associatedCreditInstrumentId?: string
  validUntil?: string
}): Promise<PartnerLinkRow | null> {
  const supabase = await createServerSupabaseClient()
  // Fetch partner slug for code generation
  const { data: partner } = await supabase
    .from('partners')
    .select('slug')
    .eq('id', params.partnerId)
    .maybeSingle()
  if (!partner) return null

  const code = generateReferralCode((partner as { slug: string }).slug)

  const { data } = await supabase
    .from('partner_links')
    .insert({
      partner_id: params.partnerId,
      tenant_id: params.tenantId,
      code,
      label: params.label ?? null,
      channel: params.channel ?? 'url',
      target_entity_id: params.targetEntityId ?? null,
      target_url: params.targetUrl ?? null,
      utm_source: params.utmSource ?? null,
      utm_medium: params.utmMedium ?? null,
      utm_campaign: params.utmCampaign ?? null,
      commission_pct_override: params.commissionPctOverride ?? null,
      associated_credit_instrument_id: params.associatedCreditInstrumentId ?? null,
      valid_until: params.validUntil ?? null,
      active: true,
    })
    .select('*')
    .maybeSingle()
  return (data as PartnerLinkRow | null) ?? null
}

export async function resolvePartnerLinkByCode(params: {
  code: string
  useServiceRole?: boolean
}): Promise<{
  link: PartnerLinkRow
  partner: PartnerRow
} | null> {
  const supabase = params.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()
  const { data: link } = await supabase
    .from('partner_links')
    .select('*')
    .eq('code', params.code.toUpperCase())
    .eq('active', true)
    .maybeSingle()
  if (!link) return null
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', (link as { partner_id: string }).partner_id)
    .maybeSingle()
  if (!partner) return null
  return { link: link as PartnerLinkRow, partner: partner as PartnerRow }
}

export async function recordClick(params: { code: string }): Promise<string | null> {
  const supabase = await createServiceRoleClient()
  const { data } = await supabase.rpc('record_partner_link_click', { p_code: params.code })
  return (data as string | null) ?? null
}

// =============================================================================
// Commission
// =============================================================================

export interface AttributeCommissionInput {
  tenantId: string
  partnerCode: string // partner_link.code
  reservationId: string
  reservationTable: ReservationTable
  vertical: PartnerVertical
  bookingAmount: number
  currency?: string
  sourceType: 'url' | 'embed' | 'api'
  idempotencyKey?: string
  useServiceRole?: boolean
}

/**
 * Attribute commission to partner after a booking is confirmed.
 * Idempotent via (reservation_id + reservation_table + partner_id) UNIQUE.
 * Safe to call multiple times — returns existing row if already attributed.
 */
export async function attributeCommission(
  input: AttributeCommissionInput,
): Promise<{ success: boolean; commission?: PartnerCommissionRow; error?: string }> {
  const supabase = input.useServiceRole
    ? await createServiceRoleClient()
    : await createServerSupabaseClient()

  const resolved = await resolvePartnerLinkByCode({
    code: input.partnerCode,
    useServiceRole: true,
  })
  if (!resolved) return { success: false, error: 'invalid_partner_code' }
  const { link, partner } = resolved

  if (partner.status !== 'active') {
    return { success: false, error: `partner_${partner.status}` }
  }

  // Commission % precedenza: link override > per_vertical > default
  const pct = resolveCommissionPct({
    linkOverride: link.commission_pct_override,
    perVertical: partner.commission_per_vertical,
    vertical: input.vertical,
    defaultPct: partner.commission_pct_default,
  })

  const commissionAmount = computeCommissionAmount(input.bookingAmount, pct)

  const idemKey = input.idempotencyKey ?? `${input.reservationTable}:${input.reservationId}:${partner.id}`

  const { data, error } = await supabase
    .from('partner_commissions')
    .insert({
      partner_id: partner.id,
      tenant_id: input.tenantId,
      partner_link_id: link.id,
      source_type: input.sourceType,
      reservation_id: input.reservationId,
      reservation_table: input.reservationTable,
      vertical: input.vertical,
      booking_amount: input.bookingAmount,
      commission_pct: pct,
      commission_amount: commissionAmount,
      currency: input.currency ?? 'EUR',
      status: 'earned',
      earned_at: new Date().toISOString(),
      idempotency_key: idemKey,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    // UNIQUE violation = already attributed, fetch existing
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('partner_commissions')
        .select('*')
        .eq('reservation_id', input.reservationId)
        .eq('reservation_table', input.reservationTable)
        .eq('partner_id', partner.id)
        .maybeSingle()
      return { success: true, commission: existing as PartnerCommissionRow }
    }
    return { success: false, error: error.message }
  }

  // Increment link conversion counter
  await supabase
    .from('partner_links')
    .update({
      conversion_count: (link.conversion_count ?? 0) + 1,
      last_conversion_at: new Date().toISOString(),
    })
    .eq('id', link.id)

  return { success: true, commission: data as PartnerCommissionRow }
}

export async function listPartnerCommissions(params: {
  tenantId: string
  partnerId?: string
  status?: string
  limit?: number
}): Promise<PartnerCommissionRow[]> {
  const supabase = await createServerSupabaseClient()
  let q = supabase
    .from('partner_commissions')
    .select('*')
    .eq('tenant_id', params.tenantId)
    .order('created_at', { ascending: false })
  if (params.partnerId) q = q.eq('partner_id', params.partnerId)
  if (params.status) q = q.eq('status', params.status)
  q = q.limit(params.limit ?? 100)
  const { data } = await q
  return (data as PartnerCommissionRow[] | null) ?? []
}

export interface PartnerStats {
  totalClicks: number
  totalConversions: number
  conversionRate: number
  totalBookingAmount: number
  totalCommissionPending: number
  totalCommissionPaid: number
  commissionCount: number
}

export async function getPartnerStats(params: {
  partnerId: string
  tenantId: string
}): Promise<PartnerStats> {
  const supabase = await createServerSupabaseClient()
  const [linksRes, commRes] = await Promise.all([
    supabase
      .from('partner_links')
      .select('click_count, conversion_count')
      .eq('partner_id', params.partnerId)
      .eq('tenant_id', params.tenantId),
    supabase
      .from('partner_commissions')
      .select('status, booking_amount, commission_amount')
      .eq('partner_id', params.partnerId)
      .eq('tenant_id', params.tenantId),
  ])

  const stats: PartnerStats = {
    totalClicks: 0,
    totalConversions: 0,
    conversionRate: 0,
    totalBookingAmount: 0,
    totalCommissionPending: 0,
    totalCommissionPaid: 0,
    commissionCount: 0,
  }

  for (const l of linksRes.data ?? []) {
    stats.totalClicks += Number(l.click_count) || 0
    stats.totalConversions += Number(l.conversion_count) || 0
  }
  for (const c of commRes.data ?? []) {
    stats.totalBookingAmount += Number(c.booking_amount) || 0
    stats.commissionCount++
    if (c.status === 'paid') {
      stats.totalCommissionPaid += Number(c.commission_amount) || 0
    } else if (['earned', 'approved', 'pending'].includes(c.status)) {
      stats.totalCommissionPending += Number(c.commission_amount) || 0
    }
  }
  stats.conversionRate =
    stats.totalClicks > 0 ? Math.round((stats.totalConversions / stats.totalClicks) * 1000) / 10 : 0

  return stats
}

// =============================================================================
// API Keys
// =============================================================================

const KEY_PREFIX_LIVE = 'tck_live_'
const KEY_PREFIX_SANDBOX = 'tck_sandbox_'

export interface CreatedApiKey {
  id: string
  keyId: string
  secret: string // plaintext — MAI recuperabile dopo
  secretLast4: string
  scope: string[]
  environment: 'live' | 'sandbox'
}

export async function createApiKey(params: {
  partnerId: string
  tenantId: string
  name: string
  scope: string[]
  environment?: 'live' | 'sandbox'
  rateLimitPerMinute?: number
  ipAllowlist?: string[]
  expiresAt?: string
  createdByUserId?: string
}): Promise<CreatedApiKey | null> {
  const env = params.environment ?? 'live'
  const prefix = env === 'live' ? KEY_PREFIX_LIVE : KEY_PREFIX_SANDBOX
  const keyIdSuffix = randomBytes(12).toString('hex')
  const keyId = prefix + keyIdSuffix

  const secret = randomBytes(32).toString('base64url')
  const secretHash = await bcrypt.hash(secret, 10)
  const secretLast4 = secret.slice(-4)

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('partner_api_keys')
    .insert({
      partner_id: params.partnerId,
      tenant_id: params.tenantId,
      key_id: keyId,
      secret_hash: secretHash,
      secret_last4: secretLast4,
      name: params.name,
      scope: params.scope,
      environment: env,
      rate_limit_per_minute: params.rateLimitPerMinute ?? 100,
      ip_allowlist: params.ipAllowlist ?? [],
      expires_at: params.expiresAt ?? null,
      created_by_user_id: params.createdByUserId ?? null,
      active: true,
    })
    .select('id')
    .maybeSingle()
  if (!data) return null

  return {
    id: (data as { id: string }).id,
    keyId,
    secret,
    secretLast4,
    scope: params.scope,
    environment: env,
  }
}

export async function verifyApiKey(params: {
  keyId: string
  secret: string
  scope?: string
}): Promise<{
  valid: boolean
  key?: PartnerApiKeyRow
  partner?: PartnerRow
  error?: string
}> {
  const supabase = await createServiceRoleClient()
  const { data: key } = await supabase
    .from('partner_api_keys')
    .select('*')
    .eq('key_id', params.keyId)
    .eq('active', true)
    .maybeSingle()
  if (!key) return { valid: false, error: 'invalid_key' }

  const k = key as PartnerApiKeyRow
  if (k.revoked_at) return { valid: false, error: 'revoked' }
  if (k.expires_at && new Date(k.expires_at) < new Date()) return { valid: false, error: 'expired' }

  const ok = await bcrypt.compare(params.secret, k.secret_hash)
  if (!ok) return { valid: false, error: 'invalid_secret' }

  if (params.scope && !k.scope.includes(params.scope)) {
    return { valid: false, key: k, error: 'scope_denied' }
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('id', k.partner_id)
    .maybeSingle()
  if (!partner || (partner as PartnerRow).status !== 'active') {
    return { valid: false, error: 'partner_inactive' }
  }

  // Touch last_used
  await supabase
    .from('partner_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', k.id)

  return { valid: true, key: k, partner: partner as PartnerRow }
}

/**
 * HMAC-SHA256 signature verification.
 * Client includes X-Signature header: hmac_sha256(secret, `${timestamp}.${body}`)
 * Replay protection: timestamp must be within 5 minutes.
 */
export function verifyHmacSignature(params: {
  secret: string
  timestamp: string
  body: string
  signature: string
  toleranceSeconds?: number
}): boolean {
  const tsNum = parseInt(params.timestamp, 10)
  if (isNaN(tsNum)) return false
  const nowSec = Math.floor(Date.now() / 1000)
  const tolerance = params.toleranceSeconds ?? 300
  if (Math.abs(nowSec - tsNum) > tolerance) return false

  const expected = createHmac('sha256', params.secret)
    .update(`${params.timestamp}.${params.body}`)
    .digest('hex')
  // Constant-time comparison
  if (expected.length !== params.signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ params.signature.charCodeAt(i)
  }
  return diff === 0
}

export async function recordApiAudit(params: {
  partnerId: string
  tenantId: string
  apiKeyId: string
  endpoint: string
  method: string
  httpStatus: number
  ip?: string
  userAgent?: string
  durationMs?: number
  errorCode?: string
  requestId?: string
}): Promise<void> {
  const supabase = await createServiceRoleClient()
  await supabase.from('partner_api_audit').insert({
    partner_id: params.partnerId,
    tenant_id: params.tenantId,
    api_key_id: params.apiKeyId,
    endpoint: params.endpoint,
    method: params.method,
    http_status: params.httpStatus,
    ip: params.ip ?? null,
    user_agent: params.userAgent ?? null,
    duration_ms: params.durationMs ?? null,
    error_code: params.errorCode ?? null,
    request_id: params.requestId ?? null,
  })
}
