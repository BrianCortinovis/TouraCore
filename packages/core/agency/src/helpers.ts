// Helper per accesso e risoluzione contesto agenzia

import { createServerSupabaseClient } from '@touracore/db/server'
import type { AgencyContext, AgencyMembership, AgencyTenantLink, ManagementMode } from './types'

/**
 * Verifica se l'utente corrente può accedere a un'entity tramite agency link.
 * Ritorna true se esiste un agency_tenant_link attivo tra l'agenzia dell'utente
 * e il tenant dell'entity, E l'entity ha management_mode='agency_managed'.
 */
export async function canAccessEntityViaAgency(
  entityId: string,
  userId: string,
): Promise<{ allowed: boolean; agencyId: string | null; managementMode: ManagementMode | null }> {
  const supabase = await createServerSupabaseClient()

  // Recupera l'entity con il suo tenant
  const { data: entity } = await supabase
    .from('entities')
    .select('id, tenant_id, management_mode')
    .eq('id', entityId)
    .single()

  if (!entity) return { allowed: false, agencyId: null, managementMode: null }

  // Recupera le agency membership dell'utente
  const { data: memberships } = await supabase
    .from('agency_memberships')
    .select('agency_id')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!memberships?.length) {
    return { allowed: false, agencyId: null, managementMode: entity.management_mode as ManagementMode }
  }

  const agencyIds = memberships.map((m) => m.agency_id)

  // Verifica link attivo tra agenzia e tenant
  const { data: link } = await supabase
    .from('agency_tenant_links')
    .select('agency_id, status')
    .eq('tenant_id', entity.tenant_id)
    .in('agency_id', agencyIds)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!link) {
    return { allowed: false, agencyId: null, managementMode: entity.management_mode as ManagementMode }
  }

  return {
    allowed: true,
    agencyId: link.agency_id,
    managementMode: entity.management_mode as ManagementMode,
  }
}

/**
 * Risolve il contesto agenzia per l'utente corrente.
 * Ritorna null se l'utente non appartiene a nessuna agenzia.
 */
export async function resolveAgencyContext(userId: string): Promise<AgencyContext | null> {
  const supabase = await createServerSupabaseClient()

  // Recupera la prima membership agenzia attiva
  const { data: membership } = await supabase
    .from('agency_memberships')
    .select('*, agency:agencies(*)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!membership) return null

  const agency = (membership as AgencyMembership & { agency: Record<string, unknown> }).agency
  if (!agency) return null

  // Recupera i link tenant attivi
  const { data: links } = await supabase
    .from('agency_tenant_links')
    .select('*')
    .eq('agency_id', membership.agency_id)
    .eq('status', 'active')

  return {
    agencyId: membership.agency_id,
    agencySlug: agency.slug as string,
    agencyName: agency.name as string,
    role: membership.role,
    tenantLinks: (links ?? []) as AgencyTenantLink[],
  }
}

/**
 * Recupera tutte le agenzie a cui l'utente appartiene.
 */
export async function getUserAgencies(
  userId: string,
): Promise<Array<{ agencyId: string; agencyName: string; agencySlug: string; role: string }>> {
  const supabase = await createServerSupabaseClient()

  const { data: memberships } = await supabase
    .from('agency_memberships')
    .select('agency_id, role, agency:agencies(name, slug)')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!memberships?.length) return []

  return memberships.map((m) => {
    const agency = (m as unknown as { agency: { name: string; slug: string } }).agency
    return {
      agencyId: m.agency_id,
      agencyName: agency?.name ?? '',
      agencySlug: agency?.slug ?? '',
      role: m.role,
    }
  })
}
