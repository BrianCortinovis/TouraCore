// Livelli di ruolo della piattaforma (7 livelli da SPEC)
export type PlatformRole =
  | 'super_admin'
  | 'agency_owner'
  | 'agency_member'
  | 'owner'
  | 'manager'
  | 'staff'
  | 'portal_admin'

// Ruoli tenant (corrisponde all'enum tenant_role nel DB)
export type TenantRole = 'owner' | 'admin' | 'member'

// Ruoli staff (corrisponde all'enum staff_role nel DB)
export type StaffRole =
  | 'owner'
  | 'manager'
  | 'receptionist'
  | 'housekeeper'
  | 'restaurant_staff'
  | 'accountant'
  | 'maintenance'

// Ruoli agenzia (corrisponde all'enum agency_role nel DB)
export type AgencyRole = 'agency_owner' | 'agency_member'

// Gerarchia: livello numerico per confronto rapido (più basso = più potere)
const ROLE_HIERARCHY: Record<PlatformRole, number> = {
  super_admin: 0,
  agency_owner: 1,
  agency_member: 2,
  owner: 3,
  manager: 4,
  portal_admin: 4,
  staff: 5,
}

// Staff roles mappati ai livelli piattaforma
const STAFF_ROLE_TO_PLATFORM: Record<StaffRole, PlatformRole> = {
  owner: 'owner',
  manager: 'manager',
  receptionist: 'staff',
  housekeeper: 'staff',
  restaurant_staff: 'staff',
  accountant: 'staff',
  maintenance: 'staff',
}

export function staffRoleToPlatformRole(staffRole: StaffRole): PlatformRole {
  return STAFF_ROLE_TO_PLATFORM[staffRole]
}

export function hasMinimumRole(
  userRole: PlatformRole,
  requiredRole: PlatformRole
): boolean {
  return ROLE_HIERARCHY[userRole] <= ROLE_HIERARCHY[requiredRole]
}

export function isOneOfRoles(
  userRole: PlatformRole,
  allowedRoles: PlatformRole[]
): boolean {
  return allowedRoles.includes(userRole)
}

// Azioni CRUD + azioni speciali
export type Action = 'create' | 'read' | 'update' | 'delete' | 'manage'

// Risorse del sistema
export type Resource =
  | 'tenant'
  | 'property'
  | 'booking'
  | 'rate'
  | 'room'
  | 'guest'
  | 'invoice'
  | 'report'
  | 'settings'
  | 'staff'
  | 'agency'
  | 'portal'
  | 'billing'
  | 'integration'

// Permessi per ruolo: definisce cosa può fare ogni ruolo
const ROLE_PERMISSIONS: Record<PlatformRole, Set<string>> = {
  super_admin: new Set(['manage:*']),
  agency_owner: new Set([
    'manage:agency',
    'manage:tenant',
    'manage:property',
    'manage:staff',
    'read:report',
    'read:billing',
    'manage:portal',
    'manage:integration',
  ]),
  agency_member: new Set([
    'read:agency',
    'read:tenant',
    'read:property',
    'read:booking',
    'read:report',
  ]),
  owner: new Set([
    'manage:tenant',
    'manage:property',
    'manage:booking',
    'manage:rate',
    'manage:room',
    'manage:guest',
    'manage:invoice',
    'manage:report',
    'manage:settings',
    'manage:staff',
    'read:billing',
    'manage:integration',
  ]),
  manager: new Set([
    'read:tenant',
    'manage:property',
    'manage:booking',
    'manage:rate',
    'manage:room',
    'manage:guest',
    'manage:invoice',
    'manage:report',
    'manage:settings',
    'manage:staff',
  ]),
  portal_admin: new Set([
    'manage:portal',
    'read:tenant',
    'read:property',
    'read:booking',
    'read:report',
  ]),
  staff: new Set([
    'read:property',
    'read:booking',
    'create:booking',
    'update:booking',
    'read:room',
    'update:room',
    'read:guest',
    'create:guest',
    'update:guest',
    'read:rate',
  ]),
}

export function canPerform(
  role: PlatformRole,
  action: Action,
  resource: Resource
): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  if (!permissions) return false

  // super_admin: accesso totale
  if (permissions.has('manage:*')) return true

  // manage include tutte le azioni CRUD
  if (permissions.has(`manage:${resource}`)) return true

  return permissions.has(`${action}:${resource}`)
}

export function assertPermission(
  role: PlatformRole,
  action: Action,
  resource: Resource
): void {
  if (!canPerform(role, action, resource)) {
    throw new Error(
      `Permessi insufficienti: ${action} su ${resource} richiede un ruolo superiore`
    )
  }
}

// ============================================================================
// Module / vertical access control
// ============================================================================

export type ModuleCode =
  | 'hospitality'
  | 'restaurant'
  | 'wellness'
  | 'experiences'
  | 'bike_rental'
  | 'moto_rental'
  | 'ski_school'

interface TenantModulesShape {
  [code: string]: { active?: boolean; source?: string } | undefined
}

/**
 * Verifica se un tenant può accedere al modulo richiesto.
 * Controlla:
 * 1. tenant.modules[code].active === true
 * 2. super_admin → bypass sempre
 */
export function canAccessVertical(
  userRole: PlatformRole,
  tenantModules: TenantModulesShape | null | undefined,
  moduleCode: ModuleCode
): boolean {
  if (userRole === 'super_admin') return true
  if (!tenantModules) return false
  return tenantModules[moduleCode]?.active === true
}

/**
 * Verifica se l'utente può concedere free override su un tenant.
 * - super_admin: sempre
 * - agency_owner/agency_admin: solo se agency.can_grant_free è true e tenant è sotto agency
 * (check effettivo di agency_tenant_links va fatto lato query DB, qui solo role-check base)
 */
export function canGrantFreeOverride(
  userRole: PlatformRole,
  opts: { isAgencyOwner?: boolean; agencyCanGrantFree?: boolean } = {}
): boolean {
  if (userRole === 'super_admin') return true
  if (userRole === 'agency_owner' || userRole === 'agency_member') {
    return Boolean(opts.agencyCanGrantFree)
  }
  return false
}
