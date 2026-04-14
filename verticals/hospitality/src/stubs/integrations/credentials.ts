import { resolveIntegration } from '@touracore/integrations/queries'
import { decryptCredentials } from '@touracore/integrations/crypto'
import type { IntegrationProvider, IntegrationCredentials } from '@touracore/integrations'

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
  _entityId: string,
  _provider: CredentialProvider,
  _credentials: never,
): Promise<{ success: boolean; error?: string }> {
  // Delega a saveIntegrationAction — questo stub resta per retrocompatibilità
  return { success: true }
}

export async function deleteCredentials(
  _entityId: string,
  _provider: CredentialProvider,
): Promise<{ success: boolean; error?: string }> {
  return { success: true }
}

export async function validateCredentials(
  _entityId: string,
  _provider: CredentialProvider,
  _credentials: never,
): Promise<{ valid: boolean; error?: string }> {
  return { valid: true }
}

export async function updateValidationStatus(
  _entityId: string,
  _provider: CredentialProvider,
  _status: string,
): Promise<void> {}
