import { getDecryptedCredentials } from './credentials'

export async function syncAvailabilityForOrg(
  entityId: string,
): Promise<void> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) return
  // Stub: API Octorate non ancora collegata — skip silenzioso
}

export async function syncRatesForOrg(
  entityId: string,
  _options?: { ratePlanId?: string },
): Promise<{ success: boolean; synced_count?: number; errors?: string[] } | null> {
  const creds = await getDecryptedCredentials(entityId, 'octorate')
  if (!creds) return null
  // Stub: API Octorate non ancora collegata
  return { success: true, synced_count: 0 }
}
