import { createServerSupabaseClient } from '@touracore/db'
import type { IntegrationCredentials, IntegrationProvider, IntegrationScope } from './types'

export async function getIntegration(
  scope: IntegrationScope,
  scopeId: string,
  provider: IntegrationProvider,
): Promise<IntegrationCredentials | null> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('scope', scope)
    .eq('scope_id', scopeId)
    .eq('provider', provider)
    .maybeSingle()

  return data as IntegrationCredentials | null
}

/**
 * Risolve credenziali con fallback: entity → tenant → agency
 * Cerca prima nello scope più specifico, poi risale la catena.
 */
export async function resolveIntegration(
  provider: IntegrationProvider,
  entityId: string,
): Promise<IntegrationCredentials | null> {
  const supabase = await createServerSupabaseClient()

  // 1. Scope entity
  const { data: entityCred } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('scope', 'entity')
    .eq('scope_id', entityId)
    .eq('provider', provider)
    .eq('status', 'configured')
    .maybeSingle()

  if (entityCred) return entityCred as IntegrationCredentials

  // 2. Risalgo al tenant via entity
  const { data: entity } = await supabase
    .from('entities')
    .select('tenant_id, tenants(agency_id)')
    .eq('id', entityId)
    .single()

  if (!entity) return null

  const { data: tenantCred } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('scope', 'tenant')
    .eq('scope_id', entity.tenant_id)
    .eq('provider', provider)
    .eq('status', 'configured')
    .maybeSingle()

  if (tenantCred) return tenantCred as IntegrationCredentials

  // 3. Risalgo all'agenzia via tenant
  const tenantData = entity.tenants as unknown as { agency_id: string | null } | null
  const agencyId = tenantData?.agency_id
  if (!agencyId) return null

  const { data: agencyCred } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('scope', 'agency')
    .eq('scope_id', agencyId)
    .eq('provider', provider)
    .eq('status', 'configured')
    .maybeSingle()

  return (agencyCred as IntegrationCredentials) ?? null
}

export async function listIntegrationsForScope(
  scope: IntegrationScope,
  scopeId: string,
): Promise<IntegrationCredentials[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('scope', scope)
    .eq('scope_id', scopeId)
    .order('provider')

  return (data ?? []) as IntegrationCredentials[]
}
