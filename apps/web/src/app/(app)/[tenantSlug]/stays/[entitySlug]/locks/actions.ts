'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { z } from 'zod'
import { encryptConfig, decryptConfig } from '@/lib/integration-crypto'
import { issueLockPin } from '@/lib/lock-providers'

const CreateLockSchema = z.object({
  entityId: z.string().uuid(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
  roomId: z.string().uuid().optional(),
  provider: z.enum(['nuki', 'ttlock', 'igloohome', 'keynest', 'manual']),
  deviceId: z.string().min(1),
  deviceName: z.string().min(1),
  accessMethod: z.enum(['pin', 'app', 'keycard', 'keyfob', 'biometric']).default('pin'),
  config: z.record(z.string(), z.string()).default({}),
})

export async function createSmartLock(input: z.infer<typeof CreateLockSchema>) {
  const parsed = CreateLockSchema.parse(input)
  const supabase = await createServerSupabaseClient()
  const { data: entity } = await supabase.from('entities').select('id').eq('id', parsed.entityId).maybeSingle()
  if (!entity) throw new Error('Entity not found')

  const admin = await createServiceRoleClient()

  const { ciphertext, iv } = encryptConfig(JSON.stringify(parsed.config))

  await admin.from('smart_locks').insert({
    entity_id: parsed.entityId,
    room_id: parsed.roomId ?? null,
    provider: parsed.provider,
    device_id: parsed.deviceId,
    device_name: parsed.deviceName,
    access_method: parsed.accessMethod,
    config_encrypted: ciphertext,
    config_meta: { iv, version: 'aes-256-gcm/v1' },
    active: true,
  })
  revalidatePath(`/${parsed.tenantSlug}/stays/${parsed.entitySlug}/locks`)
}

const IssuePinSchema = z.object({
  lockId: z.string().uuid(),
  reservationId: z.string().uuid().optional(),
  validFrom: z.string(),
  validTo: z.string(),
  guestName: z.string().optional(),
  tenantSlug: z.string(),
  entitySlug: z.string(),
})

export async function issueLockAccessCode(input: z.infer<typeof IssuePinSchema>): Promise<{ ok: boolean; pinCode?: string; error?: string }> {
  const parsed = IssuePinSchema.parse(input)
  const admin = await createServiceRoleClient()

  const { data: lock } = await admin
    .from('smart_locks')
    .select('id, entity_id, provider, config_encrypted, config_meta')
    .eq('id', parsed.lockId)
    .single()
  if (!lock) return { ok: false, error: 'Lock not found' }

  let providerConfig: Record<string, string> = {}
  if (lock.config_encrypted && lock.config_meta) {
    try {
      const meta = lock.config_meta as { iv?: string }
      providerConfig = JSON.parse(decryptConfig(lock.config_encrypted as string, meta.iv ?? ''))
    } catch { /* ignore */ }
  }

  const result = await issueLockPin(
    lock.provider as string,
    {
      apiKey: providerConfig.apiKey,
      apiSecret: providerConfig.apiSecret,
      smartlockId: providerConfig.smartlockId ?? (lock as { device_id?: string }).device_id,
    },
    new Date(parsed.validFrom),
    new Date(parsed.validTo),
    parsed.guestName,
  )

  if (!result.ok) return { ok: false, error: result.error }

  await admin.from('lock_access_codes').insert({
    lock_id: parsed.lockId,
    reservation_id: parsed.reservationId ?? null,
    pin_code: result.pinCode,
    pin_provider_id: result.providerId,
    valid_from: parsed.validFrom,
    valid_to: parsed.validTo,
    status: 'active',
  })

  revalidatePath(`/${parsed.tenantSlug}/stays/${parsed.entitySlug}/locks`)
  return { ok: true, pinCode: result.pinCode }
}

export async function revokeLockAccessCode(codeId: string, tenantSlug: string, entitySlug: string): Promise<void> {
  const admin = await createServiceRoleClient()
  await admin
    .from('lock_access_codes')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', codeId)
  revalidatePath(`/${tenantSlug}/stays/${entitySlug}/locks`)
}

/**
 * Revoca tutti i PIN attivi associati a una prenotazione.
 * Chiamata in checkout/cancel — best-effort: errori vendor non bloccano flusso.
 */
export async function revokePinsForReservation(reservationId: string): Promise<{ revoked: number; failed: number }> {
  const admin = await createServiceRoleClient()
  const { data: codes } = await admin
    .from('lock_access_codes')
    .select('id, lock_id, pin_provider_id, status, smart_locks(provider, config_encrypted, config_meta)')
    .eq('reservation_id', reservationId)
    .eq('status', 'active')

  if (!codes || codes.length === 0) return { revoked: 0, failed: 0 }

  let revoked = 0
  let failed = 0
  for (const c of codes) {
    const lock = c.smart_locks as { provider?: string; config_encrypted?: string; config_meta?: { iv?: string } } | null
    let providerOk = true
    if (lock?.provider === 'nuki' && c.pin_provider_id && lock.config_encrypted && lock.config_meta) {
      try {
        const decrypted = decryptConfig(lock.config_encrypted, lock.config_meta.iv ?? '')
        const config = JSON.parse(decrypted) as { apiKey?: string; smartlockId?: string }
        if (config.apiKey && config.smartlockId) {
          const res = await fetch(`https://api.nuki.io/smartlock/${config.smartlockId}/auth/${c.pin_provider_id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${config.apiKey}` },
            signal: AbortSignal.timeout(10_000),
          })
          if (!res.ok) providerOk = false
        }
      } catch {
        providerOk = false
      }
    }

    await admin
      .from('lock_access_codes')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), notes: providerOk ? null : 'provider revoke failed' })
      .eq('id', c.id)

    if (providerOk) revoked++
    else failed++
  }

  return { revoked, failed }
}
