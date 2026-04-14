// Tipi core per l'auth bootstrap — indipendenti dal verticale

export interface AuthUser {
  id: string
  email: string
}

export interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  locale: string | null
  timezone: string | null
  created_at: string
  updated_at: string
}

export interface TenantAccount {
  id: string
  name: string
  slug: string
  legal_name: string | null
  billing_email: string | null
  settings: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantMembership {
  id: string
  tenant_id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  permissions: Record<string, unknown> | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Entity {
  id: string
  tenant_id: string
  kind: 'accommodation' | 'activity'
  slug: string
  name: string
  description: string | null
  short_description: string | null
  country_override: string | null
  management_mode: 'agency_managed' | 'self_service'
  is_active: boolean
  created_at: string
  updated_at: string
}

/** @deprecated Usa Entity — mantenuto per compatibilità temporanea */
export type Property = Entity

export interface StaffMember {
  id: string
  entity_id: string
  user_id: string
  role: 'owner' | 'manager' | 'receptionist' | 'housekeeper' | 'restaurant_staff' | 'accountant' | 'maintenance'
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AuthBootstrapData {
  user: AuthUser | null
  profile: Profile | null
  tenant: TenantAccount | null
  tenants: TenantAccount[]
  tenantMemberships: TenantMembership[]
  property: Property | null
  staff: StaffMember | null
  staffMemberships: StaffMember[]
  properties: Property[]
}
