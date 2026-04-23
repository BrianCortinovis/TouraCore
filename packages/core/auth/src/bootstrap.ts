import { cache } from 'react'
import { cookies, headers } from 'next/headers'
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

// Legge gli slug scritti dal middleware per route /[tenantSlug]/{vertical}/[entitySlug]/...
// Permette a bootstrap di preferire l'entity dell'URL rispetto al cookie
// (fix scope: layout RSC non può mutare cookie in Next 15).
const getUrlEntityHint = cache(async (): Promise<{ tenantSlug: string; entitySlug: string } | null> => {
  try {
    const h = await headers()
    const tenantSlug = h.get('x-touracore-tenant-slug')
    const entitySlug = h.get('x-touracore-entity-slug')
    if (!tenantSlug || !entitySlug) return null
    return { tenantSlug, entitySlug }
  } catch {
    return null
  }
})

export const getAuthBootstrapData = cache(async (): Promise<AuthBootstrapData> => {
  try {
    const user = await getCurrentAuthUser()
    if (!user) return EMPTY_BOOTSTRAP

    const urlHint = await getUrlEntityHint()
    // Cache key include URL scope: navigare tra entity diverse dello stesso user
    // deve ricaricare per avere la property corretta.
    const scopeKey = urlHint ? `${urlHint.tenantSlug}/${urlHint.entitySlug}` : '__cookie__'
    const cacheKey = `${user.id}::${scopeKey}`
    const cached = getCachedBootstrap(cacheKey)
    if (cached) return cached

    const selectedEntityId = await getSelectedEntityId()
    const supabase = await createServerSupabaseClient()

    const [{ data: profileRow }, { data: staffRows }, { data: membershipRows }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('staff_members')
          .select('*, entity:entities(*, tenant:tenants(*), accommodation:accommodations(property_type, city, province, country))')
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
      const tenantIds = typedMemberships.map((m) => m.tenant_id).filter(Boolean)
      let fallbackEntities: Array<Entity & { accommodation?: { property_type?: string | null } | Array<{ property_type?: string | null }> | null }> = []
      if (tenantIds.length > 0) {
        const { data: entityRows } = await supabase
          .from('entities')
          .select('*, accommodation:accommodations(property_type, city, province, country)')
          .in('tenant_id', tenantIds)
          .eq('is_active', true)
        fallbackEntities = (entityRows ?? []) as typeof fallbackEntities
      }
      const selectedFallback =
        (urlHint ? fallbackEntities.find((e) => e.slug === urlHint.entitySlug) : null) ??
        fallbackEntities.find((e) => e.id === selectedEntityId) ??
        fallbackEntities[0] ??
        null
      const activeFallback = selectedFallback
        ? (() => {
            const acc = Array.isArray(selectedFallback.accommodation)
              ? selectedFallback.accommodation[0]
              : selectedFallback.accommodation
            return {
              ...selectedFallback,
              accommodation: undefined,
              property_type: acc?.property_type ?? selectedFallback.property_type ?? null,
            }
          })()
        : null
      const result: AuthBootstrapData = {
        user,
        profile,
        tenant: typedMemberships[0]?.tenant ?? null,
        tenants: typedMemberships
          .map((m) => m.tenant)
          .filter((t): t is TenantAccount => Boolean(t))
          .filter((t, i, list) => list.findIndex((c) => c.id === t.id) === i),
        tenantMemberships: typedMemberships.map(({ tenant: _t, ...rest }) => rest),
        property: activeFallback as Entity | null,
        staff: null,
        staffMemberships: [],
        properties: fallbackEntities.map((e) => {
          const acc = Array.isArray(e.accommodation) ? e.accommodation[0] : e.accommodation
          const { accommodation: _a, ...rest } = e
          return { ...rest, property_type: acc?.property_type ?? e.property_type ?? null } as Entity
        }),
      }
      setCachedBootstrap(cacheKey, result)
      return result
    }

    // Priorità URL hint (da middleware) > cookie > prima staff entry.
    // Matcha sia su entity.slug sia, quando disponibile, sul tenant.slug per evitare
    // di selezionare entity omonime di tenant diversi.
    const urlMatchStaff = urlHint
      ? typedStaff.find(
          (s) =>
            s.entity?.slug === urlHint.entitySlug &&
            (s.entity?.tenant?.slug ?? null) === urlHint.tenantSlug
        ) ?? typedStaff.find((s) => s.entity?.slug === urlHint.entitySlug)
      : null
    const selectedStaff = typedStaff.find((s) => s.entity_id === selectedEntityId)
    // typedStaff.length > 0 verificato sopra
    const activeStaff = urlMatchStaff ?? selectedStaff ?? typedStaff[0]!

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
      ? (() => {
          const e = activeStaff.entity as Entity & {
            tenant?: TenantAccount | null
            accommodation?: { property_type?: string | null; city?: string | null; province?: string | null; country?: string | null } | Array<{ property_type?: string | null }> | null
          }
          const acc = Array.isArray(e.accommodation) ? e.accommodation[0] : e.accommodation
          return {
            ...e,
            tenant: undefined,
            accommodation: undefined,
            property_type: acc?.property_type ?? e.property_type ?? null,
          }
        })()
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
    setCachedBootstrap(cacheKey, result)
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
