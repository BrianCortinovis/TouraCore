'use server'

import { createServerSupabaseClient } from '@touracore/db'
import { integrationCredentialsSchema } from './registry'
import { encryptCredentials, decryptCredentials } from './crypto'
import { maskPassword } from '@touracore/db/crypto'
import { getIntegration } from './queries'
import type { IntegrationProvider, IntegrationScope, IntegrationStatus } from './types'

export interface ActionResult {
  success: boolean
  error?: string
  data?: Record<string, unknown>
}

export async function saveIntegrationAction(input: {
  scope: IntegrationScope
  scope_id: string
  provider: IntegrationProvider
  credentials: Record<string, unknown>
  config?: Record<string, unknown>
}): Promise<ActionResult> {
  const parsed = integrationCredentialsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Dati non validi' }
  }

  try {
    const supabase = await createServerSupabaseClient()
    const encrypted = encryptCredentials(parsed.data.credentials)
    const hasCredentials = Object.values(parsed.data.credentials).some(
      (v) => typeof v === 'string' && v.length > 0,
    )
    const status: IntegrationStatus = hasCredentials ? 'configured' : 'not_configured'

    const { error } = await supabase
      .from('integration_credentials')
      .upsert(
        {
          scope: parsed.data.scope,
          scope_id: parsed.data.scope_id,
          provider: parsed.data.provider,
          credentials_encrypted: encrypted,
          config: parsed.data.config ?? {},
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'scope,scope_id,provider' },
      )

    if (error) return { success: false, error: error.message }
    return { success: true, data: { status } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore di salvataggio' }
  }
}

export async function deleteIntegrationAction(input: {
  scope: IntegrationScope
  scope_id: string
  provider: IntegrationProvider
}): Promise<ActionResult> {
  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase
      .from('integration_credentials')
      .delete()
      .eq('scope', input.scope)
      .eq('scope_id', input.scope_id)
      .eq('provider', input.provider)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore di eliminazione' }
  }
}

export async function testConnectionAction(input: {
  scope: IntegrationScope
  scope_id: string
  provider: IntegrationProvider
}): Promise<ActionResult> {
  const existing = await getIntegration(input.scope, input.scope_id, input.provider)

  if (!existing || existing.status !== 'configured') {
    return {
      success: false,
      error: 'Integrazione non configurata. Salva le credenziali prima di testare.',
    }
  }

  // Stub: le API reali non sono ancora disponibili
  return {
    success: true,
    data: {
      ok: true,
      skipped: true,
      reason: 'Configurato correttamente. Verifica disponibile dopo attivazione API.',
    },
  }
}

export async function loadIntegrationAction(input: {
  scope: IntegrationScope
  scope_id: string
  provider: IntegrationProvider
}): Promise<ActionResult> {
  try {
    const existing = await getIntegration(input.scope, input.scope_id, input.provider)

    if (!existing) {
      return { success: true, data: { credentials: null, status: 'not_configured' } }
    }

    // Decifra credenziali e maschera i campi password
    const decrypted = decryptCredentials(existing.credentials_encrypted)
    const masked: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(decrypted)) {
      if (key.includes('key') || key.includes('token') || key.includes('secret')) {
        masked[key] = maskPassword(typeof value === 'string' ? value : null)
      } else {
        masked[key] = value
      }
    }

    return {
      success: true,
      data: {
        credentials: masked,
        config: existing.config,
        status: existing.status,
        last_sync_at: existing.last_sync_at,
        last_error: existing.last_error,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Errore di caricamento' }
  }
}
