import { createServerSupabaseClient } from '@touracore/db'
import { saveIntegrationAction, deleteIntegrationAction } from '@touracore/integrations/actions'
import { getProviderDef } from '@touracore/integrations'
import { resolveIntegration } from '@touracore/integrations/queries'
import { decryptCredentials } from '@touracore/integrations/crypto'
import type { IntegrationProvider } from '@touracore/integrations'

export type CredentialProvider = IntegrationProvider

export async function getDecryptedCredentials(
  entityId: string,
  provider: IntegrationProvider,
): Promise<Record<string, unknown> | null> {
  const cred = await resolveIntegration(provider, entityId)
  if (!cred || cred.status !== 'configured') return null
  return decryptCredentials(cred.credentials_encrypted)
}

export async function saveCredentials(
  entityId: string,
  provider: CredentialProvider,
  credentials: never,
): Promise<{ success: boolean; error?: string }> {
  const result = await saveIntegrationAction({
    scope: 'entity',
    scope_id: entityId,
    provider,
    credentials: credentials as Record<string, unknown>,
  })

  return result.success ? { success: true } : { success: false, error: result.error }
}

export async function deleteCredentials(
  entityId: string,
  provider: CredentialProvider,
): Promise<{ success: boolean; error?: string }> {
  const result = await deleteIntegrationAction({
    scope: 'entity',
    scope_id: entityId,
    provider,
  })

  return result.success ? { success: true } : { success: false, error: result.error }
}

export async function validateCredentials(
  _entityId: string,
  provider: CredentialProvider,
  credentials: never,
): Promise<{ valid: boolean; error?: string }> {
  const def = getProviderDef(provider)
  const payload = credentials as Record<string, unknown>
  const missingField = def.fields.find((field) => {
    if (!field.required) return false
    const value = payload[field.key]
    if (value === null || value === undefined) return true
    if (typeof value === 'string') return value.trim().length === 0
    if (Array.isArray(value)) return value.length === 0
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0
    return false
  })

  if (missingField) {
    return { valid: false, error: `Campo obbligatorio mancante: ${missingField.label}` }
  }

  return { valid: true }
}

export async function updateValidationStatus(
  entityId: string,
  provider: CredentialProvider,
  status: string,
): Promise<void> {
  const supabase = await createServerSupabaseClient()
  const normalized = status.toLowerCase()
  const nextStatus = normalized === 'valid' || normalized === 'success'
    ? 'configured'
    : normalized === 'error' || normalized === 'invalid'
      ? 'error'
      : 'configured'

  await supabase
    .from('integration_credentials')
    .update({
      status: nextStatus,
      last_sync_at: nextStatus === 'configured' ? new Date().toISOString() : null,
      last_error: nextStatus === 'error' ? status : null,
      updated_at: new Date().toISOString(),
    })
    .eq('scope', 'entity')
    .eq('scope_id', entityId)
    .eq('provider', provider)
}
