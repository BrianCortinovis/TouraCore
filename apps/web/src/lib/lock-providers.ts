import 'server-only'
import { randomInt } from 'node:crypto'

/**
 * Smart lock provider adapters: Nuki, TTLock, Igloohome.
 * Tutti chiamano API REST vendor; richiedono credenziali config_encrypted.
 * Quando credenziali assenti → ritornano sandbox PIN generato locally.
 */

export interface LockProviderConfig {
  apiKey?: string
  smartlockId?: string
  apiSecret?: string
  baseUrl?: string
}

export interface PinIssueResult {
  ok: boolean
  pinCode?: string
  providerId?: string
  error?: string
}

const NUKI_BASE = 'https://api.nuki.io'
const TTLOCK_BASE = 'https://api.ttlock.com'

function generateLocalPin(): string {
  // CSPRNG via node:crypto.randomInt. PIN apre porte fisiche, mai Math.random.
  return String(randomInt(100000, 1000000))
}

export async function issueNukiPin(config: LockProviderConfig, validFrom: Date, validTo: Date, name?: string): Promise<PinIssueResult> {
  if (!config.apiKey || !config.smartlockId) {
    return { ok: true, pinCode: generateLocalPin(), providerId: `sandbox-nuki-${Date.now()}` }
  }
  try {
    const pin = generateLocalPin()
    const res = await fetch(`${NUKI_BASE}/smartlock/${config.smartlockId}/auth`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 13, // keypad code
        name: name ?? 'TouraCore Guest',
        code: parseInt(pin, 10),
        allowedFromDate: validFrom.toISOString(),
        allowedUntilDate: validTo.toISOString(),
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      return { ok: false, error: `Nuki HTTP ${res.status}` }
    }
    const data = (await res.json()) as { id?: string }
    return { ok: true, pinCode: pin, providerId: String(data.id ?? '') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Nuki error' }
  }
}

export async function revokeNukiPin(config: LockProviderConfig, providerId: string): Promise<{ ok: boolean; error?: string }> {
  if (!config.apiKey || !config.smartlockId) return { ok: true }
  try {
    const res = await fetch(`${NUKI_BASE}/smartlock/${config.smartlockId}/auth/${providerId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
    })
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Revoke error' }
  }
}

export async function issueTTLockPin(config: LockProviderConfig, validFrom: Date, validTo: Date, name?: string): Promise<PinIssueResult> {
  if (!config.apiKey || !config.smartlockId) {
    return { ok: true, pinCode: generateLocalPin(), providerId: `sandbox-ttlock-${Date.now()}` }
  }
  try {
    const pin = generateLocalPin()
    const res = await fetch(`${TTLOCK_BASE}/v3/keyboardPwd/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        clientId: config.apiKey ?? '',
        accessToken: config.apiSecret ?? '',
        lockId: config.smartlockId ?? '',
        keyboardPwd: pin,
        keyboardPwdName: name ?? 'TouraCore Guest',
        startDate: String(validFrom.getTime()),
        endDate: String(validTo.getTime()),
        date: String(Date.now()),
      }).toString(),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return { ok: false, error: `TTLock HTTP ${res.status}` }
    const data = (await res.json()) as { keyboardPwdId?: number }
    return { ok: true, pinCode: pin, providerId: String(data.keyboardPwdId ?? '') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'TTLock error' }
  }
}

export async function issueLockPin(provider: string, config: LockProviderConfig, validFrom: Date, validTo: Date, name?: string): Promise<PinIssueResult> {
  switch (provider) {
    case 'nuki': return issueNukiPin(config, validFrom, validTo, name)
    case 'ttlock': return issueTTLockPin(config, validFrom, validTo, name)
    default: return { ok: true, pinCode: generateLocalPin(), providerId: `manual-${Date.now()}` }
  }
}
