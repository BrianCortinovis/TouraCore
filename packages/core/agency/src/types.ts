// Tipi per il layer agenzia — gestione clienti per conto terzi

export type AgencyRole = 'agency_owner' | 'agency_admin' | 'agency_member'

export type ManagementMode = 'agency_managed' | 'self_service'

export type BillingMode = 'client_direct' | 'agency_covered'

export type LinkStatus = 'pending' | 'active' | 'revoked'

export interface Agency {
  id: string
  slug: string
  name: string
  legal_name: string | null
  billing_email: string | null
  billing_phone: string | null
  vat_number: string | null
  fiscal_code: string | null
  address: string | null
  city: string | null
  province: string | null
  zip: string | null
  country: string | null
  website: string | null
  logo_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AgencyMembership {
  id: string
  agency_id: string
  user_id: string
  role: AgencyRole
  is_active: boolean
  permissions: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AgencyTenantLink {
  id: string
  agency_id: string
  tenant_id: string
  role: string
  default_management_mode: ManagementMode
  billing_mode: BillingMode
  status: LinkStatus
  invited_at: string
  accepted_at: string | null
  revoked_at: string | null
}

/** Contesto agenzia corrente — presente quando un utente opera per conto di un'agenzia */
export interface AgencyContext {
  agencyId: string
  agencySlug: string
  agencyName: string
  role: AgencyRole
  tenantLinks: AgencyTenantLink[]
}
