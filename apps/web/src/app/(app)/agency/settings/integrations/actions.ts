'use server'

import { createServerSupabaseClient } from '@touracore/db/server'
import { getCurrentUser } from '@touracore/auth'
import {
  saveIntegrationAction,
  deleteIntegrationAction,
  testConnectionAction,
  loadIntegrationAction,
} from '@touracore/integrations/actions'
import type { IntegrationProvider } from '@touracore/integrations'

async function resolveAgencyId(): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const user = await getCurrentUser()
  if (!user) throw new Error('Non autenticato')

  const { data: membership } = await supabase
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!membership) throw new Error('Nessuna agenzia associata')
  return membership.agency_id
}

export async function saveAgencyIntegration(
  provider: IntegrationProvider,
  credentials: Record<string, unknown>,
  config?: Record<string, unknown>,
) {
  const agencyId = await resolveAgencyId()
  return saveIntegrationAction({
    scope: 'agency',
    scope_id: agencyId,
    provider,
    credentials,
    config,
  })
}

export async function loadAgencyIntegration(provider: IntegrationProvider) {
  const agencyId = await resolveAgencyId()
  return loadIntegrationAction({
    scope: 'agency',
    scope_id: agencyId,
    provider,
  })
}

export async function testAgencyIntegration(provider: IntegrationProvider) {
  const agencyId = await resolveAgencyId()
  return testConnectionAction({
    scope: 'agency',
    scope_id: agencyId,
    provider,
  })
}

export async function deleteAgencyIntegration(provider: IntegrationProvider) {
  const agencyId = await resolveAgencyId()
  return deleteIntegrationAction({
    scope: 'agency',
    scope_id: agencyId,
    provider,
  })
}
