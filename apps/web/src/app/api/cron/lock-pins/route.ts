import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from "@/lib/cron-auth"
import { randomInt } from 'node:crypto'
import { createServiceRoleClient } from '@touracore/db/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorize(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  if (request.headers.get('x-vercel-cron')) return true
  return verifyCronSecret(request)
}

function generatePin(): string {
  // CSPRNG via node:crypto.randomInt. PIN apre porte fisiche, mai Math.random.
  return String(randomInt(100000, 1000000))
}

interface LockProviderAdapter {
  name: string
  createPin(deviceId: string, pin: string, validFrom: Date, validTo: Date, creds: Record<string, unknown>): Promise<{ providerPinId: string } | null>
  revokePin(providerPinId: string, creds: Record<string, unknown>): Promise<void>
}

const nukiAdapter: LockProviderAdapter = {
  name: 'nuki',
  async createPin(_deviceId, _pin, _from, _to, _creds) { return null },
  async revokePin(_id, _creds) {},
}
const ttlockAdapter: LockProviderAdapter = {
  name: 'ttlock',
  async createPin(_deviceId, _pin, _from, _to, _creds) { return null },
  async revokePin(_id, _creds) {},
}
const igloohomeAdapter: LockProviderAdapter = {
  name: 'igloohome',
  async createPin(_deviceId, _pin, _from, _to, _creds) { return null },
  async revokePin(_id, _creds) {},
}

const lockAdapters: Record<string, LockProviderAdapter> = {
  nuki: nukiAdapter,
  ttlock: ttlockAdapter,
  igloohome: igloohomeAdapter,
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createServiceRoleClient()
  const nowIso = new Date().toISOString()
  const tomorrowIso = new Date(Date.now() + 86400_000).toISOString()

  // Generate PINs for upcoming reservations (check-in within 24h, no PIN yet)
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, entity_id, room_id, check_in, check_out, actual_check_in')
    .in('status', ['confirmed', 'checked_in'])
    .gte('check_in', nowIso.slice(0, 10))
    .lte('check_in', tomorrowIso.slice(0, 10))

  let created = 0
  for (const r of reservations ?? []) {
    if (!r.room_id) continue
    const { data: lock } = await supabase
      .from('smart_locks')
      .select('id, provider, provider_device_id')
      .eq('entity_id', r.entity_id)
      .eq('room_id', r.room_id)
      .eq('is_active', true)
      .maybeSingle()
    if (!lock) continue

    const { data: existingPin } = await supabase
      .from('lock_pins')
      .select('id')
      .eq('reservation_id', r.id)
      .eq('smart_lock_id', lock.id)
      .is('revoked_at', null)
      .maybeSingle()
    if (existingPin) continue

    const pin = generatePin()
    const validFrom = new Date(r.check_in + 'T12:00:00')
    const validTo = new Date(r.check_out + 'T12:00:00')
    const adapter = lockAdapters[lock.provider]
    let providerPinId: string | null = null
    if (adapter) {
      const { data: smartLockFull } = await supabase
        .from('smart_locks')
        .select('metadata')
        .eq('id', lock.id)
        .single()
      const creds = (smartLockFull?.metadata as Record<string, unknown>) ?? {}
      const result = await adapter.createPin(lock.provider_device_id, pin, validFrom, validTo, creds)
      providerPinId = result?.providerPinId ?? null
    }

    await supabase.from('lock_pins').insert({
      smart_lock_id: lock.id,
      reservation_id: r.id,
      pin_code: pin,
      valid_from: validFrom.toISOString(),
      valid_to: validTo.toISOString(),
      provider_pin_id: providerPinId,
    })
    created++
  }

  // Revoke expired PINs
  const { data: expiredPins } = await supabase
    .from('lock_pins')
    .select('id, provider_pin_id, smart_lock_id')
    .lt('valid_to', nowIso)
    .is('revoked_at', null)

  let revoked = 0
  for (const p of expiredPins ?? []) {
    if (p.provider_pin_id) {
      const { data: lock } = await supabase
        .from('smart_locks')
        .select('provider, metadata')
        .eq('id', p.smart_lock_id)
        .single()
      const adapter = lock ? lockAdapters[lock.provider] : null
      if (adapter && lock) {
        try {
          await adapter.revokePin(p.provider_pin_id, (lock.metadata as Record<string, unknown>) ?? {})
        } catch { /* swallow */ }
      }
    }
    await supabase.from('lock_pins').update({ revoked_at: nowIso }).eq('id', p.id)
    revoked++
  }

  return NextResponse.json({ ok: true, pins_created: created, pins_revoked: revoked })
}
