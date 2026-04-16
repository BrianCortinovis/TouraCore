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

// Cache cross-request in-memory: evita di rifare le 3 query staff/membership/profile
// ad ogni server action quando lo stesso utente naviga rapidamente.
// TTL breve (15s) per limitare staleness su cambi di permessi/tenant.
// Chiave = userId, isolata per processo Node (in serverless ogni lambda ha la sua cache).
interface CachedBootstrap {
  data: AuthBootstrapData
  expiresAt: number
}

const BOOTSTRAP_CACHE_TTL_MS = 5_000
const BOOTSTRAP_CACHE_MAX = 500
const bootstrapCache = new Map<string, CachedBootstrap>()

function getCachedBootstrap(userId: string): AuthBootstrapData | null {
  const entry = bootstrapCache.get(userId)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    bootstrapCache.delete(userId)
    return null
  }
  return entry.data
}

function setCachedBootstrap(userId: string, data: AuthBootstrapData): void {
  if (bootstrapCache.size >= BOOTSTRAP_CACHE_MAX) {
    // LRU semplice: rimuovi la più vecchia
    const firstKey = bootstrapCache.keys().next().value
    if (firstKey) bootstrapCache.delete(firstKey)
  }
  bootstrapCache.set(userId, {
    data,
    expiresAt: Date.now() + BOOTSTRAP_CACHE_TTL_MS,
  })
}

export function invalidateBootstrapCache(userId?: string): void {
  if (userId) bootstrapCache.delete(userId)
  else bootstrapCache.clear()
}

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
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    return { id: user.id, email: user.email ?? '' }
  } catch {
    return null
  }
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

    // Cache cross-request: se questo user ha bootstrappato negli ultimi 15s,
    // ritorna i dati senza colpire il DB (3 query risparmiate)
    const cached = getCachedBootstrap(user.id)
    if (cached) return cached

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
      const result: AuthBootstrapData = {
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
      setCachedBootstrap(user.id, result)
      return result
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

    const result: AuthBootstrapData = {
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
    setCachedBootstrap(user.id, result)
    return result
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
