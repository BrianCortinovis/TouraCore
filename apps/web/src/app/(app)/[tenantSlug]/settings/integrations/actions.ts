'use server'

import { createServerSupabaseClient, createServiceRoleClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import {
  saveIntegrationAction,
  deleteIntegrationAction,
  testConnectionAction,
  loadIntegrationAction,
} from '@touracore/integrations/actions'
import type { IntegrationProvider } from '@touracore/integrations'

async function resolveTenantId(tenantSlug: string): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Non autenticato')

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', tenantSlug)
    .single()
  if (!data) throw new Error('Tenant non trovato')

  // Membership check
  const admin = await createServiceRoleClient()
  const { data: pa } = await admin.from('platform_admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!pa) {
    const { data: m } = await admin.from('memberships').select('id').eq('user_id', user.id).eq('tenant_id', data.id).eq('is_active', true).maybeSingle()
    if (!m) throw new Error('Permessi insufficienti')
  }

  return data.id
}

export async function saveTenantIntegration(
  tenantSlug: string,
  provider: IntegrationProvider,
  credentials: Record<string, unknown>,
  config?: Record<string, unknown>,
) {
  const tenantId = await resolveTenantId(tenantSlug)
  return saveIntegrationAction({
    scope: 'tenant',
    scope_id: tenantId,
    provider,
    credentials,
    config,
  })
}

export async function loadTenantIntegration(
  tenantSlug: string,
  provider: IntegrationProvider,
) {
  const tenantId = await resolveTenantId(tenantSlug)
  return loadIntegrationAction({
    scope: 'tenant',
    scope_id: tenantId,
    provider,
  })
}

export async function testTenantIntegration(
  tenantSlug: string,
  provider: IntegrationProvider,
) {
  const tenantId = await resolveTenantId(tenantSlug)
  return testConnectionAction({
    scope: 'tenant',
    scope_id: tenantId,
    provider,
  })
}

export async function deleteTenantIntegration(
  tenantSlug: string,
  provider: IntegrationProvider,
) {
  const tenantId = await resolveTenantId(tenantSlug)
  return deleteIntegrationAction({
    scope: 'tenant',
    scope_id: tenantId,
    provider,
  })
}
