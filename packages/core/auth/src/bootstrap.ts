import { cache } from 'react'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@touracore/db/server'
import type {
  AuthUser,
  AuthBootstrapData,
  Profile,
  Entity,
  StaffMember,
  TenantAccount,
  TenantMembership,
} from './types'

type StaffMemberWithEntity = StaffMember & {
  entity: (Entity & { tenant: TenantAccount | null }) | null
}

type MembershipWithTenant = TenantMembership & {
  tenant: TenantAccount | null
}

const EMPTY_BOOTSTRAP: AuthBootstrapData = {
  user: null,
  profile: null,
  tenant: null,
  tenants: [],
  tenantMemberships: [],
  property: null,
  staff: null,
  staffMemberships: [],
  properties: [],
}

// Cached per request — evita round-trip ripetuti a Supabase Auth (ogni getUser ~250ms da IT)
export const getCurrentAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return { id: user.id, email: user.email ?? '' }
})

// Alias semantico per uso nelle server actions
export const getCurrentUser = getCurrentAuthUser

const getSelectedEntityId = cache(async () => {
  const cookieStore = await cookies()
  return cookieStore.get('touracore_selected_entity')?.value ?? null
})

export const getAuthBootstrapData = cache(async (): Promise<AuthBootstrapData> => {
  try {
    const user = await getCurrentAuthUser()
    if (!user) return EMPTY_BOOTSTRAP

    const selectedEntityId = await getSelectedEntityId()
    const supabase = await createServerSupabaseClient()

    const [{ data: profileRow }, { data: staffRows }, { data: membershipRows }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('staff_members')
          .select('*, entity:entities(*, tenant:tenants(*))')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('memberships')
          .select('*, tenant:tenants(*)')
          .eq('user_id', user.id)
          .eq('is_active', true),
      ])

    const profile = (profileRow as Profile) ?? null
    const typedStaff = (staffRows ?? []) as StaffMemberWithEntity[]
    const typedMemberships = (membershipRows ?? []) as MembershipWithTenant[]

    if (typedStaff.length === 0) {
      return {
        user,
        profile,
        tenant: typedMemberships[0]?.tenant ?? null,
        tenants: typedMemberships
          .map((m) => m.tenant)
          .filter((t): t is TenantAccount => Boolean(t))
          .filter((t, i, list) => list.findIndex((c) => c.id === t.id) === i),
        tenantMemberships: typedMemberships.map(({ tenant: _t, ...rest }) => rest),
        property: null,
        staff: null,
        staffMemberships: [],
        properties: [],
      }
    }

    const selectedStaff = typedStaff.find((s) => s.entity_id === selectedEntityId)
    // typedStaff.length > 0 verificato sopra
    const activeStaff = selectedStaff ?? typedStaff[0]!

    const entities = typedStaff
      .map((s) => s.entity)
      .filter((e): e is Entity & { tenant: TenantAccount | null } => Boolean(e))
      .filter((e, i, list) => list.findIndex((c) => c.id === e.id) === i)

    const tenants = [
      ...entities
        .map((e) => e.tenant)
        .filter((t): t is TenantAccount => Boolean(t)),
      ...typedMemberships
        .map((m) => m.tenant)
        .filter((t): t is TenantAccount => Boolean(t)),
    ].filter((t, i, list) => list.findIndex((c) => c.id === t.id) === i)

    const tenant =
      activeStaff.entity?.tenant ??
      typedMemberships[0]?.tenant ??
      tenants[0] ??
      null

    const { entity: _ent, ...staff } = activeStaff
    const activeEntity = activeStaff.entity
      ? { ...activeStaff.entity, tenant: undefined }
      : null

    return {
      user,
      profile,
      tenant,
      tenants,
      tenantMemberships: typedMemberships.map(({ tenant: _t, ...rest }) => rest),
      property: activeEntity as Entity | null,
      staff,
      staffMemberships: typedStaff.map(({ entity: _e, ...rest }) => rest),
      properties: entities.map(({ tenant: _t, ...rest }) => rest) as Entity[],
    }
  } catch {
    return EMPTY_BOOTSTRAP
  }
})

export const getCurrentOrg = cache(async (): Promise<{
  tenant: TenantAccount | null
  property: Entity | null
  staff: StaffMember | null
}> => {
  const { tenant, property, staff } = await getAuthBootstrapData()
  return { tenant, property, staff }
})
