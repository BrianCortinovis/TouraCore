import { cache } from 'react'
import { createServiceRoleClient } from '@touracore/db/server'
import { getCurrentAuthUser } from './bootstrap'
import type { AuthUser } from './types'

export type VisibilityMode = 'platform' | 'agency' | 'tenant' | 'guest'

export interface VisibilityContext {
  mode: VisibilityMode
  user: AuthUser | null
  agencyId: string | null
  agencySlug: string | null
  agencyRole: 'agency_owner' | 'agency_admin' | 'agency_member' | null
  tenantIds: string[]
  canSeeAllAgencies: boolean
  isPlatformAdmin: boolean
  platformRole: 'admin' | 'super_admin' | null
  permissions: Record<string, boolean>
}

const GUEST: VisibilityContext = {
  mode: 'guest',
  user: null,
  agencyId: null,
  agencySlug: null,
  agencyRole: null,
  tenantIds: [],
  canSeeAllAgencies: false,
  isPlatformAdmin: false,
  platformRole: null,
  permissions: {},
}

const PLATFORM_PERMISSIONS: Record<string, boolean> = {
  'platform.read': true,
  'platform.write': true,
  'agency.read': true,
  'agency.write': true,
  'tenant.read': true,
  'tenant.write': true,
  'billing.read': true,
  'billing.write': true,
  'audit.read': true,
}

const AGENCY_OWNER_PERMISSIONS: Record<string, boolean> = {
  'agency.read': true,
  'agency.write': true,
  'tenant.read': true,
  'tenant.write': true,
  'billing.read': true,
  'billing.write': true,
  'team.admin': true,
  'audit.read': true,
}

const AGENCY_MEMBER_PERMISSIONS: Record<string, boolean> = {
  'agency.read': true,
  'tenant.read': true,
  'billing.read': true,
  'audit.read': true,
}

const TENANT_PERMISSIONS: Record<string, boolean> = {
  'tenant.read': true,
  'tenant.write': true,
  'billing.read': true,
}

export const getVisibilityContext = cache(
  async (): Promise<VisibilityContext> => {
    const user = await getCurrentAuthUser()
    if (!user) return GUEST

    const supabase = await createServiceRoleClient()

    const [{ data: admin }, { data: membership }, { data: tenantMemberships }] =
      await Promise.all([
        supabase
          .from('platform_admins')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('agency_memberships')
          .select('agency_id, role, agencies!inner(id, slug, is_active)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('memberships')
          .select('tenant_id')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])

    if (admin) {
      const platformRole = admin.role as 'admin' | 'super_admin'
      return {
        mode: 'platform',
        user,
        agencyId: null,
        agencySlug: null,
        agencyRole: null,
        tenantIds: [],
        canSeeAllAgencies: true,
        isPlatformAdmin: true,
        platformRole,
        permissions: PLATFORM_PERMISSIONS,
      }
    }

    if (membership) {
      const agencyRow = (Array.isArray(membership.agencies)
        ? membership.agencies[0]
        : membership.agencies) as { id: string; slug: string; is_active: boolean } | null

      if (agencyRow?.is_active) {
        const { data: links } = await supabase
          .from('agency_tenant_links')
          .select('tenant_id')
          .eq('agency_id', membership.agency_id)
          .eq('status', 'active')

        const tenantIds = (links ?? []).map((l) => l.tenant_id as string)
        const role = membership.role as VisibilityContext['agencyRole']
        const isOwner = role === 'agency_owner' || role === 'agency_admin'
        return {
          mode: 'agency',
          user,
          agencyId: membership.agency_id as string,
          agencySlug: agencyRow.slug,
          agencyRole: role,
          tenantIds,
          canSeeAllAgencies: false,
          isPlatformAdmin: false,
          platformRole: null,
          permissions: isOwner ? AGENCY_OWNER_PERMISSIONS : AGENCY_MEMBER_PERMISSIONS,
        }
      }
    }

    const tenantIds = (tenantMemberships ?? []).map((m) => m.tenant_id as string)
    return {
      mode: tenantIds.length > 0 ? 'tenant' : 'guest',
      user,
      agencyId: null,
      agencySlug: null,
      agencyRole: null,
      tenantIds,
      canSeeAllAgencies: false,
      isPlatformAdmin: false,
      platformRole: null,
      permissions: tenantIds.length > 0 ? TENANT_PERMISSIONS : {},
    }
  },
)

export function hasPermission(ctx: VisibilityContext, perm: string): boolean {
  return ctx.permissions[perm] === true
}

export function canAccessTenant(ctx: VisibilityContext, tenantId: string): boolean {
  if (ctx.isPlatformAdmin) return true
  return ctx.tenantIds.includes(tenantId)
}

export function canAccessAgency(ctx: VisibilityContext, agencyId: string): boolean {
  if (ctx.isPlatformAdmin) return true
  return ctx.agencyId === agencyId
}
